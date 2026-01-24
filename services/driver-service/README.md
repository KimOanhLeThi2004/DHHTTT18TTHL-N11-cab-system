# Driver Service

Driver Service quan ly thong tin tai xe, trang thai hoat dong, vi tri thoi gian thuc va xu ly su kien theo kien truc microservices + event-driven.

## Cong nghe chinh
- NestJS + TypeScript
- PostgreSQL + TypeORM migrations
- Redis (trang thai/vi tri thoi gian thuc)
- MongoDB (log/lich su)
- Kafka hoac RabbitMQ

## Cau truc thu muc
- `src/drivers`: API CRUD tai xe, online/offline, state, location, offer
- `src/events`: publish/consume su kien, idempotency, retry/DLQ
- `src/redis`: luu trang thai/vi tri thoi gian thuc
- `src/logs`: ghi lich su vao MongoDB
- `src/health`: health check
- `src/database`: TypeORM config + migrations

## Bien moi truong
Sao chep `.env.example` thanh `.env` va dieu chinh:
- Postgres: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Redis: `REDIS_HOST`, `REDIS_PORT`
- Mongo: `MONGO_URI`
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`
- Broker: `BROKER_TYPE` (rabbitmq|kafka) va cac bien tuong ung

## Chay bang Docker Compose
RabbitMQ:
```bash
cd services/driver-service
cp .env.example .env
docker compose --profile rabbitmq up -d
```
Kafka:
```bash
docker compose --profile kafka up -d
```

## Cai dat va chay
```bash
cd services/driver-service
npm install
npm run migration:run
npm run start:dev
```

## API
Tat ca endpoint yeu cau JWT co role `ROLE_DRIVER` va chi duoc tac dong len chinh minh.

- `POST /drivers`
- `GET /drivers/{driverId}`
- `PATCH /drivers/{driverId}`
- `POST /drivers/{driverId}/go-online`
- `POST /drivers/{driverId}/go-offline`
- `PATCH /drivers/{driverId}/state`
- `POST /drivers/{driverId}/location` (rate limit theo env)
- `POST /drivers/{driverId}/offers/{offerId}/accept`
- `POST /drivers/{driverId}/offers/{offerId}/reject`

## Su kien
Publish:
- `DriverCreated`
- `DriverUpdated`
- `DriverOnline`
- `DriverOffline`
- `DriverAvailabilityChanged`
- `DriverAcceptedOffer`
- `DriverRejectedOffer`

Consume:
- `RideOfferCreated`
- `RideStatusChanged`
- `TripStarted`
- `TripEnded`
- `DriverSuspended`

## Health check
- `GET /health`

## Tests
```bash
npm run test
npm run test:unit
npm run test:integration
```

## Ghi chu
- RabbitMQ su dung exchange `driver.events` va DLQ `driver-service.dlq`.
- Kafka su dung topic `driver.events` va DLQ topic `driver.events.dlq`.
