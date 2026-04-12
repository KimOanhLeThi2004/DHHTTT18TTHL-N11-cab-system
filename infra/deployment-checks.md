# Deployment Checks (Level 11)

## Basic Deploy
- Build images: `docker compose build`
- Start stack: `docker compose up -d`
- Verify health endpoints on all services return `{"status":"ok"}`.

## Rolling/Restart Simulation
- Restart one service: `docker compose restart booking-service`
- Verify scale operations are documented and tested (`docker compose up --scale booking-service=2`).
- Verify gateway still responds to `/health`.
- Verify booking endpoint recovers after restart.

## Rollback Simulation
- Deploy bad env override intentionally (invalid DB URL).
- Confirm service follows fail fast behavior with explicit log message.
- Revert env and restart to recover.

## Observability Stack
- Start observability overlay:
  - `docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d`
- Verify:
  - Prometheus: `http://localhost:9090`
  - Grafana: `http://localhost:3001`
  - Jaeger: `http://localhost:16686`
