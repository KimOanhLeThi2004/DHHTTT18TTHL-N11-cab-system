<!--
CODING INSTRUCTION FOR CODEX / AI GENERATORS

IMPORTANT LANGUAGE REQUIREMENT:
- ALL generated outputs (code comments, README.md, inline documentation, API descriptions, error messages, and explanations)
  MUST be written in **VIETNAMESE**.
- DO NOT generate English explanations unless explicitly requested.
- Variable names, function names, class names, and file names MUST remain in English (camelCase / PascalCase).
- Human-readable text (comments, logs, README, docs) MUST be Vietnamese.

If there is any conflict between code clarity and language usage:
- Prioritize clear, correct code
- Use Vietnamese for all explanatory text
-->
# Driver Service – Technical Specification & Implementation Roadmap

## 1. Service Overview
Driver Service is responsible for managing driver-related data and real-time driver state
in the CAB Booking System.  
It follows a **microservices, event-driven, polyglot persistence** architecture.

### Core Responsibilities
- Driver profile & vehicle management
- Driver availability & online/offline state
- Real-time driver location tracking
- Accepting / rejecting ride offers
- Synchronizing driver state with Ride Service
- Publishing and consuming domain events

Driver Service is the **source of truth** for driver status and availability.

---

## 2. Architecture Principles
- Stateless REST/gRPC APIs
- Event-driven communication via message broker
- Polyglot persistence:
  - PostgreSQL: relational, persistent data
  - MongoDB: logs, history, events
  - Redis: real-time state and location
- Zero Trust security with JWT-based authentication
- Idempotent event handling

---

## 3. Data Storage Design

### 3.1 PostgreSQL (Primary Relational Database)
Used for structured, transactional, long-lived data.

#### Tables
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

### 3.2 MongoDB (Logs & History)
Used for flexible, high-write, non-transactional data.

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

### 3.3 Redis (Real-time State Store)
Used for fast-changing, ephemeral data.

#### Key Design
- `driver:status:{driverId}` → ONLINE | OFFLINE
- `driver:state:{driverId}` → AVAILABLE | BUSY | ON_TRIP
- `driver:location:{driverId}` → { lat, lng, updatedAt }
- `driver:last_seen:{driverId}` → timestamp

Redis data is **not** the source of truth and can be reconstructed.

---

## 4. API Design

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
  - Rate-limited (recommended: 1 update / 3–5 seconds)

### 4.4 Ride Offer APIs
- `POST /drivers/{driverId}/offers/{offerId}/accept`
- `POST /drivers/{driverId}/offers/{offerId}/reject`

---

## 5. Event-Driven Communication

### 5.1 Published Events
- `DriverCreated`
- `DriverUpdated`
- `DriverOnline`
- `DriverOffline`
- `DriverAvailabilityChanged`
- `DriverAcceptedOffer`
- `DriverRejectedOffer`

### 5.2 Consumed Events
- `RideOfferCreated`
- `RideStatusChanged`
- `TripStarted`
- `TripEnded`
- `DriverSuspended`

All events must be:
- Versioned
- Idempotent
- JSON-serializable

---

## 6. Core Business Flows

### Flow A: Driver Goes Online
1. Driver calls `go-online`
2. Redis sets `driver:status = ONLINE`
3. Redis sets `driver:state = AVAILABLE`
4. MongoDB logs activity
5. Publish `DriverOnline` event

---

### Flow B: Update Driver Location
1. Driver app sends location
2. Redis updates `driver:location`
3. Redis updates `driver:last_seen`
4. No write to PostgreSQL

---

### Flow C: Ride Offer Acceptance
1. Receive `RideOfferCreated`
2. Push offer to driver (WebSocket / Notification)
3. Driver accepts offer
4. Redis updates `driver:state = BUSY`
5. MongoDB logs acceptance
6. Publish `DriverAcceptedOffer`

---

### Flow D: Ride Completion
1. Receive `RideStatusChanged(COMPLETED)`
2. Redis updates `driver:state = AVAILABLE`
3. MongoDB logs trip completion

---

## 7. Security Requirements
- All endpoints require JWT
- Role-based access control (ROLE_DRIVER)
- Driver can only modify their own data
- Rate limit critical endpoints (location updates)

---

## 8. Reliability & Observability
- Structured logging with correlationId
- Metrics:
  - Active drivers
  - Location updates per minute
  - Offer acceptance rate
- Dead-letter queue for failed events
- Retry with backoff for message consumption

---

## 9. Implementation Roadmap

### Phase 1 – Foundation
- Project setup
- PostgreSQL schema
- Basic driver CRUD APIs

### Phase 2 – Real-time State
- Redis integration
- Online/offline & availability APIs
- Location updates

### Phase 3 – Event Integration
- Message broker setup
- Publish & consume core events
- Idempotent handlers

### Phase 4 – Ride Interaction
- Offer accept/reject flow
- State synchronization with Ride Service

### Phase 5 – Hardening
- Security enforcement
- Rate limiting
- Logging & metrics

---

## 10. Non-Goals
- Pricing logic
- Payment handling
- Ride matching algorithms

These are handled by other services.

---

## 11. Success Criteria
- Driver state remains consistent across services
- Redis failure does not cause data loss
- Event reprocessing does not create duplicated state
- System supports horizontal scaling