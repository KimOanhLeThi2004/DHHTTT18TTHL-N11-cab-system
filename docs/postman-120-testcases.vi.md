# Huong Dan Test Postman - 120 Test Case (Khop run_120_testcases.py)

- Tai lieu nay duoc canh chinh theo dung logic trong `run_120_testcases.py` (vong lap `for cid in range(1, 121)`).
- Luu y: khong phai tat ca testcase deu la request Postman; co testcase la alias, simulated, hoac kiem tra file/cau hinh.

| TC | Nguon trong script | Hanh vi kiem thu thuc te | Body de test |
|---|---|---|---|
| TC001 | explicit c1 | API: POST /auth/register | 1. POST /auth/register: {"email": ctx.email, "password": ctx.password, "name": "Test User", "role": "CUSTOMER"} |
| TC002 | explicit c2 | API: POST /auth/login | 1. POST /auth/login: {"email": ctx.email, "password": ctx.password, "role": "CUSTOMER"} |
| TC003 | explicit c3 | API: POST /booking | 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 5, "durationMin": 10, "vehicleType": "CAR"} |
| TC004 | explicit c4 | API: GET /booking | 1. GET /booking: {} |
| TC005 | explicit c5 | API: POST /drivers/online | 1. POST /drivers/online: {"driverId": "DRV001", "lat": 10.76, "lng": 106.66, "vehicleType": "CAR"} |
| TC006 | explicit c6 | API: GET /booking | 1. GET /booking: {} |
| TC007 | explicit c7 | API: POST /ai/eta | 1. POST /ai/eta: {"distance_km": 5, "traffic_level": 0.5} |
| TC008 | explicit c8 | API: POST /pricing/calculate | 1. POST /pricing/calculate: {"distance_km": 5, "vehicleType": "CAR", "demand_index": 1} |
| TC009 | explicit c9 | API: POST /notifications | 1. POST /notifications: {"userId": ctx.user_id or "USR123", "message": "Your ride is confirmed"} |
| TC010 | explicit c10 | API: POST /auth/logout ; GET /booking ; POST /auth/login | 1. POST /auth/logout: {"refreshToken": ctx.refresh}<br>2. GET /booking: {}<br>3. POST /auth/login: {"email": ctx.email, "password": ctx.password, "role": "CUSTOMER"} |
| TC011 | explicit c11 | API: POST /booking | 1. POST /booking: {"dropoff": {"lat": 10.77, "lng": 106.7}, "distanceKm": 5, "vehicleType": "CAR"} |
| TC012 | explicit c12 | API: POST /booking | 1. POST /booking: {"pickup": {"lat": "abc", "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.7}, "distanceKm": 5, "vehicleType": "CAR"} |
| TC013 | explicit c13 | API: POST /ai/agent/select-driver | 1. POST /ai/agent/select-driver: {"drivers": []} |
| TC014 | explicit c14 | API: POST /payments/pay | 1. POST /payments/pay: {"bookingId": ctx.booking_id or "BK0", "payment_method": "invalid_card", "amount": 100000} |
| TC015 | explicit c15 | API: POST /ai/eta | 1. POST /ai/eta: {"distance_km": 0} |
| TC016 | explicit c16 | API: POST /pricing/calculate | 1. POST /pricing/calculate: {"distance_km": 5, "demand_index": 0, "supply_index": 1, "vehicleType": "CAR"} |
| TC017 | explicit c17 | API: POST /ai/fraud | 1. POST /ai/fraud: {"user_id": "USR123"} |
| TC018 | explicit c18 | API: GET /booking | 1. GET /booking: {} |
| TC019 | explicit c19 | API: POST /booking ; POST /booking | 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 5, "durationMin": 10, "vehicleType": "CAR"}<br>2. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 5, "durationMin": 10, "vehicleType": "CAR"} |
| TC020 | explicit c20 | API: POST /booking | 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 5, "durationMin": 10, "vehicleType": "CAR", "note": huge} |
| TC021 | explicit c21 | API: POST /booking | 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 4, "durationMin": 8, "vehicleType": "CAR"} |
| TC022 | explicit c22 | API: POST /booking | 1. POST /booking: {"pickup": {"lat": 10.76, "lng": 106.66}, "dropoff": {"lat": 10.77, "lng": 106.70}, "distanceKm": 3, "durationMin": 7, "vehicleType": "CAR"} |
| TC023 | explicit c23 | API: POST /ai/agent/select-driver | 1. POST /ai/agent/select-driver: {"drivers": [{"id": "D1", "distanceKm": 2, "rating": 4.8, "eta": 6, "price": 100}, {"id": "D2", "distanceKm": 1, "rating": 4.5, "eta": 4, "price": 120}]} |
| TC024 | explicit c24 | API: POST /payments/pay ; POST /notifications | 1. POST /payments/pay: {"bookingId": ctx.booking_id or "BK0", "method": "CASH", "amount": 120000}<br>2. POST /notifications: {"userId": ctx.user_id or "USR123", "message": "Payment initialized"} |
| TC025 | explicit c25 | File check: services/booking-service/services/booking.service.js (contains: ride_requested) | N/A (file/config check) |
| TC026 | explicit c26 | API: GET /notifications/{ctx.user_id or 'USR123'} | 1. GET /notifications/{ctx.user_id or 'USR123'}: {} |
| TC027 | explicit c27 | File check: services/booking-service/driverAssignedConsumer.js (contains: ACCEPTED) | N/A (file/config check) |
| TC028 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC029 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC030 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC031 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC032 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC033 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC034 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC035 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC036 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC037 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC038 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC039 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC040 | simulated range (28-40) | Simulated integration/saga: yeu cau ton tai 3 file `services/booking-service/services/booking.service.js`, `services/ride-service/kafka/bookingConfirmed.consumer.js`, `services/payment-service/controllers/payment.controller.js` | N/A (khong gui body HTTP truc tiep) |
| TC041 | explicit c41 | API: POST /ai/eta | 1. POST /ai/eta: {"distance_km": 5, "traffic_level": 0.7} |
| TC042 | explicit c42 | API: POST /pricing/calculate | 1. POST /pricing/calculate: {"distance_km": 5, "demand_index": 2.5, "supply_index": 1, "vehicleType": "CAR"} |
| TC043 | explicit c43 | API: POST /ai/fraud | 1. POST /ai/fraud: {"user_id": "USR", "driver_id": "DRV", "booking_id": "BK", "amount": 2000000, "location": "HCM", "device_fingerprint": "abc"} |
| TC044 | explicit c44 | API: POST /ai/recommendations | 1. POST /ai/recommendations: {"drivers": [{"id": "D1", "rating": 4.6}, {"id": "D2", "rating": 4.9}, {"id": "D3", "rating": 4.7}, {"id": "D4", "rating": 4.2}]} |
| TC045 | explicit c45 | API: POST /ai/forecast | 1. POST /ai/forecast: {"demand_index": 1.2} |
| TC046 | explicit c46 | API: GET /ai/model-info | 1. GET /ai/model-info: {} |
| TC047 | explicit c47 | API: POST /ai/eta | 1. POST /ai/eta: {"distance_km": 4, "traffic_level": 0.4} |
| TC048 | simulated range (48-60) | Simulated AI agent: yeu cau `services/ai-matching-service/index.js` ton tai va chua chuoi `select-driver` | N/A (khong gui body HTTP truc tiep) |
| TC049 | explicit c49 | API: POST /ai/agent/select-driver | 1. POST /ai/agent/select-driver: {"drivers": []} |
| TC050 | explicit c50 | API: POST /ai/eta | 1. POST /ai/eta: {"distance_km": -1} |
| TC051 | explicit c51 | API: POST /ai/agent/select-driver | 1. POST /ai/agent/select-driver: {"strategy": "nearest", "drivers": [{"id": "D1", "distanceKm": 3}, {"id": "D2", "distanceKm": 1}]} |
| TC052 | explicit c52 | API: POST /ai/agent/select-driver | 1. POST /ai/agent/select-driver: {"strategy": "rating", "drivers": [{"id": "D1", "rating": 4.2}, {"id": "D2", "rating": 4.9}]} |
| TC053 | explicit c53 | API: POST /ai/agent/select-driver | 1. POST /ai/agent/select-driver: {"strategy": "balanced", "drivers": [{"id": "D1", "rating": 4.8, "eta": 7, "price": 100}, {"id": "D2", "rating": 4.5, "eta": 4, "price": 120}]} |
| TC054 | simulated range (48-60) | Simulated AI agent: yeu cau `services/ai-matching-service/index.js` ton tai va chua chuoi `select-driver` | N/A (khong gui body HTTP truc tiep) |
| TC055 | simulated range (48-60) | Simulated AI agent: yeu cau `services/ai-matching-service/index.js` ton tai va chua chuoi `select-driver` | N/A (khong gui body HTTP truc tiep) |
| TC056 | simulated range (48-60) | Simulated AI agent: yeu cau `services/ai-matching-service/index.js` ton tai va chua chuoi `select-driver` | N/A (khong gui body HTTP truc tiep) |
| TC057 | explicit c57 | API: POST /ai/agent/select-driver | 1. POST /ai/agent/select-driver: {"strategy": "nearest", "drivers": [{"id": "D1", "distanceKm": 1, "status": "OFFLINE"}]} |
| TC058 | explicit c58 | API: POST /ai/agent/select-driver | 1. POST /ai/agent/select-driver: {"drivers": [{"id": "D1", "distanceKm": 1}]} |
| TC059 | explicit c59 | API: POST /ai/eta | 1. POST /ai/eta: {"distance_km": 2, "traffic_level": 0.2} |
| TC060 | explicit c60 | Alias: chay lai TC049 | Giong body cua TC049 |
| TC061 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC062 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC063 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC064 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC065 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC066 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC067 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC068 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC069 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC070 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC071 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC072 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC073 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC074 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC075 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC076 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC077 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC078 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC079 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC080 | simulated range (61-80) | Simulated performance/resilience: yeu cau `docker-compose.yml`, `observability/prometheus.yml` ton tai va `api-gateway/routes/booking.route.js` chua `withRetry` | N/A (khong gui body HTTP truc tiep) |
| TC081 | explicit c81 | API: POST /auth/login | 1. POST /auth/login: {"email": "' OR 1=1 --", "password": "x", "role": "CUSTOMER"} |
| TC082 | explicit c82 | API: POST /notifications | 1. POST /notifications: {"userId": ctx.user_id or "USR", "message": "<script>alert(1)</script>"} |
| TC083 | explicit c83 | API: GET /booking | 1. GET /booking: {} |
| TC084 | explicit c84 | API: GET /booking | 1. GET /booking: {} |
| TC085 | explicit c85 | API: GET /health | 1. GET /health: {} |
| TC086 | explicit c86 | Alias: chay lai TC019 | Giong body cua TC019 |
| TC087 | explicit c87 | File check: exists security/zero-trust-checklist.md | N/A (file/config check) |
| TC088 | explicit c88 | File check: services/user-service/midlewares/verifyServiceJwt.js (contains: service) | N/A (file/config check) |
| TC089 | explicit c89 | File check: security/zero-trust-checklist.md (contains: service-to-service) | N/A (file/config check) |
| TC090 | explicit c90 | File check: security/zero-trust-checklist.md (contains: mTLS) | N/A (file/config check) |
| TC091 | explicit c91 | Alias: chay lai TC084 | Giong body cua TC084 |
| TC092 | explicit c92 | API: GET /booking | 1. GET /booking: {} |
| TC093 | explicit c93 | Alias: chay lai TC018 | Giong body cua TC018 |
| TC094 | explicit c94 | File check: services/ride-service/middlewares/verifyServiceToken.js (contains: allowed) | N/A (file/config check) |
| TC095 | explicit c95 | File check: services/payment-service/middlewares/auth.middleware.js (contains: req.user) | N/A (file/config check) |
| TC096 | explicit c96 | File check: security/zero-trust-checklist.md (contains: Least privilege) | N/A (file/config check) |
| TC097 | explicit c97 | File check: services/driver-service/routes/driver.routes.js (contains: verifyServiceJwt) | N/A (file/config check) |
| TC098 | explicit c98 | Alias: chay lai TC085 | Giong body cua TC085 |
| TC099 | explicit c99 | File check: security/zero-trust-checklist.md (contains: service-to-service) | N/A (file/config check) |
| TC100 | explicit c100 | File check: api-gateway/app.js (contains: x-request-id) | N/A (file/config check) |
| TC101 | explicit c101 | File check: exists docker-compose.yml | N/A (file/config check) |
| TC102 | explicit c102 | API: GET /health | 1. GET /health: {} |
| TC103 | explicit c103 | File check: docker-compose.yml (contains: DB_) ; docker-compose.yml (contains: DATABASE) | N/A (file/config check) |
| TC104 | explicit c104 | File check: docker-compose.yml (contains: postgres) | N/A (file/config check) |
| TC105 | explicit c105 | File check: docker-compose.yml (contains: kafka:) | N/A (file/config check) |
| TC106 | explicit c106 | File check: exists infra/deployment-checks.md | N/A (file/config check) |
| TC107 | explicit c107 | File check: infra/deployment-checks.md (contains: scale) | N/A (file/config check) |
| TC108 | explicit c108 | File check: docker-compose.observability.yml (contains: jaeger) | N/A (file/config check) |
| TC109 | explicit c109 | File check: infra/deployment-checks.md (contains: fail fast) | N/A (file/config check) |
| TC110 | explicit c110 | File check: infra/deployment-checks.md (contains: Rollback) | N/A (file/config check) |
| TC111 | explicit c111 | File check: api-gateway/app.js (contains: x-request-id) | N/A (file/config check) |
| TC112 | explicit c112 | File check: exists observability/prometheus.yml | N/A (file/config check) |
| TC113 | explicit c113 | API: GET /metrics | 1. GET /metrics: {} |
| TC114 | explicit c114 | File check: exists docker-compose.observability.yml | N/A (file/config check) |
| TC115 | explicit c115 | File check: docker-compose.observability.yml (contains: jaeger) | N/A (file/config check) |
| TC116 | explicit c116 | File check: exists observability/alert-rules.yml | N/A (file/config check) |
| TC117 | explicit c117 | File check: observability/alert-rules.yml (contains: HighErrorRate) | N/A (file/config check) |
| TC118 | explicit c118 | File check: services/ai-matching-service/index.js (contains: model_version) | N/A (file/config check) |
| TC119 | explicit c119 | File check: docker-compose.yml (contains: kafka-ui) | N/A (file/config check) |
| TC120 | explicit c120 | API: GET /metrics | 1. GET /metrics: {} |
