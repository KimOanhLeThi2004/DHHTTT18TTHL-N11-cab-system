<!--
HUONG DAN VIET NOI DUNG CHO CODEX / AI GENERATORS

YEU CAU NGON NGU QUAN TRONG:
- TAT CA noi dung sinh ra (comment code, README.md, tai lieu noi bo, mo ta API, thong bao loi, giai thich)
  PHAI viet bang **TIENG VIET**.
- KHONG sinh giai thich bang tieng Anh neu khong duoc yeu cau.
- Ten bien, ham, class, va ten file PHAI giu tieng Anh (camelCase / PascalCase).
- Noi dung doc duoc boi con nguoi (comment, log, README, tai lieu) PHAI la tieng Viet.

Neu co xung dot giua do ro rang va ngon ngu:
- Uu tien tinh chinh xac va ro rang cua code
- Van su dung tieng Viet cho moi noi dung giai thich
-->
# Driver Service – Dac ta ky thuat va lo trinh trien khai

## 1. Tong quan dich vu
Driver Service chiu trach nhiem quan ly du lieu tai xe va trang thai thoi gian thuc
trong he thong dat xe CAB. Dich vu tuan theo kien truc **microservices, event-driven, polyglot persistence**.

### Nhiem vu chinh
- Quan ly ho so tai xe va phuong tien
- Quan ly trang thai online/offline va kha dung
- Theo doi vi tri tai xe thoi gian thuc
- Xu ly chap nhan/tu choi de xuat cuoc xe
- Dong bo trang thai tai xe voi Ride Service
- Phat va tieu thu su kien mien

Driver Service la **nguon su that** ve trang thai va kha dung cua tai xe.

---

## 2. Nguyen tac kien truc
- API REST/gRPC stateless
- Giao tiep event-driven thong qua message broker
- Polyglot persistence:
  - PostgreSQL: du lieu quan he, giao dich
  - MongoDB: log, lich su, su kien
  - Redis: trang thai va vi tri thoi gian thuc
- Bao mat Zero Trust voi JWT
- Xu ly su kien idempotent
- Driver Service KHONG trien khai WebSocket gateway; chi phat su kien. Realtime gateway (WebSocket/Socket.IO) thuoc pham vi service khac va chi tich hop thong qua su kien.

---

## 3. Thiet ke luu tru du lieu

### 3.1 PostgreSQL (Co so du lieu quan he chinh)
Dung cho du lieu co cau truc, giao dich, ton tai lau dai.

#### Bang
**drivers**
- id (UUID, PK)
- name
- phone
- email
- rating
- status (ACTIVE | SUSPENDED)
- created_at
- updated_at

**vehicles**
- id (UUID, PK)
- driver_id (FK → drivers.id)
- plate_number
- vehicle_type
- color
- capacity

---

### 3.2 MongoDB (Log va lich su)
Dung cho du lieu ghi nhieu, linh hoat, khong can giao dich.

#### Collections
**driver_status_history**
- driverId
- oldStatus
- newStatus
- changedAt

**driver_offer_logs**
- driverId
- rideId
- offerId
- action (ACCEPTED | REJECTED)
- timestamp

**driver_activity_logs**
- driverId
- action (ONLINE | OFFLINE)
- metadata
- timestamp

---

### 3.3 Redis (Trang thai thoi gian thuc)
Dung cho du lieu thay doi nhanh, co the tai tao. Redis GEO duoc dung de tim kiem tai xe gan nhat.

---

### 3.4 Redis Key Design
- `driver:status:{driverId}` → ONLINE | OFFLINE
- `driver:state:{driverId}` → AVAILABLE | BUSY | ON_TRIP
- `driver:location:{driverId}` → { lat, lng, updatedAt }
- `driver:last_seen:{driverId}` → timestamp
- `geo:drivers:available` → Redis GEO set chua vi tri tai xe dang AVAILABLE

Quy tac dong bo Redis GEO:
- Khi state chuyen sang AVAILABLE: `GEOADD geo:drivers:available lng lat driverId`
- Khi state chuyen sang BUSY | ON_TRIP | OFFLINE: `ZREM geo:drivers:available driverId`

Tra cuu tai xe gan nhat:
- `GEORADIUS geo:drivers:available lng lat radius unit`

Redis khong phai nguon su that va co the tai tao tu he thong su kien va du lieu chinh.

---

## 4. Thiet ke API

### 4.1 Driver Profile APIs
- `POST /drivers`
- `GET /drivers/{driverId}`
- `PATCH /drivers/{driverId}`

### 4.2 Availability & State APIs
- `POST /drivers/{driverId}/go-online`
- `POST /drivers/{driverId}/go-offline`
- `PATCH /drivers/{driverId}/state`

### 4.3 Location APIs
- `POST /drivers/{driverId}/location`
  - Gioi han tan suat (goi y: 1 cap nhat / 3–5 giay)

### 4.4 Ride Offer APIs
- `POST /drivers/{driverId}/offers/{offerId}/accept`
- `POST /drivers/{driverId}/offers/{offerId}/reject`

---

## 5. Giao tiep su kien

### 5.1 Su kien phat ra (tu Driver Service)
- `DriverCreated`
- `DriverUpdated`
- `DriverOnline`
- `DriverOffline`
- `DriverAvailabilityChanged`
- `DriverLocationUpdated` (khuyen nghi throttle/batch hoac chi phat khi dang co chuyen)
- `DriverAcceptedOffer`
- `DriverRejectedOffer`

### 5.2 Su kien tieu thu (tai Driver Service)
- `RideOfferCreated`
- `RideStatusChanged` (ASSIGNED/STARTED/COMPLETED) de doi state va cap nhat Redis GEO
- `TripStarted`
- `TripEnded`
- `DriverSuspended`
- `DriverAssigned` (hop dong su kien tich hop; neu su dung thi co the set BUSY/ON_TRIP)

Tat ca su kien phai:
- Co phien ban
- Idempotent
- JSON-serializable

---

## 6. Quy trinh nghiep vu chinh

### Flow A: Tai xe online
1. Tai xe goi `go-online`
2. Redis set `driver:status = ONLINE`
3. Redis set `driver:state = AVAILABLE`
4. `GEOADD geo:drivers:available` voi vi tri hien tai (neu co)
5. MongoDB ghi log hoat dong
6. Phat su kien `DriverOnline`

---

### Flow B: Cap nhat vi tri tai xe
1. Ung dung tai xe gui vi tri
2. Redis cap nhat `driver:location`
3. Redis cap nhat `driver:last_seen`
4. Neu `driver:state = AVAILABLE` thi `GEOADD geo:drivers:available`
5. Phat `DriverLocationUpdated` (throttle/batch, chi khi dang co chuyen)

---

### Flow C: Tai xe chap nhan de xuat cuoc xe
1. Nhan `RideOfferCreated`
2. He thong realtime (service khac) day thong tin den tai xe thong qua su kien
3. Tai xe chap nhan
4. Redis cap nhat `driver:state = BUSY`
5. `ZREM geo:drivers:available`
6. MongoDB ghi log chap nhan
7. Phat `DriverAcceptedOffer`

---

### Flow D: Dong bo trang thai chuyen di
1. Nhan `RideStatusChanged`
2. Neu `ASSIGNED` thi `driver:state = BUSY` va `ZREM geo:drivers:available`
3. Neu `STARTED` thi `driver:state = ON_TRIP` va `ZREM geo:drivers:available`
4. Neu `COMPLETED` thi `driver:state = AVAILABLE` va `GEOADD geo:drivers:available`
5. MongoDB ghi log lich su neu can

---

## 7. Yeu cau bao mat
- Tat ca endpoint yeu cau JWT
- Phan quyen theo vai tro (ROLE_DRIVER)
- Tai xe chi duoc sua du lieu cua chinh minh
- Gioi han tan suat voi cac endpoint nhay cam (cap nhat vi tri)

---

## 8. Do tin cay va quan sat
- Log co cau truc voi correlationId
- Metrics:
  - So tai xe dang hoat dong
  - So cap nhat vi tri tren phut
  - Ti le chap nhan de xuat
- Dead-letter queue cho su kien that bai
- Retry co backoff khi tieu thu su kien

---

## 9. Trien khai va van hanh
- Dich vu stateless, khong luu session cuc bo
- Health/Readiness endpoints phai co:
  - `GET /health/live` cho liveness
  - `GET /health/ready` cho readiness (kiem tra ket noi DB/Redis)
- Trien khai tren K8s:
  - Deployment + HPA theo CPU/latency
  - ConfigMap/Secret cho cau hinh
  - Service/Ingress phuc vu API
- Su dung managed PostgreSQL/MongoDB/Redis (hoac DB cluster) tu goc nhin Driver Service
- Ket noi DB phai ho tro reconnection va timeout ro rang

---

## 10. Lo trinh trien khai

### Phase 1 – Nen tang
- Khoi tao du an
- Schema PostgreSQL
- API CRUD tai xe co ban

### Phase 2 – Trang thai thoi gian thuc
- Tich hop Redis
- API online/offline & availability
- Cap nhat vi tri
- Them Redis GEO va dong bo `geo:drivers:available`

### Phase 3 – Tich hop su kien
- Thiet lap message broker
- Phat/tieu thu su kien cot loi
- `DriverLocationUpdated` voi throttle/batch
- Tich hop realtime qua event bus (khong trien khai WebSocket)

### Phase 4 – Tuong tac chuyen di
- Flow chap nhan/tu choi de xuat
- Dong bo trang thai tu `RideStatusChanged`
- Cap nhat GEO theo trang thai chuyen di

### Phase 5 – Tang cuong he thong
- Bao mat
- Gioi han tan suat
- Logging & metrics
- Health/Readiness day du

---

## 11. Non-Goals
- Logic dinh gia
- Xu ly thanh toan
- Thuat toan ghep chuyen

Nhung phan nay thuoc cac service khac.

---

## 12. Tieu chi thanh cong
- Trang thai tai xe nhat quan giua cac service
- Redis loi khong gay mat du lieu quan trong
- Reprocess su kien khong tao trang thai trung lap
- Ho tro scale ngang
