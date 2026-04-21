# Postman Automation Tool

This folder provides an automated Postman/Newman test tool for core scenarios discussed in this project:

- Fraud missing required fields -> `400` and no model output
- Expired token on booking -> `401`
- Pricing with `demand_index = 0` -> surge stays `>= 1`, valid price
- Duplicate booking idempotency -> second response reuses first result, no duplicate create
- Large payload (`>1MB`) -> `413` and no booking created
- AI agent selects a valid online driver from Driver Service list
- Driver assignment signal arrives within latency threshold (polled via `/drivers/accept`)

## Files

- `taxi-auto-tests.postman_collection.json`: automated collection
- `taxi-local.postman_environment.json`: local environment defaults
- `run-newman.ps1`: one-command runner

## Run

From repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\postman\run-newman.ps1
```

Custom base URL:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\postman\run-newman.ps1 -BaseUrl "http://192.168.57.101:3000"
```

Custom assignment latency SLO (ms):

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\postman\run-newman.ps1 -AssignMaxLatencyMs 3000
```

## Notes

- The expired-token check is strict only when `-ExpiredToken` is a real expired JWT.  
  Default value `expired_token` still validates rejection (`401`) but may not always return message exactly `"Token expired"`.
- Assignment latency test is automated via `/drivers/accept` polling.  
  This validates assignment propagation timing in backend flow, without requiring WebSocket automation in Newman.
