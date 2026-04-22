# E2E Postman: User -> Booking -> AI Match -> Driver Accept -> Payment

Kich ban nay dung de test full flow:
1. User dang ky + login
2. Driver dang ky + login + online
3. User tao booking
4. Cho AI matching assign driver
5. Driver accept chuyen
6. User thanh toan

Base URL:
- `{{baseUrl}} = http://192.168.57.101:3000`

## 1) Tao Environment trong Postman

Tao cac bien:
- `baseUrl`
- `userEmail`
- `userPassword`
- `userToken`
- `userId`
- `driverEmail`
- `driverPassword`
- `driverToken`
- `driverId`
- `bookingId`
- `bookingPrice`

Gia tri de xai nhanh:
- `userEmail = customer_e2e_{{$timestamp}}@test.com`
- `userPassword = 123456`
- `driverEmail = driver_e2e_{{$timestamp}}@test.com`
- `driverPassword = 123456`

## 2) User register

- Request: `POST {{baseUrl}}/auth/register`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "email": "{{userEmail}}",
  "password": "{{userPassword}}",
  "role": "CUSTOMER",
  "name": "E2E Customer",
  "phone": "0900000001"
}
```
- Expected:
  - HTTP `201`
  - Co `user_id`

## 3) User login

- Request: `POST {{baseUrl}}/auth/login`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "email": "{{userEmail}}",
  "password": "{{userPassword}}",
  "role": "CUSTOMER"
}
```
- Expected:
  - HTTP `200`
  - Co `access_token`/`token`, `user_id`
- Tests tab (Postman):
```javascript
const body = pm.response.json();
pm.environment.set("userToken", body.access_token || body.accessToken || body.token);
pm.environment.set("userId", body.user_id || body.userId);
```

## 4) Driver register

- Request: `POST {{baseUrl}}/auth/register`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "email": "{{driverEmail}}",
  "password": "{{driverPassword}}",
  "role": "DRIVER",
  "name": "E2E Driver",
  "phone": "0900000002",
  "vehicleType": "CAR"
}
```
- Expected:
  - HTTP `201`
  - Co `user_id` (day la `driverId`)

## 5) Driver login

- Request: `POST {{baseUrl}}/auth/login`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "email": "{{driverEmail}}",
  "password": "{{driverPassword}}",
  "role": "DRIVER"
}
```
- Expected:
  - HTTP `200`
  - Co `access_token`/`token`, `user_id`
- Tests tab:
```javascript
const body = pm.response.json();
pm.environment.set("driverToken", body.access_token || body.accessToken || body.token);
pm.environment.set("driverId", body.user_id || body.userId);
```

## 6) Driver online

- Request: `POST {{baseUrl}}/drivers/online`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "driverId": "{{driverId}}",
  "lat": 10.7601,
  "lng": 106.6601,
  "vehicleType": "CAR"
}
```
- Expected:
  - HTTP `200`
  - Response co `status = "ONLINE"`

## 7) Mo WebSocket de cho AI matching

Trong Postman, tao WebSocket request:
- URL: `ws://192.168.57.101:3000/ws/drivers`

Gui lan 1 (auth driver):
```json
{
  "type": "AUTH",
  "token": "{{driverToken}}"
}
```

Gui lan 2 (cap nhat GPS):
```json
{
  "type": "GPS_UPDATE",
  "lat": 10.7601,
  "lng": 106.6601,
  "vehicleType": "CAR"
}
```

Giu tab WS mo de nhan message `ASSIGN_RIDE`.

## 8) User tao booking

- Request: `POST {{baseUrl}}/booking`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{userToken}}`
  - `Idempotency-Key: e2e-{{$timestamp}}`
- Body:
```json
{
  "pickup": { "lat": 10.7602, "lng": 106.6602 },
  "dropoff": { "lat": 10.7702, "lng": 106.6702 },
  "distanceKm": 5,
  "durationMin": 12,
  "vehicleType": "CAR"
}
```
- Expected:
  - HTTP `201`
  - Co `booking_id`, `price`, `status` (`REQUESTED` hoac `FAILED` neu khong tim thay driver)
- Tests tab:
```javascript
const body = pm.response.json();
pm.environment.set("bookingId", body.booking_id);
pm.environment.set("bookingPrice", body.price);
```

## 9) Cho AI match va xac nhan driver nhan chuyen

Tai tab WebSocket driver, doi message:
```json
{
  "type": "ASSIGN_RIDE",
  "data": {
    "bookingId": "...",
    "driverId": "...",
    "pickup": { "lat": 10.7602, "lng": 106.6602 },
    "dropoff": { "lat": 10.7702, "lng": 106.6702 }
  }
}
```

Dieu kien pass:
- Co message `ASSIGN_RIDE`
- `data.bookingId` trung `{{bookingId}}`
- `data.driverId` trung `{{driverId}}`

Neu khong nhan duoc trong ~30s:
- goi lai `GPS_UPDATE`
- kiem tra `POST /drivers/online` da ONLINE
- tao booking moi gan toa do driver.

## 10) Driver accept chuyen

- Request: `POST {{baseUrl}}/drivers/accept`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{driverToken}}`
- Body:
```json
{
  "bookingId": "{{bookingId}}"
}
```
- Expected:
  - HTTP `200`
  - Response co `message` (thuong la `Accepted successfully`)

## 11) User thanh toan

- Request: `POST {{baseUrl}}/payments/pay`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{userToken}}`
  - `Idempotency-Key: pay-{{$timestamp}}`
- Body:
```json
{
  "bookingId": "{{bookingId}}",
  "method": "CASH",
  "amount": {{bookingPrice}}
}
```
- Expected:
  - HTTP `200`
  - Co `bookingId`, `status = "SUCCESS"`, `amount > 0`
  - Khong bi double charge khi gui lai cung `Idempotency-Key`

## 12) Verify sau cung

### 12.1 User xem booking list
- Request: `GET {{baseUrl}}/booking`
- Headers: `Authorization: Bearer {{userToken}}`
- Expected: booking vua tao ton tai; status ky vong sau accept la `ACCEPTED` (co the tre nhe do event async).

### 12.2 Driver xem profile
- Request: `GET {{baseUrl}}/drivers/me`
- Headers: `Authorization: Bearer {{driverToken}}`
- Expected: HTTP `200`, thong tin driver hop le.

## Troubleshoot nhanh

- `401 Missing token`: quen Authorization header.
- `401 Token expired`: login lai lay token moi.
- `400 Assignment expired or not found` khi `/drivers/accept`:
  - driver accept qua tre (assignment TTL ngan),
  - hoac driver khong phai driver duoc assign.
- Booking ra `FAILED` ngay:
  - he thong dang thay khong co driver online gan pickup.
