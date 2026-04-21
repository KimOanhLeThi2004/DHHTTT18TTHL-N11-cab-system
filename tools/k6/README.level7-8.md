# k6 Suite For C61-C80

File test:
- `tools/k6/level7_8_suite.js`

Run template:
```bash
k6 run -e BASE_URL=http://localhost:3000 -e CASE_ID=61 tools/k6/level7_8_suite.js
```

Common env (optional):
- `DURATION` default `1m` or `2m` by case
- `RATE` for constant-arrival-rate cases
- `VUS` for fixed-vus cases
- `PRE_ALLOCATED_VUS`, `MAX_VUS` for arrival-rate cases

## Case Mapping
- `61`: 1000 req/s `/booking` load.
- `62`: ETA service under load.
- `63`: Pricing spike load.
- `64`: High booking throughput for Kafka event path.
- `65`: DB pool pressure via concurrent booking.
- `66`: Cache hit observation via repeated idempotent booking.
- `67`: API Gateway rate-limit behavior.
- `68`: P95 latency target check.
- `69`: Peak-hour ramp load.
- `70`: Autoscaling trigger signal load.
- `71`: Driver service down fallback behavior.
- `72`: Pricing timeout retry/fallback behavior.
- `73`: Kafka down buffer/outbox behavior.
- `74`: DB failover behavior.
- `75`: Circuit breaker behavior when downstream unstable.
- `76`: Partial failure handling.
- `77`: Retry exponential backoff check.
- `78`: Service mesh routing fail handling.
- `79`: Network partition handling.
- `80`: Graceful degradation under stress.

## Notes Per Level
- C61-C70:
  Use real load environment. Local docker thường không đạt mốc production.
- C71-C80:
  Nhiều case cần chaos action trước khi chạy test:
  stop service, inject delay/loss, disable broker/db node, mesh fault injection.
- C67:
  Test này sẽ pass khi có `429` xuất hiện.
- C68:
  Threshold `p(95)<300ms` được bật cho `CASE_ID=68`.
- C73/C74/C78/C79:
  Script xác minh hành vi “controlled degradation”, nhưng cần kết hợp monitor/log để kết luận đầy đủ.

## Example Commands
```bash
# C61: booking throughput
k6 run -e CASE_ID=61 -e RATE=1000 -e DURATION=2m tools/k6/level7_8_suite.js

# C62: ETA load, SLA p95<200ms
k6 run -e CASE_ID=62 -e RATE=500 -e DURATION=2m tools/k6/level7_8_suite.js

# C67: verify gateway rate limit (expect some 429)
k6 run -e CASE_ID=67 -e VUS=120 -e DURATION=1m tools/k6/level7_8_suite.js

# C68: latency gate
k6 run -e CASE_ID=68 -e RATE=300 -e DURATION=2m tools/k6/level7_8_suite.js

# C77: retry/backoff logic check
k6 run -e CASE_ID=77 -e VUS=20 -e DURATION=1m tools/k6/level7_8_suite.js
```
