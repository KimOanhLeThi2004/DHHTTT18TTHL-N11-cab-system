# Huong Dan Test Tay Bang Postman Den Level 11

Tai lieu nay tap trung vao:
- Cac test case co request HTTP co the thao tac tay tren Postman.
- Cac test case he thong/ha tang (Swarm, Kafka, deployment, observability) va cach chung minh.
- Case gia lap `1000 req/s /booking` dung script Python.

Base URL mac dinh:
- `http://192.168.57.101:3000`

## 1) Chuan bi chung

1. Tao Postman Environment:
- `baseUrl = http://192.168.57.101:3000`
- `customerEmail`
- `customerPassword = 123456`
- `customerToken`
- `refreshToken`
- `bookingId`

2. Tao user + login:
- `POST {{baseUrl}}/auth/register`
- `POST {{baseUrl}}/auth/login`
- Luu `access_token` vao `customerToken`, `refresh_token` vao `refreshToken`.

3. Header auth cho request can token:
- `Authorization: Bearer {{customerToken}}`

4. Quy uoc bang:
- `Implemented`: test duoc bang Postman.
- `System`: can Docker Swarm/log/Kafka/metrics.
- `Blocked by design`: can fault-injection hoac quyen ha tang.

## 2) Danh sach testcase co request (Postman)

Bang duoi map testcase -> endpoint that -> thao tac tay.

| TC | Endpoint/Method | Body mau | Ky vong |
|---|---|---|---|
| 001 | `POST /auth/register` | `{"email":"...","password":"123456","name":"Test","role":"CUSTOMER"}` | `201`, co `user_id` |
| 002 | `POST /auth/login` | `{"email":"...","password":"123456","role":"CUSTOMER"}` | `200`, co JWT (`exp`,`sub`) |
| 003 | `POST /booking` | pickup/dropoff/distanceKm/vehicleType | `200/201`, co `booking_id` |
| 004 | `GET /booking` | none | `200`, list booking |
| 005 | `POST /drivers/online` | `{"driverId":"DRV001","lat":10.76,"lng":106.66,"vehicleType":"CAR"}` | `200`, `ONLINE` |
| 006 | `POST /booking` | nhu TC003 | status ban dau `REQUESTED/CONFIRMED` |
| 007 | `POST /ai/eta` | `{"distance_km":5,"traffic_level":0.5}` | `200`, `eta>0` |
| 008 | `POST /pricing/calculate` | `{"distance_km":5,"demand_index":1,"supply_index":1,"vehicleType":"CAR"}` | `200`, `price>0`, `surge>=1` |
| 009 | `POST /notifications` | `{"userId":"...","message":"Your ride is confirmed"}` | `200` |
| 010 | `POST /auth/logout` -> `GET /booking` | logout voi refresh token | token cu bi reject `401` |
| 011 | `POST /booking` | thieu pickup | `400` |
| 012 | `POST /booking` | `pickup.lat="abc"` | `422` |
| 013 | `POST /booking` hoac `POST /ai/agent/select-driver` | no online driver | booking `FAILED/PENDING` hoac fallback no_driver |
| 014 | `POST /payments/pay` | `payment_method=invalid_card` | `400` |
| 015 | `POST /ai/eta` | `{"distance_km":0}` | `eta>=0`, khong crash |
| 016 | `POST /pricing/calculate` | demand=0 | `surge>=1`, `price>0` |
| 017 | `POST /ai/fraud` | thieu field | `400` |
| 018 | `GET /booking` hoac `POST /booking` voi expired JWT | token het han | `401`, message expired |
| 019 | `POST /booking` x2 cung `Idempotency-Key` | body giong nhau | request 2 tra ket qua cu, khong duplicate |
| 020 | `POST /booking` | JSON > 1MB | `413` |
| 021 | `POST /booking` | valid body | co `eta_min` |
| 022 | `POST /booking` | valid body | co `price`, `surge` hop le |
| 023 | `GET /drivers/nearby` + `POST /ai/agent/select-driver` | strategy nearest | chon driver online hop le |
| 024 | `POST /booking` -> `POST /payments/pay` -> `POST /notifications` | full flow | end-to-end success |
| 026 | `GET /notifications/{userId}` | none | co message sau flow |
| 029 | `GET /booking` qua gateway | none | route dung service |
| 031 | `POST /booking` | valid body | tao booking thanh cong |
| 033 | `POST /booking` -> `POST /payments/pay` invalid | simulate payment fail | booking `FAILED/CANCELLED` |
| 034 | `POST /payments/pay` x2 cung `Idempotency-Key` | body giong nhau | khong double charge |
| 035 | `POST /booking` song song | cung idempotency key | khong duplicate |
| 036 | saga success | booking -> payment -> notification | state nhat quan |
| 037 | saga fail + compensation | payment fail sau booking | booking rollback/cancelled |
| 041 | `POST /ai/eta` | distance 5 | `0 < eta < 60` |
| 042 | `POST /pricing/calculate` | demand cao | `surge > 1` |
| 043 | `POST /ai/fraud` | full payload | co `fraud_score`, `flagged` |
| 044 | `POST /ai/recommendations` | list drivers | top-3 |
| 045 | `POST /ai/forecast` | demand_index | schema dung |
| 046 | `GET /ai/model-info` | none | co model versions |
| 047 | `POST /ai/eta` | nhanh | latency < SLA |
| 049 | `POST /ai/agent/select-driver` | no driver | fallback |
| 050 | `POST /ai/eta` | outlier distance | khong crash |
| 051 | `POST /ai/agent/select-driver` | nearest strategy | chon driver gan nhat |
| 052 | `POST /ai/agent/select-driver` | rating strategy | uu tien rating cao |
| 053 | `POST /ai/agent/select-driver` | balanced strategy | trade-off ETA/price |
| 055 | `POST /ai/agent/select-driver` | context thieu | fallback/khong crash |
| 057 | `POST /ai/agent/select-driver` | tat ca OFFLINE | selected_driver = null |
| 058 | `POST /ai/agent/select-driver` + `x-request-id` | valid | co `decision_log.trace_id` |
| 059 | Runner (Postman) | 30-200 iterations | khong race/conflict API-level |
| 060 | `POST /ai/agent/select-driver` | khi AI fail | fallback rule-based |
| 062 | load ETA nho | 50-200 request | danh gia p95 |
| 063 | load pricing nho | burst request | gia hop le |
| 067 | spam endpoint | burst | co `429` |
| 068 | do latency | batch requests | p95 theo SLA |
| 081 | `POST /auth/login` SQLi payload | `email="' OR 1=1 --"` | `400/401` |
| 082 | `POST /notifications` XSS payload | `<script>..</script>` | khong crash/API reject-or-accept co kiem soat |
| 083 | `GET /booking` tampered token | none | `401` |
| 085 | spam `/booking` hoac `/health` | high rate | `429` |
| 086 | replay payment/booking | resend request cu | khong double transaction |
| 090 | `POST /payments/pay` voi `method=CARD` | card number | response masked (`****1234`) |
| 091 | `GET /booking` khong token | none | `401`, Missing token |
| 092 | `GET /booking` token sai | none | `401`, Invalid token |
| 093 | `GET /booking` expired token | none | `401`, Token expired |
| 096 | truy cap user data bang role khong du quyen | tu driver/user token | `403/401` |
| 098 | rate limit abuse | spam request | `429` |
| 102 | `GET /health` | none | `200` |
| 104 | endpoint lien quan DB (vd `/booking`) | valid auth | query thanh cong |
| 105 | flow tao booking (co event) | valid booking | infer Kafka ok qua flow |
| 113 | `GET /metrics` | none | `200`, co metric |

### Mau thao tac cho moi testcase Postman

1. Chon dung method + URL `{{baseUrl}}/...`.
2. Them headers (`Content-Type`, `Authorization`, `Idempotency-Key` neu can).
3. Nhap body JSON theo bang.
4. Bam Send.
5. Save evidence:
- Screenshot request + response.
- Status code.
- Response body.
- Thoi gian response (Postman timing).

## 3) Testcase he thong (Docker Swarm) va cach chung minh

Nhom nay thuong la `TC025, 027, 028, 030, 032, 038-040, 048, 054, 056, 061, 064-066, 069-080, 084, 087-089, 094-095, 097, 099-101, 103, 106-112, 114-115`.

### 3.1 Lenh Swarm can dung

```bash
sudo docker service ls
sudo docker service ps <service_name>
sudo docker service logs -f <service_name>
sudo docker stack services taxi-booking
sudo docker stack ps taxi-booking
```

### 3.2 Kafka va event proof (TC025, TC027, TC038, TC064, TC073, TC105, TC119)

1. Mo Kafka UI: `http://<host>:8080`.
2. Xac dinh topic (`ride_events`, `payment.success`, ...).
3. Tao action tren Postman (booking/payment/accept).
4. Capture evidence:
- Message key/value.
- Offset tang.
- Timestamp.
- Khong duplicate/missing theo booking_id.

### 3.3 Deployment/rollback/autoscale proof (TC101, TC106-TC110)

1. Rolling update:
```bash
sudo docker service update --image kietlu/booking-service:<new_tag> taxi-booking_booking-service
```
2. Theo doi:
```bash
sudo docker service ps taxi-booking_booking-service
```
3. Chung minh zero downtime: chay loop `curl /health` trong luc update.
4. Rollback:
```bash
sudo docker service rollback taxi-booking_booking-service
```
5. Evidence:
- `service ps` before/after.
- Health logs khong downtime.
- Version image thay doi dung.

### 3.4 Failure/Resilience proof (TC030, TC032, TC039, TC071, TC072, TC075, TC076, TC077, TC079, TC080)

1. Gia lap service loi:
```bash
sudo docker service scale taxi-booking_pricing-service=0
# hoac
sudo docker service update --env-add SOME_BROKEN_ENV=1 taxi-booking_pricing-service
```
2. Goi flow Postman (`POST /booking`) trong thoi gian loi.
3. Khoi phuc service:
```bash
sudo docker service scale taxi-booking_pricing-service=1
```
4. Evidence:
- Logs cho retry/backoff/circuit breaker.
- API khong crash toan bo.
- State sau compensation nhat quan.

### 3.5 Security/transport/logging proof (TC087, TC088, TC089, TC094, TC095, TC097, TC099, TC100, TC111, TC112, TC114, TC115)

1. Encryption at rest:
- Query truc tiep DB va chung minh khong co plaintext PAN.
2. mTLS/in-transit:
- Thu request khong cert -> bi reject.
- Thu request co cert hop le -> pass.
3. RBAC:
- User role khong du quyen goi admin endpoint -> `403`.
4. Audit log + structured log:
- Capture log co `trace_id`, `timestamp`, `service_name`, `level`.
5. Metrics/tracing/dashboard:
- `/metrics` + Grafana panel + Jaeger trace screenshot.

## 4) Case 1000 req/s booking (TC061) - Script Python

Da tao script:
- [booking_1000rps.py](/D:/TaiLieuHoc/taxi-booking-microservices/tools/load/booking_1000rps.py)

### Cac gi script se hien thi

- Tong request planned/sent/completed
- Success rate (2xx)
- Achieved RPS
- Latency: min/avg/p50/p90/p95/p99/max
- Breakdown theo HTTP status

Vi du output console:

```text
[setup] auto register/login email=load_booking_xxxxxxxx@test.com
[setup] login success, token acquired
[start] target=1000 req/s duration=30s total=30000 workers=400 timeout=8.0s
[progress] sent=1000 completed=986/30000 delta=986/s achieved_rps=986.0 success_rate=97.46% statuses={201: 961, 429: 25}
...
========== LOAD TEST SUMMARY ==========
base_url      : http://192.168.57.101:3000
target_rps    : 1000
duration_sec  : 30
total_planned : 30000
total_sent    : 30000
total_done    : 30000
success_2xx   : 28740
success_rate  : 95.80%
achieved_rps  : 912.45
latency_min   : 8.44 ms
latency_avg   : 132.18 ms
latency_p50   : 121.09 ms
latency_p90   : 244.77 ms
latency_p95   : 311.54 ms
latency_p99   : 605.20 ms
latency_max   : 1411.36 ms
status_counts : {201: 28740, 429: 1020, 500: 240}
=======================================
[output] csv_saved=/.../reports/booking_1000rps_XXXXXXXX.csv
```

### Cach chay

```bash
python3 tools/load/booking_1000rps.py \
  --base-url http://192.168.57.101:3000 \
  --rps 1000 \
  --duration 30 \
  --workers 400
```

Neu can dung user co san:

```bash
python3 tools/load/booking_1000rps.py \
  --base-url http://192.168.57.101:3000 \
  --token "<ACCESS_TOKEN>" \
  --rps 1000 \
  --duration 30
```

Script tu in report console va luu CSV ket qua vao `reports/`.

## 5) Mau evidence nop bai

Moi testcase nen co:
- `Request screenshot` (headers + body).
- `Response screenshot` (status + body + timing).
- Neu case he thong: them `docker command output`, log snippet, Kafka/Grafana/Jaeger screenshot.
- Dat ten file theo quy tac: `TCxxx_<short-name>_<timestamp>.png/txt`.
