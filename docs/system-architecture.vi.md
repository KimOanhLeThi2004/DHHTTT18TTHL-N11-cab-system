# Taxi Booking Microservices - Tài liệu kiến trúc chi tiết

Tài liệu này mô tả hệ thống theo trạng thái code hiện tại: các service, cách service giao tiếp, dữ liệu trao đổi, cơ chế rate limit, security, và cách AI matching hoạt động.

## 1) Tổng quan kiến trúc

Hệ thống theo mô hình microservices, entrypoint cho client là `api-gateway` (port `3000`).

- Giao tiếp đồng bộ: HTTP/REST (JSON)
- Giao tiếp bất đồng bộ: Kafka events (JSON)
- Giao tiếp realtime: WebSocket (driver + notification)
- Shared state ngắn hạn: Redis (vị trí driver, lock, assignment)
- Storage chính:
  - PostgreSQL: `auth`, `user`, `driver`, `payment`, `review`
  - MongoDB: `booking`, `ride`, `notification`

## 2) Danh sách services và trách nhiệm

| Service | Port | Vai trò chính | DB/State |
|---|---:|---|---|
| `api-gateway` | 3000 | Entry point, proxy route, auth introspection, service token forwarding, rate limit health | Không DB |
| `auth-service` | 3001 | Register/login/logout, issue JWT + refresh token | PostgreSQL |
| `user-service` | 3002 | Hồ sơ customer (`/users/me`, internal `/users/:id`) | PostgreSQL |
| `pricing-service` | 3003 | Tính giá và ETA | Không DB |
| `booking-service` | 3004 | Tạo/hủy booking, phát sự kiện booking | MongoDB + Kafka |
| `driver-service` | 3005 | Trạng thái driver, accept/reject, WS driver | PostgreSQL + Redis + Kafka |
| `payment-service` | 3006 | Thanh toán và doanh thu driver | PostgreSQL + Kafka |
| `ride-service` | 3007 | Quản lý ride aggregate, status ride | MongoDB + Redis + Kafka |
| `notification-service` | 3008 | Lưu notification + push realtime | MongoDB + Kafka + WS |
| `review-service` | 3009 | Review và rating driver | PostgreSQL |
| `ai-matching-service` | 3010 | Matching driver + AI endpoints (`eta`, `fraud`, `forecast`, ...) | Redis + Kafka |

## 3) Cơ chế services gọi nhau

## 3.1 HTTP synchronous (qua gateway và internal)

Client gọi vào `api-gateway`, sau đó gateway:

- Proxy trực tiếp đến service đích (ví dụ `/auth`, `/users`, `/drivers`, `/ai`)
- Hoặc chạy custom orchestration (`/booking`) để gọi nhiều service:
  - gọi pricing
  - gọi booking-service
  - trả response tổng hợp cho client

Các call internal quan trọng:

- `api-gateway` -> `auth-service` (`/auth/isLogin`) để introspect token user
- `api-gateway` -> `pricing-service` (`/pricing/calculate`) với service JWT
- `api-gateway` -> `booking-service` (`/bookings*`) với user JWT
- `auth-service` -> `user-service` (`POST /users`) khi register customer
- `auth-service` -> `driver-service` (`POST /drivers`) khi register driver
- `ride-service` -> `user-service` (`GET /users/:id`) + `driver-service` (`GET /drivers/:id`) khi consume `booking.confirmed`
- `payment-service` -> `ride-service` (`GET /rides/booking/:bookingId`) để lấy giá ride trước khi pay

## 3.2 Kafka asynchronous (event-driven)

Luồng event chính:

1. `booking-service` phát:
   - topic `ride_events` (`event_type=ride_requested`)
   - topic `BOOKING_CREATED`
2. `ai-matching-service` consume 2 topic trên, chọn driver, phát:
   - topic `driver.assigned.requested`
3. `driver-service` consume `driver.assigned.requested`, đẩy assignment cho driver qua WS, lưu Redis assignment.
4. Driver accept -> `driver-service` phát:
   - topic `driver.accepted`
5. `booking-service` consume `driver.accepted`, update booking status, phát:
   - topic `booking.confirmed`
   - topic `ride_events` (`event_type=ride_accepted`)
6. `ride-service` consume `booking.confirmed`, tạo ride, phát:
   - topic `ride.status.changed`
7. `payment-service` pay thành công, phát:
   - topic `payment.success`
8. `notification-service` consume:
   - `ride.status.changed`
   - `payment.success`
   - `driver.location.updated`

## 3.3 Redis + WebSocket

- `driver-service`:
  - Redis GEO để tìm driver gần (`drivers:geo:<vehicleType>`)
  - Redis hash `driver:<driverId>` để lưu online/location
  - Redis key `assignment:<bookingId>` (TTL 30s) cho pending assignment
  - Redis key `active_assignment:<driverId>` (TTL 3600s) khi driver đã accept
  - WS push assignment trực tiếp đến driver online

- `notification-service`:
  - giữ map `userId -> websocket connection`
  - push realtime cho user khi nhận event từ Kafka

## 4) Dữ liệu giao tiếp giữa services

Mọi kênh đều dùng JSON (HTTP body hoặc Kafka message value).

## 4.1 Payload HTTP điển hình

`POST /booking` (gateway):

```json
{
  "pickup": { "lat": 10.76, "lng": 106.66 },
  "dropoff": { "lat": 10.77, "lng": 106.70 },
  "distanceKm": 5,
  "durationMin": 10,
  "vehicleType": "CAR"
}
```

Response (gateway tổng hợp):

```json
{
  "booking_id": "....",
  "status": "REQUESTED",
  "eta_min": 12,
  "price": 125000,
  "surge_multiplier": 1.2
}
```

`POST /payments/pay`:

```json
{
  "bookingId": "BK123",
  "method": "CASH",
  "amount": 120000
}
```

## 4.2 Payload Kafka điển hình

`ride_events` khi tạo booking:

```json
{
  "event_type": "ride_requested",
  "booking_id": "BK123",
  "user_id": "USR1",
  "pickup": { "lat": 10.76, "lng": 106.66 },
  "dropoff": { "lat": 10.77, "lng": 106.70 },
  "vehicle_type": "CAR",
  "estimated_price": 120000,
  "timestamp": "..."
}
```

`driver.assigned.requested`:

```json
{
  "bookingId": "BK123",
  "userId": "USR1",
  "driverId": "DRV1",
  "pickup": { "lat": 10.76, "lng": 106.66 },
  "dropoff": { "lat": 10.77, "lng": 106.70 },
  "price": 120000
}
```

`payment.success`:

```json
{
  "paymentId": "PMT1",
  "bookingId": "BK123",
  "userId": "USR1",
  "amount": 120000,
  "status": "SUCCESS"
}
```

`driver.location.updated`:

```json
{
  "bookingId": "BK123",
  "userId": "USR1",
  "driverId": "DRV1",
  "lat": 10.76,
  "lng": 106.66,
  "heading": 120,
  "speedKph": 35,
  "timestamp": "..."
}
```

## 5) Cơ chế rate limit hiện tại

Rate limit nằm ở `api-gateway`:

- Cấu hình:
  - `RATE_LIMIT_WINDOW_MS` (mặc định `1000`)
  - `RATE_LIMIT_MAX` (mặc định `100`)
- Logic hiện tại chỉ áp dụng cho path `/health` (không áp cho toàn bộ API business).
- Khi vượt ngưỡng theo IP trong window:
  - trả `429 Too many requests`
  - reset bucket để health check có thể phục hồi nhanh.

Lưu ý: nếu test rate limit bằng endpoint khác `/health` thì sẽ không trigger logic này.

## 6) Security model

## 6.1 User JWT

- `auth-service` tạo access token khi login, chứa:
  - `sub/userId`, `role`, `jti`
- Verify token:
  - `auth-service` middleware `isLogin` (phục vụ introspection)
  - `booking`, `payment`, `driver` (user endpoint), `user`, `notification WS`
- Nhiều service verify với fallback secret list:
  - `JWT_SECRET`, `JWT_SECRETKEY`, `ACCESS_JWT_SECRET`

## 6.2 Refresh token + logout

- Refresh token lưu DB (`RefreshToken` table).
- Logout:
  - revoke refresh token (DB)
  - revoke access token (in-memory map tại `auth-service`)
- Hệ quả:
  - access token revocation không share giữa instances và mất khi restart process.

## 6.3 Service-to-service JWT

- Gateway ký internal JWT bằng `INTERNAL_JWT_SECRET`/`SERVICE_JWT_SECRET` (`expiresIn: 5m`).
- Các service verify token internal bằng middleware riêng (`verifyServiceToken` / `verifyServiceJwt`).
- Một số service có allow-list `decoded.service`, ví dụ:
  - `pricing-service`: cho `api-gateway`, `booking-service`
  - `ride-service`: cho `api-gateway`, `payment-service`

## 6.4 mTLS cho nội bộ

Khi `MTLS_ENABLED=true`:

- Internal URL `http://...` được nâng lên `https://...`
- Axios client attach cert/key/ca qua `httpsAgent`
- Server nội bộ dùng `https.createServer(...)`
- Có thể yêu cầu mutual auth client cert (`MTLS_REQUIRE_CLIENT_CERT=true`)

Cert mặc định mount từ `/etc/mtls` (compose map `./security/certs:/etc/mtls:ro`).

## 6.5 Hardening khác

- CORS allow-list từ `CORS_ORIGIN`
- Payload limit đa số service: `1mb` (`413 Payload Too Large`)
- Gateway gắn `x-request-id` cho tracing
- Gateway áp auth middleware cho các route business chính:
  - `/booking`, `/payments`, `/reviews`, `/notifications`
  - Một số route vẫn public theo thiết kế hiện tại như `/auth`, `/ai`, `/drivers/online`, `/drivers/nearby`
- Auth errors chuẩn:
  - missing token -> `401`
  - invalid/tampered -> `401`
  - expired -> `401`

## 7) Cách AI matching hoạt động

## 7.1 Có dùng AI agent/LLM không?

Hiện tại **không có LLM agent runtime**. Endpoint tên `/ai/agent/select-driver` là thuật toán rule-based/scoring tự viết.

## 7.2 AI endpoints (HTTP) đang dùng heuristic

- `POST /ai/eta`:
  - công thức tốc độ giả lập theo traffic
  - `eta = round((distance/speed)*60)`, speed bị chặn min 10 km/h
- `POST /ai/fraud`:
  - score cộng dồn theo rule:
    - thiếu device fingerprint, thiếu location, amount lớn
  - `flagged` khi vượt `FRAUD_THRESHOLD`
- `POST /ai/recommendations`:
  - sort theo `rating` giảm dần, lấy top 3
- `POST /ai/forecast`:
  - chuẩn hóa `demand_index`, trả `model_version`
- `POST /ai/agent/select-driver`:
  - filter bỏ driver `OFFLINE`
  - strategy:
    - `nearest`: khoảng cách nhỏ nhất
    - `rating`: rating cao nhất
    - `balanced`: maximize `rating*1.5 - eta*0.8 - price*0.2`

## 7.3 Matching theo event Kafka (core dispatch)

Khi nhận booking event:

1. Query driver gần nhất từ Redis (`GEORADIUS`)
2. Tính score từng driver (file `scoring.js`):

```text
score = -0.6*distanceKm + 2.0*acceptRate + 1.5*rating - 0.3*eta
```

3. Sort giảm dần theo score
4. Lock driver bằng Redis `SET NX EX` (`driver:<id>:lock`, TTL 30s)
5. Driver nào lock thành công sẽ được assign trước, publish `driver.assigned.requested`.

=> Đây là kiến trúc “AI-like heuristic + optimization”, chưa phải học máy online hay agent reasoning.

## 8) Độ tin cậy và cơ chế chống lỗi

- Booking flow ở gateway có:
  - Retry gọi pricing (`withRetry`, mặc định 2 lần)
  - Circuit breaker đơn giản (mở khi pricing lỗi liên tiếp)
  - Fallback pricing cục bộ khi circuit mở
- Idempotency:
  - gateway cache theo `userId + Idempotency-Key`
  - booking-service cũng check `idempotencyKey` để tránh tạo trùng
- Lock/consistency:
  - lock driver ở AI matching và ride-service
  - assignment TTL để tránh pending vô hạn

## 9) Observability

- Mỗi service có:
  - `/health` trả `status: ok`
  - `/metrics` text format với counters cơ bản
- Stack quan sát:
  - Prometheus (`observability/prometheus.yml`)
  - Alert rules (`observability/alert-rules.yml`)
  - Grafana + Jaeger (`docker-compose.observability.yml`)

## 10) Lưu ý triển khai thực tế

- Rate limit hiện chỉ chặn `/health`; nếu cần bảo vệ API business cần mở rộng middleware.
- Token revocation in-memory ở auth-service chưa phù hợp multi-instance/HA.
- Một số middleware service token check theo cấu hình secret fallback; cần đồng bộ secret giữa services.
- AI matching hiện heuristic; nếu cần tối ưu SLA và fairness nên bổ sung feature store + model training + offline evaluation.

## 11) Update 2026-04-15

Luu y: phan AI matching trong tai lieu nay co mot so noi dung cu.

Trang thai moi:

- `ai-matching-service` da tich hop Ollama (`qwen2.5:3b`) cho driver selection.
- Neu Ollama loi/timeout/output khong hop le, service fallback ve rules/scoring.
- Frontend da chuyen sang cookie-based session (`HttpOnly`) thay vi luu JWT trong localStorage.

Tai lieu cap nhat chi tiet xem tai:

- `docs/ai-matching-security.vi.md`
