# Huong Dan Test Thu Cong Tren Postman - 120 Test Case

- Tai lieu nay rewrite theo script hien tai `run_120_testcases.py`.
- Moi testcase duoc liet ke thanh tung muc rieng voi cac buoc thao tac tay.
- Quy uoc bien moi truong nen co: `baseUrl`, `customerToken`, `driverToken` (neu testcase can auth).

## Chuan bi chung

1. Tao Postman Environment, dat `baseUrl` (vi du `http://localhost:3000`).
2. Dang nhap customer/driver de lay token khi can (tham khao TC001-TC005).
3. Voi request can auth, them header `Authorization: Bearer <token>`.

## TC001

- Nguon script: `explicit c1`
- Muc tieu: API: POST /auth/register

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /auth/register: {"email": ctx.email, "password": ctx.password, "name": "Test User", "role": "CUSTOMER"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC002

- Nguon script: `explicit c2`
- Muc tieu: API: POST /auth/login

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /auth/login: {"email": ctx.email, "password": ctx.password, "role": "CUSTOMER"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC003

- Nguon script: `explicit c3`
- Muc tieu: API: POST /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 5, "durationMin": 10, "vehicleType": "CAR"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC004

- Nguon script: `explicit c4`
- Muc tieu: API: GET /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /booking: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC005

- Nguon script: `explicit c5`
- Muc tieu: API: POST /drivers/online

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /drivers/online: {"driverId": "DRV001", "lat": 10.76, "lng": 106.66, "vehicleType": "CAR"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC006

- Nguon script: `explicit c6`
- Muc tieu: API: GET /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /booking: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC007

- Nguon script: `explicit c7`
- Muc tieu: API: POST /ai/eta

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/eta: {"distance_km": 5, "traffic_level": 0.5}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC008

- Nguon script: `explicit c8`
- Muc tieu: API: POST /pricing/calculate

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /pricing/calculate: {"distance_km": 5, "vehicleType": "CAR", "demand_index": 1}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC009

- Nguon script: `explicit c9`
- Muc tieu: API: POST /notifications

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /notifications: {"userId": ctx.user_id or "USR123", "message": "Your ride is confirmed"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC010

- Nguon script: `explicit c10`
- Muc tieu: API: POST /auth/logout ; GET /booking ; POST /auth/login

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /auth/logout: {"refreshToken": ctx.refresh}
3. 2. GET /booking: {}
4. 3. POST /auth/login: {"email": ctx.email, "password": ctx.password, "role": "CUSTOMER"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC011

- Nguon script: `explicit c11`
- Muc tieu: API: POST /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /booking: {"dropoff": {"lat": 10.77, "lng": 106.7}, "distanceKm": 5, "vehicleType": "CAR"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC012

- Nguon script: `explicit c12`
- Muc tieu: API: POST /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /booking: {"pickup": {"lat": "abc", "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.7}, "distanceKm": 5, "vehicleType": "CAR"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC013

- Nguon script: `explicit c13`
- Muc tieu: API: POST /ai/agent/select-driver

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/agent/select-driver: {"drivers": []}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC014

- Nguon script: `explicit c14`
- Muc tieu: API: POST /payments/pay

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /payments/pay: {"bookingId": ctx.booking_id or "BK0", "payment_method": "invalid_card", "amount": 100000}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC015

- Nguon script: `explicit c15`
- Muc tieu: API: POST /ai/eta

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/eta: {"distance_km": 0}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC016

- Nguon script: `explicit c16`
- Muc tieu: API: POST /pricing/calculate

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /pricing/calculate: {"distance_km": 5, "demand_index": 0, "supply_index": 1, "vehicleType": "CAR"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC017

- Nguon script: `explicit c17`
- Muc tieu: API: POST /ai/fraud

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/fraud: {"user_id": "USR123"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC018

- Nguon script: `explicit c18`
- Muc tieu: Authorization Bearer expired_token phai bi reject, khong xu ly business booking.

Cac buoc thao tac tay tren Postman:

1. Tao request POST {{baseUrl}}/booking.
2. Header: Authorization = Bearer expired_token; Content-Type = application/json.
3. Body: {}.
4. Bam Send.
5. Ky vong HTTP 401 va message Token expired (neu expired_token la token het han hop le).
6. Xac nhan response khong co booking_id/status/fare/driver_id.

## TC019

- Nguon script: `explicit c19`
- Muc tieu: Cung payload + cung Idempotency-Key chi tao 1 booking va lan 2 tra ket qua cu.

Cac buoc thao tac tay tren Postman:

1. GET {{baseUrl}}/booking (Authorization: Bearer {{customerToken}}), ghi lai so luong N.
2. Tao key, vi du idem-{{timestamp}}.
3. POST {{baseUrl}}/booking voi payload booking hop le, header co Idempotency-Key vua tao.
4. POST lai y nguyen request tren (cung body, cung Idempotency-Key).
5. GET {{baseUrl}}/booking lan nua.
6. Ky vong: lan 1 tao booking, lan 2 tra ket qua cu (booking_id giong nhau), tong so booking tang dung +1.

## TC020

- Nguon script: `explicit c20`
- Muc tieu: API: POST /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 5, "durationMin": 10, "vehicleType": "CAR", "note": huge}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC021

- Nguon script: `explicit c21`
- Muc tieu: API: POST /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 4, "durationMin": 8, "vehicleType": "CAR"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC022

- Nguon script: `explicit c22`
- Muc tieu: API: POST /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 3, "durationMin": 7, "vehicleType": "CAR"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC023

- Nguon script: `explicit c23`
- Muc tieu: API: POST /ai/agent/select-driver

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/agent/select-driver: {"drivers": [{"id": "D1", "distanceKm": 2, "rating": 4.8, "eta": 6, "price": 100}, {"id": "D2", "distanceKm": 1, "rating": 4.5, "eta": 4, "price": 120}]}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC024

- Nguon script: `explicit c24`
- Muc tieu: API: POST /payments/pay ; POST /notifications

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /payments/pay: {"bookingId": ctx.booking_id or "BK0", "method": "CASH", "amount": 120000}
3. 2. POST /notifications: {"userId": ctx.user_id or "USR123", "message": "Payment initialized"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC025

- Nguon script: `explicit c25`
- Muc tieu: File check: services/booking-service/services/booking.service.js (contains: ride_requested)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC026

- Nguon script: `explicit c26`
- Muc tieu: Driver nhan message ASSIGN_RIDE qua WebSocket

Cac buoc thao tac tay tren Postman:

1. Mo tab WebSocket trong Postman, ket noi `ws://{{baseUrl_host_only}}/ws/drivers` (vi du `ws://localhost:3000/ws/drivers`).
2. Gui message auth: `{"type":"AUTH","token":"<driver_access_token>"}`.
3. Gui `GPS_UPDATE` de driver online: `{"type":"GPS_UPDATE","lat":10.7601,"lng":106.6601,"vehicleType":"CAR"}`.
4. O tab HTTP khac, tao booking customer bang `POST {{baseUrl}}/booking` (pickup/dropoff gan vi tri driver).
5. Quay lai tab WebSocket va quan sat message push.
6. Ky vong nhan duoc message co `type = "ASSIGN_RIDE"` va trong `data` co `bookingId`, `driverId`, `pickup`, `dropoff`.

## TC027

- Nguon script: `explicit c27`
- Muc tieu: Booking chuyen trang thai `REQUESTED -> ACCEPTED` khi driver accept, DB duoc cap nhat va event `ride_accepted` duoc publish.

Cac buoc thao tac tay tren Postman:

1. Tao booking customer bang `POST {{baseUrl}}/booking` va lay `booking_id`.
2. Dam bao driver da nhan assignment (`ASSIGN_RIDE`) va dung token DRIVER cua driver duoc assign.
3. Driver goi `POST {{baseUrl}}/drivers/accept` voi body:
   `{"bookingId":"<booking_id>"}`.
4. Ky vong response `200` va message `Accepted successfully`.
5. Kiem tra booking status qua `GET {{baseUrl}}/booking` (customer token), tim booking vua tao va ky vong `status = ACCEPTED`.
6. Kiem tra DB (Mongo `bookings`) theo `_id = booking_id`, ky vong field `status` da la `ACCEPTED`.
7. Kiem tra event da publish:
   - Doc log `booking-service/ride-service` hoac xem Kafka UI topic lien quan.
   - Ky vong co event `ride_accepted` (hoac payload tuong duong cho booking vua accept).

## TC028

- Nguon script: `simulated range (28-40)`
- Muc tieu: Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC029

- Nguon script: `simulated range (28-40)`
- Muc tieu: Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC030

- Nguon script: `simulated range (28-40)`
- Muc tieu: Retry khi Pricing service timeout; Booking service retry hoac fallback gia; he thong khong crash.

Cac buoc thao tac tay tren Postman:

1. Chuan bi token customer hop le.
2. Giam kha nang dap ung cua pricing-service (vi du tam dung container pricing-service hoac chan ket noi den pricing-service trong thoi gian ngan).
3. Gui `POST {{baseUrl}}/booking` voi payload hop le (pickup/dropoff/distanceKm/vehicleType).
4. Ky vong:
5. Truong hop A: booking van tao duoc, response co `price` hop le (fallback gia) va API khong bi treo.
6. Truong hop B: booking that bai co kiem soat (4xx/5xx co message ro rang), nhung gateway/service van song.
7. Bat lai pricing-service (neu da tam dung) va goi `GET {{baseUrl}}/health` + `GET {{baseUrl}}/metrics`.
8. Ky vong `health = 200`, service khong crash/restart bat thuong, request tiep theo van xu ly duoc.

## TC031

- Nguon script: `simulated range (28-40)`
- Muc tieu: Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC032

- Nguon script: `simulated range (28-40)`
- Muc tieu: Rollback khi loi giua chung (loi xay ra sau buoc insert booking vao DB), he thong phai nhat quan.

Cac buoc thao tac tay tren Postman:

1. Chuan bi token customer hop le.
2. Mo ket noi Mongo (Mongo Compass hoac mongosh) de quan sat collection `bookings`.
3. Tam thoi gay loi sau insert bang cach lam Kafka producer fail (vi du tam dung Kafka/container broker ngay truoc luc tao booking).
4. Gui `POST {{baseUrl}}/booking` voi payload hop le.
5. Ky vong API tra loi co loi (4xx/5xx) do buoc publish event that bai.
6. Kiem tra DB: tim booking vua tao theo thoi gian/du lieu pickup-dropoff.
7. Tieu chi pass cua testcase rollback: KHONG co ban ghi booking moi (da rollback), he thong consistent.
8. Neu van co booking trong DB du API bao loi => testcase FAIL, ghi nhan loi thieu transaction rollback sau insert.

## TC033

- Nguon script: `simulated range (28-40)`
- Muc tieu: Payment service fail trong flow booking + payment. Booking phai ve `FAILED` hoac `CANCELLED`, khong charge tien, khong de trang thai dang do.

Cac buoc thao tac tay tren Postman:

1. Tao booking bang `POST {{baseUrl}}/booking` (Authorization customer token), luu `booking_id`.
2. Mo request `POST {{baseUrl}}/payments/pay` voi body co `bookingId = <booking_id>` va co loi co chu y (vi du `payment_method = "BANK_TRANSFER"` hoac `amount = -1`).
3. Gui request, ky vong payment fail (4xx/5xx, message loi ro rang).
4. Goi `GET {{baseUrl}}/booking`, tim booking vua tao.
5. Ky vong muc tieu nghiep vu: booking khong duoc o trang thai dang do, uu tien `FAILED` hoac `CANCELLED`.
6. Xac nhan khong co dau hieu charge thanh cong (khong co response payment success, khong co event `PAYMENT_SUCCESS` cho booking nay neu dang nghe WS notifications).
7. Neu payment fail nhung booking van o trang thai khong duoc xu ly compensation => testcase FAIL.

## TC034

- Nguon script: `simulated range (28-40)`
- Muc tieu: Idempotent transaction (duplicate request): client retry cung `Idempotency-Key`, chi 1 transaction duoc thuc hien, khong double charge.

Cac buoc thao tac tay tren Postman:

1. Tao booking hop le va luu `booking_id`.
2. Tao key: `idem-pay-{{timestamp}}`.
3. Gui `POST {{baseUrl}}/payments/pay` voi body hop le (`bookingId`, `payment_method`, `amount`) va header `Idempotency-Key` = key tren.
4. Gui lai y nguyen request lan 2 (cung body, cung `Idempotency-Key`).
5. Ky vong: he thong chi tao 1 payment transaction; lan 2 tra ket qua cu (payment id giong nhau hoac khong phat sinh charge moi).
6. Neu lan 2 tao transaction moi/charge them => testcase FAIL.

## TC035

- Nguon script: `simulated range (28-40)`
- Muc tieu: Concurrent booking (race condition): 2 request booking song song khong tao duplicate, system consistent.

Cac buoc thao tac tay tren Postman:

1. Goi `GET {{baseUrl}}/booking` va ghi so luong hien tai `N`.
2. Tao 2 tab request A/B cung `POST {{baseUrl}}/booking`, cung payload, cung `Idempotency-Key`.
3. Bam Send A va B gan nhu dong thoi.
4. Goi lai `GET {{baseUrl}}/booking`.
5. Ky vong: tong booking chi tang +1, khong co 2 booking duplicate cung payload/key.
6. Neu co 2 booking moi cho cung 1 giao dich logic => testcase FAIL.


## TC036

- Nguon script: `simulated range (28-40)`
- Muc tieu: Saga transaction success flow (Booking -> Payment -> Notification), tat ca buoc thanh cong, state nhat quan.

Cac buoc thao tac tay tren Postman:

1. Mo tab WebSocket ket noi `ws://localhost:3000/ws/notifications`.
2. Gui auth message: `{"type":"AUTH","token":"<customer_access_token>"}` va dam bao nhan `AUTH_OK`.
3. Tao booking bang `POST {{baseUrl}}/booking`, lay `booking_id`.
4. Neu flow can driver accept, thuc hien buoc accept theo TC027 de booking sang `ACCEPTED`.
5. Gui `POST {{baseUrl}}/payments/pay` voi body hop le cho `booking_id`.
6. Ky vong payment success (200), va tren WS nhan duoc message `PAYMENT_SUCCESS` dung `bookingId`.
7. Kiem tra `GET {{baseUrl}}/booking`: booking o trang thai hop le sau saga (khong dang do).
8. Neu tat ca buoc thanh cong va du lieu dong nhat => testcase PASS.

## TC037

- Nguon script: `simulated range (28-40)`
- Muc tieu: Saga transaction failure + compensation: payment fail sau booking phai trigger compensation (booking CANCELLED, refund neu can).

Cac buoc thao tac tay tren Postman:

1. Tao booking hop le va lay `booking_id`.
2. Giu ket noi WS notifications cua customer de theo doi event thanh toan.
3. Goi `POST {{baseUrl}}/payments/pay` voi du lieu gay fail co chu y (method khong hop le hoac timeout gia lap).
4. Ky vong payment fail (4xx/5xx).
5. Goi `GET {{baseUrl}}/booking`, tim `booking_id`.
6. Ky vong muc tieu nghiep vu: compensation chay, booking chuyen `CANCELLED` (hoac `FAILED` theo rule), khong co payment success event.
7. Neu booking van treo o trang thai khong nhat quan => testcase FAIL.

## TC038

- Nguon script: `simulated range (28-40)`
- Muc tieu: Kafka event consistency (outbox pattern): DB commit va event publish dong bo, khong mat event, khong duplicate event.

Cac buoc thao tac tay tren Postman:

1. Mo WS driver (`/ws/drivers`) va/hoac WS notification (`/ws/notifications`) de theo doi event dau ra.
2. Tao 10 booking lien tiep (`POST {{baseUrl}}/booking`) voi `Idempotency-Key` khac nhau, luu danh sach `booking_id`.
3. Theo doi event xuong downstream (ASSIGN_RIDE/PAYMENT_SUCCESS hoac event lien quan theo flow dang test).
4. Doi chieu tung `booking_id`: moi booking co event tuong ung dung 1 lan.
5. Tieu chi pass: khong co booking bi mat event, khong co event duplicate cho cung `booking_id`.
6. Neu co mat event hoac duplicate => testcase FAIL, danh dau can outbox/de-dup.

## TC039

- Nguon script: `simulated range (28-40)`
- Muc tieu: Partial failure (network issue): payment timeout, he thong retry/fallback hop ly, khong inconsistent state, transaction khong bi ket.

Cac buoc thao tac tay tren Postman:

1. Tao booking hop le va lay `booking_id`.
2. Gia lap loi mang voi payment (uu tien: tam dung `payment-service`; neu khong co quyen ha tang thi dung timeout rat ngan ben Postman de tao request timeout).
3. Goi `POST {{baseUrl}}/payments/pay` cho `booking_id`.
4. Ky vong request fail co kiem soat (khong treo vo han, khong lam sap service).
5. Goi `GET {{baseUrl}}/booking` de dam bao booking khong roi vao trang thai vo nghia.
6. Khoi phuc ket noi payment-service, goi lai `POST {{baseUrl}}/payments/pay`.
7. Ky vong he thong phuc hoi duoc, xu ly thanh cong 1 lan, khong duplicate charge.

## TC040

- Nguon script: `simulated range (28-40)`
- Muc tieu: Data integrity (ACID) cho flow da buoc: booking -> pricing -> payment -> assign driver.

Cac buoc thao tac tay tren Postman:

1. Kiem tra Atomic: tao booking, sau do gia lap payment fail.
2. Ky vong Atomic: giao dich duoc rollback/compensate theo rule, khong de record dang do.
3. Kiem tra Consistent: gui request booking sai du lieu (vi du thieu `pickup`, `distanceKm` am).
4. Ky vong Consistent: request bi reject (4xx), khong commit vao DB.
5. Kiem tra Isolated: gui 2 request song song cho cung giao dich logic (cung idempotency key).
6. Ky vong Isolated: chi 1 request tao tac dong hieu luc, khong duplicate.
7. Kiem tra Durable: tao giao dich thanh cong, ghi lai `booking_id`/`payment_id`, restart service lien quan (neu co the), roi query lai.
8. Ky vong Durable: du lieu da commit van ton tai, khong bi mat.
9. Neu bat ky tieu chi nao vi pham => testcase FAIL va danh dau loi data integrity.

## TC041

- Nguon script: `explicit c41`
- Muc tieu: API: POST /ai/eta

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/eta: {"distance_km": 5, "traffic_level": 0.7}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC042

- Nguon script: `explicit c42`
- Muc tieu: API: POST /pricing/calculate

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /pricing/calculate: {"distance_km": 5, "demand_index": 2.5, "supply_index": 1, "vehicleType": "CAR"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC043

- Nguon script: `explicit c43`
- Muc tieu: API: POST /ai/fraud

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/fraud: {"user_id": "USR", "driver_id": "DRV", "booking_id": "BK", "amount": 2000000, "location": "HCM", "device_fingerprint": "abc"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC044

- Nguon script: `explicit c44`
- Muc tieu: API: POST /ai/recommendations

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/recommendations: {"drivers": [{"id": "D1", "rating": 4.6}, {"id": "D2", "rating": 4.9}, {"id": "D3", "rating": 4.7}, {"id": "D4", "rating": 4.2}]}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC045

- Nguon script: `explicit c45`
- Muc tieu: API: POST /ai/forecast

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/forecast: {"demand_index": 1.2}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC046

- Nguon script: `explicit c46`
- Muc tieu: API: GET /ai/model-info

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /ai/model-info: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC047

- Nguon script: `explicit c47`
- Muc tieu: API: POST /ai/eta

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /ai/eta: {"distance_km": 4, "traffic_level": 0.4}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC048

- Nguon script: `simulated range (48-60)`
- Muc tieu: Kiem tra endpoint AI Agent hoat dong co ban.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc48-smoke-001`
- Body: `{"strategy":"nearest","force_ai_fail":true,"drivers":[{"id":"D1","distanceKm":2,"status":"ONLINE"}]}`
- Expected: HTTP `200`, response co `mode`, `selected_driver`, `decision_log.trace_id`.

## TC049

- Nguon script: `explicit c49`
- Muc tieu: Khong co driver thi fallback an toan, khong crash.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc49-no-driver-001`
- Body: `{"strategy":"nearest","drivers":[]}`
- Expected: HTTP `200`, `mode="fallback"`, `selected_driver=null`, `reason="no_driver"`, co `decision_log.trace_id`.

## TC050

- Nguon script: `explicit c50`
- Muc tieu: ETA xu ly outlier hop le, khong crash.
- Request: `POST {{baseUrl}}/ai/eta`
- Headers: `Content-Type: application/json`
- Body: `{"distance_km":1200,"traffic_level":1}`
- Expected: HTTP `200`, `eta > 0`, service khong timeout/crash.

## TC051

- Nguon script: `explicit c51`
- Muc tieu: Agent chon driver gan nhat, khong random.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc51-nearest-001`
- Body: `{"strategy":"nearest","force_ai_fail":true,"drivers":[{"id":"D1","distanceKm":5,"rating":4.3,"status":"ONLINE"},{"id":"D2","distanceKm":2,"rating":4.1,"status":"ONLINE"},{"id":"D3","distanceKm":3,"rating":4.5,"status":"ONLINE"}]}`
- Expected: HTTP `200`, `selected_driver.id="D2"`, co `decision_log.trace_id`.

## TC052

- Nguon script: `explicit c52`
- Muc tieu: Agent uu tien rating cao hon, khong chi dua vao distance.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc52-rating-001`
- Body: `{"strategy":"balanced","force_ai_fail":true,"drivers":[{"id":"D1","distanceKm":2,"rating":4.0,"eta":6,"price":50000,"status":"ONLINE"},{"id":"D2","distanceKm":3,"rating":4.9,"eta":7,"price":52000,"status":"ONLINE"}]}`
- Expected: HTTP `200`, `selected_driver.id="D2"` (rating cao hon du distance xa hon).

## TC053

- Nguon script: `explicit c53`
- Muc tieu: Agent can bang ETA va price (multi-objective trade-off).
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc53-tradeoff-001`
- Body: `{"strategy":"balanced","force_ai_fail":true,"drivers":[{"id":"A","distanceKm":2.5,"rating":4.5,"eta":5,"price":50000,"status":"ONLINE"},{"id":"B","distanceKm":2.5,"rating":4.5,"eta":8,"price":40000,"status":"ONLINE"}]}`
- Expected: HTTP `200`, ky vong `selected_driver.id="B"` cho trade-off ETA/price.

## TC054

- Nguon script: `explicit lv6-tool-order`
- Muc tieu: Agent goi dung tool theo thu tu ETA -> Pricing, khong goi du thua.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc54-tool-order-001`
- Body: `{"strategy":"balanced","force_ai_fail":true,"drivers":[{"id":"D1","distanceKm":2.2,"rating":4.4,"status":"ONLINE"},{"id":"D2","distanceKm":3.1,"rating":4.6,"status":"ONLINE"}]}`
- Expected: HTTP `200`, `decision_log.tools_called` ton tai; thu tu tool la `eta` truoc `pricing`; khong co tool du thua.

## TC055

- Nguon script: `explicit lv6-missing-context`
- Muc tieu: Context thieu du lieu, agent khong crash, fallback/warning hop ly.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc55-missing-ctx-001`
- Body: `{"strategy":"balanced","force_ai_fail":true,"drivers":[{"id":"D1","rating":4.8,"status":"ONLINE"},{"id":"D2","distanceKm":2.0,"status":"ONLINE"}]}`
- Expected: HTTP `200`, khong `500`; co `decision_log`; co the co `decision_log.warnings` (vd `missing_distance`) hoac fallback.

## TC056

- Nguon script: `explicit lv6-retry-eta`
- Muc tieu: ETA tool fail tam thoi thi agent retry, khong fail ngay.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc56-retry-eta-001`
- Body: `{"strategy":"balanced","force_ai_fail":true,"tool_failures":{"eta":2},"drivers":[{"id":"D1","distanceKm":2.0,"rating":4.6,"status":"ONLINE"}]}`
- Expected: HTTP `200`, `decision_log.tools_called` cho thay ETA retry (attempt 1 error, 2 error, 3 ok), sau do moi den pricing.

## TC057

- Nguon script: `explicit c57`
- Muc tieu: Khong duoc chon driver offline.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc57-offline-001`
- Body: `{"strategy":"nearest","force_ai_fail":true,"drivers":[{"id":"OFF","distanceKm":1,"rating":5.0,"status":"OFFLINE"},{"id":"ON","distanceKm":3,"rating":4.2,"status":"ONLINE"}]}`
- Expected: HTTP `200`, `selected_driver.id="ON"`, khong bao gio chon `OFF`.

## TC058

- Nguon script: `explicit c58`
- Muc tieu: Agent log decision day du, co trace_id.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc58-trace-001`
- Body: `{"strategy":"balanced","drivers":[{"id":"D1","distanceKm":2.2,"rating":4.3,"status":"ONLINE"},{"id":"D2","distanceKm":2.8,"rating":4.7,"status":"ONLINE"}]}`
- Expected: HTTP `200`, `decision_log` co `trace_id`, `selection_reason`, `timestamp`, `candidate_count`; neu can enrich thi co `tools_called`.

## TC059

- Nguon script: `explicit c59`
- Muc tieu: Xu ly nhieu request gan dong thoi, khong race/conflict.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc59-concurrency-{{$timestamp}}`
- Body: `{"strategy":"nearest","force_ai_fail":true,"drivers":[{"id":"D1","distanceKm":5,"status":"ONLINE"},{"id":"D2","distanceKm":2,"status":"ONLINE"},{"id":"D3","distanceKm":3,"status":"ONLINE"}]}`
- Run: Collection Runner 50-100 iterations, delay `0ms`.
- Expected: khong co `500`, response on dinh, `selected_driver` hop le va online.

## TC060

- Nguon script: `explicit c60`
- Muc tieu: AI fail thi fallback rule-based, he thong van chay.
- Request: `POST {{baseUrl}}/ai/agent/select-driver`
- Headers: `Content-Type: application/json`, `x-request-id: tc60-ai-fail-001`
- Body: `{"strategy":"nearest","force_ai_fail":true,"drivers":[{"id":"D1","distanceKm":5,"status":"ONLINE"},{"id":"D2","distanceKm":2,"status":"ONLINE"}]}`
- Expected: HTTP `200`, `mode="fallback"`, van co `selected_driver` theo rule-base (ky vong `D2`), `decision_log.selection_reason` la `forced_ai_failure` hoac `rule_base_fallback`.

## TC061

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC062

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC063

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC064

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC065

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC066

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC067

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC068

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC069

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC070

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC071

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC072

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC073

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC074

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC075

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC076

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC077

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC078

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC079

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC080

- Nguon script: `simulated range (61-80)`
- Muc tieu: Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry`

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC081

- Nguon script: `explicit c81`
- Muc tieu: API: POST /auth/login

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /auth/login: {"email": "' OR 1=1 --", "password": "x", "role": "CUSTOMER"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC082

- Nguon script: `explicit c82`
- Muc tieu: API: POST /notifications

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. POST /notifications: {"userId": ctx.user_id or "USR", "message": "<script>alert(1)</script>"}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC083

- Nguon script: `explicit c83`
- Muc tieu: API: GET /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /booking: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC084

- Nguon script: `explicit c84`
- Muc tieu: API: GET /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /booking: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC085

- Nguon script: `explicit c85`
- Muc tieu: API: GET /health

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /health: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC086

- Nguon script: `explicit c86`
- Muc tieu: Alias: chay lai TC019

Cac buoc thao tac tay tren Postman:

1. Day la testcase alias, khong co request rieng.
2. Thao tac lai dung testcase goc theo mo ta: chay lai TC019.

## TC087

- Nguon script: `explicit c87`
- Muc tieu: File check: exists security/zero-trust-checklist.md

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC088

- Nguon script: `explicit c88`
- Muc tieu: File check: services/user-service/midlewares/verifyServiceJwt.js (contains: service)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC089

- Nguon script: `explicit c89`
- Muc tieu: File check: security/zero-trust-checklist.md (contains: service-to-service)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC090

- Nguon script: `explicit c90`
- Muc tieu: File check: security/zero-trust-checklist.md (contains: mTLS)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC091

- Nguon script: `explicit c91`
- Muc tieu: Alias: chay lai TC084

Cac buoc thao tac tay tren Postman:

1. Day la testcase alias, khong co request rieng.
2. Thao tac lai dung testcase goc theo mo ta: chay lai TC084.

## TC092

- Nguon script: `explicit c92`
- Muc tieu: API: GET /booking

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /booking: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC093

- Nguon script: `explicit c93`
- Muc tieu: Alias: chay lai TC018

Cac buoc thao tac tay tren Postman:

1. Day la testcase alias, khong co request rieng.
2. Thao tac lai dung testcase goc theo mo ta: chay lai TC018.

## TC094

- Nguon script: `explicit c94`
- Muc tieu: File check: services/ride-service/middlewares/verifyServiceToken.js (contains: allowed)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC095

- Nguon script: `explicit c95`
- Muc tieu: File check: services/payment-service/middlewares/auth.middleware.js (contains: req.user)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC096

- Nguon script: `explicit c96`
- Muc tieu: File check: security/zero-trust-checklist.md (contains: Least privilege)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC097

- Nguon script: `explicit c97`
- Muc tieu: File check: services/driver-service/routes/driver.routes.js (contains: verifyServiceJwt)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC098

- Nguon script: `explicit c98`
- Muc tieu: Alias: chay lai TC085

Cac buoc thao tac tay tren Postman:

1. Day la testcase alias, khong co request rieng.
2. Thao tac lai dung testcase goc theo mo ta: chay lai TC085.

## TC099

- Nguon script: `explicit c99`
- Muc tieu: File check: security/zero-trust-checklist.md (contains: service-to-service)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC100

- Nguon script: `explicit c100`
- Muc tieu: File check: api-gateway/app.js (contains: x-request-id)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC101

- Nguon script: `explicit c101`
- Muc tieu: File check: exists docker-compose.yml

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC102

- Nguon script: `explicit c102`
- Muc tieu: API: GET /health

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /health: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC103

- Nguon script: `explicit c103`
- Muc tieu: File check: docker-compose.yml (contains: DB_) ; docker-compose.yml (contains: DATABASE)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC104

- Nguon script: `explicit c104`
- Muc tieu: File check: docker-compose.yml (contains: postgres)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC105

- Nguon script: `explicit c105`
- Muc tieu: File check: docker-compose.yml (contains: kafka:)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC106

- Nguon script: `explicit c106`
- Muc tieu: File check: exists infra/deployment-checks.md

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC107

- Nguon script: `explicit c107`
- Muc tieu: File check: infra/deployment-checks.md (contains: scale)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC108

- Nguon script: `explicit c108`
- Muc tieu: File check: docker-compose.observability.yml (contains: jaeger)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC109

- Nguon script: `explicit c109`
- Muc tieu: File check: infra/deployment-checks.md (contains: fail fast)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC110

- Nguon script: `explicit c110`
- Muc tieu: File check: infra/deployment-checks.md (contains: Rollback)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC111

- Nguon script: `explicit c111`
- Muc tieu: File check: api-gateway/app.js (contains: x-request-id)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC112

- Nguon script: `explicit c112`
- Muc tieu: File check: exists observability/prometheus.yml

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC113

- Nguon script: `explicit c113`
- Muc tieu: API: GET /metrics

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /metrics: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.

## TC114

- Nguon script: `explicit c114`
- Muc tieu: File check: exists docker-compose.observability.yml

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC115

- Nguon script: `explicit c115`
- Muc tieu: File check: docker-compose.observability.yml (contains: jaeger)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC116

- Nguon script: `explicit c116`
- Muc tieu: File check: exists observability/alert-rules.yml

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC117

- Nguon script: `explicit c117`
- Muc tieu: File check: observability/alert-rules.yml (contains: HighErrorRate)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC118

- Nguon script: `explicit c118`
- Muc tieu: File check: services/ai-matching-service/index.js (contains: model_version)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC119

- Nguon script: `explicit c119`
- Muc tieu: File check: docker-compose.yml (contains: kafka-ui)

Cac buoc thao tac tay tren Postman:

1. Testcase nay khong thuc thi duoc bang request Postman thuan.
2. Neu can doi chieu thu cong, mo file/ha tang duoc neu trong testcase va kiem tra dieu kien ton tai/chuoi.

## TC120

- Nguon script: `explicit c120`
- Muc tieu: API: GET /metrics

Cac buoc thao tac tay tren Postman:

1. Mo Postman va tao request moi.
2. 1. GET /metrics: {}
10. Bam Send va doi chieu status/response voi ky vong trong testcase.
