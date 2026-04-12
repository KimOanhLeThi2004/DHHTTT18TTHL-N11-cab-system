# Taxi Booking Microservices

Microservice-based taxi booking platform with API Gateway, event-driven matching, and realtime updates.

## 1. System overview

Main entrypoint for client apps is `api-gateway` (`http://localhost:3000`).

| Service | Port | Main responsibility |
|---|---:|---|
| `api-gateway` | 3000 | Public API, routing/proxy, auth introspection, service-token forwarding |
| `auth-service` | 3001 | Register/login/logout, user JWT issuance, refresh token |
| `user-service` | 3002 | Customer profile |
| `pricing-service` | 3003 | Pricing + ETA model |
| `booking-service` | 3004 | Booking lifecycle, cancellation, emit booking events |
| `driver-service` | 3005 | Driver profile, online/offline state, accept/reject assignment |
| `payment-service` | 3006 | Payment and driver revenue |
| `ride-service` | 3007 | Ride aggregate/status |
| `notification-service` | 3008 | Notification storage + websocket push |
| `review-service` | 3009 | Review and driver rating |
| `ai-matching-service` | 3010 | Driver matching and AI endpoints |

## 2. Repository structure

```text
taxi-booking-microservices/
|- api-gateway/
|- cab-ui/
|- services/
|  |- auth-service/
|  |- user-service/
|  |- pricing-service/
|  |- booking-service/
|  |- driver-service/
|  |- payment-service/
|  |- ride-service/
|  |- notification-service/
|  |- review-service/
|  |- ai-matching-service/
|- docs/
|  |- openapi.yaml
|- database/
|- events/
|- infra/
|- observability/
|- security/
|- docker-compose.yml
```

## 3. Swagger / OpenAPI

Full API spec is at:

- `docs/openapi.yaml`

Quick usage:

1. Open `https://editor.swagger.io/`
2. Import `docs/openapi.yaml`
3. Switch `servers` between gateway/internal service URLs when testing.

## 4. Core flows

### 4.1 Register and login

1. Client calls `POST /auth/register` (gateway -> auth-service).
2. `auth-service` creates credentials.
3. For `CUSTOMER`, auth-service calls `user-service POST /users` with service JWT.
4. For `DRIVER`, auth-service calls `driver-service POST /drivers` with service JWT.
5. Client logs in via `POST /auth/login` and receives access + refresh token.

### 4.2 Booking and matching

1. Client calls `POST /booking` with Bearer user token.
2. Gateway calculates price via pricing-service and creates booking in booking-service.
3. booking-service emits events: `ride_events` and `BOOKING_CREATED`.
4. ai-matching-service consumes booking events, chooses driver, emits `driver.assigned.requested`.
5. driver-service consumes assignment event and notifies driver.
6. Driver accepts via `POST /drivers/accept`.
7. booking-service consumes `driver.accepted`, updates booking, emits `booking.confirmed`.
8. ride-service consumes `booking.confirmed`, enriches user/driver info, creates ride.

### 4.3 Tracking and notifications

1. Driver updates location over driver websocket.
2. driver-service publishes `driver.location.updated`.
3. notification-service consumes and pushes `DRIVER_LOCATION` to customer websocket.
4. Client can query ride details via `GET /rides/booking/{bookingId}`.

### 4.4 Payment and review

1. Customer pays via `POST /payments/pay`.
2. payment-service reads ride info from ride-service, creates payment.
3. payment-service emits `payment.success`.
4. Customer posts review via `POST /reviews`.

### 4.5 Cancel booking

Customer can cancel via `PATCH /booking/{bookingId}/cancel` only when booking status is:

- `REQUESTED`
- `CONFIRMED`

If driver already accepted, booking-service returns conflict (`409`).

## 5. Service-to-service communication map

### 5.1 HTTP calls

| Source | Target | Endpoint | Auth |
|---|---|---|---|
| api-gateway | auth-service | `GET /auth/isLogin` | User JWT |
| api-gateway | booking-service | `/bookings*` | User JWT |
| api-gateway | pricing-service | `/pricing/*` | Service JWT |
| api-gateway | ride-service | `/rides/*` | Service JWT |
| api-gateway | driver-service | `/drivers/*` | User JWT or none (by route) |
| auth-service | user-service | `POST /users` | Service JWT |
| auth-service | driver-service | `POST /drivers` | Service JWT |
| ride-service | user-service | `GET /users/{id}` | Service JWT |
| ride-service | driver-service | `GET /drivers/{id}` | Service JWT |
| payment-service | ride-service | `GET /rides/booking/{bookingId}` | Service JWT |

### 5.2 Kafka topics

| Topic | Producer | Consumer(s) | Purpose |
|---|---|---|---|
| `BOOKING_CREATED` | booking-service | ai-matching-service | Trigger driver matching |
| `ride_events` | booking-service | ai-matching-service | Unified booking events |
| `driver.assigned.requested` | ai-matching-service | driver-service | Driver assignment |
| `driver.accepted` | driver-service | booking-service | Confirm assignment |
| `driver.rejected` | driver-service | (flow handlers) | Retry/reassignment |
| `booking.confirmed` | booking-service | ride-service | Create ride aggregate |
| `ride.status.changed` | ride-service | notification-service | Push ride updates |
| `payment.success` | payment-service | notification-service | Push payment success |
| `driver.location.updated` | driver-service | notification-service | Push driver tracking |
| `BOOKING_CANCELLED` | booking-service | driver-service | Cleanup pending assignments |

## 6. JWT strategy (sign/verify)

### 6.1 User access JWT

- Signed by `auth-service` at login (`jwt.sign`) with `JWT_SECRET`.
- Contains `sub/userId`, `role`, `jti`.
- Verified by user-auth middlewares in:
  - booking-service
  - user-service
  - driver-service (`userIdJWT`)
  - payment-service
  - notification-service websocket

Services verify with fallback secret list:

- `JWT_SECRET`
- `JWT_SECRETKEY`
- `ACCESS_JWT_SECRET`

### 6.2 Internal service JWT

Signed by:

- api-gateway (`middlewares/pricing.middleware.js`)
- auth-service (`middlewares/signServiceJwt.js`)
- ride-service (`kafka/bookingConfirmed.consumer.js`)
- payment-service (`controllers/payment.controller.js`)

Verified by:

- pricing-service (`middlewares/verifyServiceToken.js`)
- ride-service (`middlewares/verifyServiceToken.js`)
- user-service (`midlewares/verifyServiceJwt.js`)
- driver-service (`middlewares/verifyServiceJwt.js`)

Internal secret precedence used in code:

- `INTERNAL_JWT_SECRET`
- `SERVICE_JWT_SECRET`

Recommended env convention:

- `JWT_SECRET` for user tokens (must be identical across services verifying user JWT)
- `INTERNAL_JWT_SECRET` for service tokens
- Optionally set `SERVICE_JWT_SECRET` equal to `INTERNAL_JWT_SECRET` for compatibility

## 7. Realtime channels

- Driver websocket: `ws://localhost:3005`
- Notification websocket: `ws://localhost:3008?token=<access_token>`

## 8. Run with Docker

```bash
docker compose up --build
```

Then open:

- Gateway health: `http://localhost:3000/health`
- OpenAPI file in repo: `docs/openapi.yaml`
