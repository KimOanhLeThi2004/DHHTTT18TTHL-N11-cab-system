# Huong Dan Test Postman - 120 Test Case

- Base URL: `{{baseUrl}}` (vi du: `http://localhost:3000`)
- Header cho API can auth: `Authorization: Bearer {{accessToken}}`
- Body de o dang `raw` + `JSON` trong Postman.

| TC | API | Method | Body |
|---|---|---|---|
| TC001 | /auth/register | POST | {"email":"customer1@test.com","name":"Customer One","password":"123456","phone":"0901000001","role":"CUSTOMER"} |
| TC002 | /auth/register | POST | {"password":"123456","name":"Driver One","phone":"0901000002","email":"driver1@test.com","role":"DRIVER","vehicleType":"CAR"} |
| TC003 | /auth/register | POST | {"email":"admin1@test.com","name":"Admin One","password":"123456","phone":"0901000003","role":"ADMIN"} |
| TC004 | /auth/register | POST | {"email":"bad-email","name":"Invalid Email","password":"123456","role":"CUSTOMER"} |
| TC005 | /auth/register | POST | {"email":"customer2@test.com","name":"Empty Password","password":"","role":"CUSTOMER"} |
| TC006 | /auth/register | POST | {"name":"Missing Email","password":"123456","role":"CUSTOMER"} |
| TC007 | /auth/login | POST | {"email":"customer1@test.com","password":"123456","role":"CUSTOMER"} |
| TC008 | /auth/login | POST | {"email":"driver1@test.com","password":"123456","role":"DRIVER"} |
| TC009 | /auth/login | POST | {"email":"customer1@test.com","password":"wrong-pass","role":"CUSTOMER"} |
| TC010 | /auth/login | POST | {"email":"notfound@test.com","password":"123456","role":"CUSTOMER"} |
| TC011 | /auth/login | POST | {"email":"customer1@test.com","password":"123456","role":"DRIVER"} |
| TC012 | /auth/login | POST | {"email":"","password":"123456","role":"CUSTOMER"} |
| TC013 | /auth/isLogin | GET | {} |
| TC014 | /auth/isLogin | GET | {} |
| TC015 | /auth/logout | POST | {"refreshToken":"{{refreshToken}}"} |
| TC016 | /auth/logout | POST | {"refresh_token":"{{refreshToken}}"} |
| TC017 | /users/me | GET | {} |
| TC018 | /users/me | GET | {} |
| TC019 | /users/me | GET | {} |
| TC020 | /users/me | PUT | {"name":"Nguyen Van A","phone":"0901111111","avatar":"https://example.com/a.png"} |
| TC021 | /users/me | PUT | {"name":"Tran Thi B","phone":"0902222222"} |
| TC022 | /users/me | PUT | {"phone":"0903333333"} |
| TC023 | /users/me | PUT | {"name":"","phone":"0904444444"} |
| TC024 | /users/me | PUT | {"name":"User Update Stress","phone":"0905555555","avatar":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} |
| TC025 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.7769,"lng":106.7009},"pickup":{"lat":10.7626,"lng":106.6602},"durationMin":12,"distanceKm":5} |
| TC026 | /booking | POST | {"vehicleType":"BIKE","dropoff":{"lat":10.7769,"lng":106.7009},"pickup":{"lat":10.7626,"lng":106.6602},"durationMin":6,"distanceKm":2.4} |
| TC027 | /booking | POST | {"requestTime":"2026-04-19T08:30:00.000Z","vehicleType":"CAR","dropoff":{"lat":10.79,"lng":106.68},"pickup":{"lat":10.8,"lng":106.65},"durationMin":18,"distanceKm":7.5} |
| TC028 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.781,"lng":106.69},"pickup":{"lat":10.751,"lng":106.67},"durationMin":0,"distanceKm":0} |
| TC029 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.781,"lng":106.69},"note":"airport trip","pickup":{"lat":10.751,"lng":106.67},"durationMin":35,"distanceKm":20} |
| TC030 | /booking | POST | {"vehicleType":"TRUCK","dropoff":{"lat":10.78,"lng":106.69},"pickup":{"lat":10.77,"lng":106.68},"durationMin":10,"distanceKm":4} |
| TC031 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.78,"lng":106.69},"pickup":{"lat":"abc","lng":106.68},"durationMin":10,"distanceKm":4} |
| TC032 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.78,"lng":106.69},"pickup":{"lat":10.77,"lng":106.68},"durationMin":10,"distanceKm":-1} |
| TC033 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.78,"lng":106.69},"pickup":{"lat":10.77,"lng":106.68},"durationMin":-3,"distanceKm":4} |
| TC034 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.78,"lng":106.69},"durationMin":10,"distanceKm":4} |
| TC035 | /booking | POST | {"vehicleType":"CAR","pickup":{"lat":10.77,"lng":106.68},"durationMin":10,"distanceKm":4} |
| TC036 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.78,"lng":106.69},"pickup":{"lat":10.77,"lng":106.68},"durationMin":10} |
| TC037 | /booking | POST | {"dropoff":{"lat":10.78,"lng":106.69},"pickup":{"lat":10.77,"lng":106.68},"durationMin":10,"distanceKm":4} |
| TC038 | /booking | POST | {"vehicleType":"CAR","dropoff":{"lat":10.78,"lng":106.69},"pickup":{"lat":10.77,"lng":106.68},"durationMin":"12","distanceKm":"5"} |
| TC039 | /booking | POST | {"requestTime":"2026-04-19T17:45:00.000Z","vehicleType":"CAR","dropoff":{"lat":10.7812,"lng":106.7011},"pickup":{"lat":10.769,"lng":106.667},"durationMin":13,"distanceKm":5.2} |
| TC040 | /booking | POST | {"requestTime":"2026-04-19T17:45:00.000Z","vehicleType":"BIKE","dropoff":{"lat":10.7812,"lng":106.7011},"pickup":{"lat":10.769,"lng":106.667},"durationMin":13,"distanceKm":5.2} |
| TC041 | /booking | GET | {} |
| TC042 | /booking | GET | {} |
| TC043 | /booking | GET | {} |
| TC044 | /booking/{{bookingId}}/cancel | PATCH | {} |
| TC045 | /booking/{{bookingId}}/cancel | PATCH | {"reason":"customer_changed_plan"} |
| TC046 | /booking/{{invalidBookingId}}/cancel | PATCH | {} |
| TC047 | /drivers/online | POST | {"vehicleType":"CAR","lng":106.6602,"lat":10.7626,"driverId":"{{driverId}}"} |
| TC048 | /drivers/online | POST | {"vehicleType":"BIKE","lng":106.672,"lat":10.772,"driverId":"{{driverId}}"} |
| TC049 | /drivers/online | POST | {"vehicleType":"CAR","lng":"106.6720","lat":"10.7720","driverId":"{{driverId}}"} |
| TC050 | /drivers/online | POST | {"vehicleType":"CAR","lng":null,"lat":10.772,"driverId":"{{driverId}}"} |
| TC051 | /drivers/online | POST | {"vehicleType":"CAR","lng":106.672,"lat":10.772} |
| TC052 | /drivers/offline | POST | {"driverId":"{{driverId}}"} |
| TC053 | /drivers/offline | POST | {"driverId":"{{driverIdAlt}}"} |
| TC054 | /drivers/offline | POST | {} |
| TC055 | /drivers/nearby?lat=10.7626&lng=106.6602&radiusKm=3&vehicleType=CAR | GET | {} |
| TC056 | /drivers/nearby?lat=10.7626&lng=106.6602&radiusKm=10&vehicleType=BIKE | GET | {} |
| TC057 | /drivers/nearby?lat=bad&lng=106.6602&radiusKm=3&vehicleType=CAR | GET | {} |
| TC058 | /drivers/accept | POST | {"bookingId":"{{bookingId}}"} |
| TC059 | /drivers/accept | POST | {"bookingId":"{{bookingId2}}"} |
| TC060 | /drivers/accept | POST | {} |
| TC061 | /drivers/reject | POST | {"reason":"driver_rejected","bookingId":"{{bookingId}}"} |
| TC062 | /drivers/reject | POST | {"reason":"vehicle_issue","bookingId":"{{bookingId}}"} |
| TC063 | /drivers/me | GET | {} |
| TC064 | /drivers/location/{{driverId}} | GET | {} |
| TC065 | /pricing/calculate | POST | {"duration_min":12,"distance_km":5,"traffic_level":0.4,"demand_index":1,"supply_index":1,"vehicleType":"CAR"} |
| TC066 | /pricing/calculate | POST | {"vehicleType":"BIKE","supplyIndex":1,"durationMin":8,"demandIndex":1.5,"distanceKm":3.2} |
| TC067 | /pricing/calculate | POST | {"vehicleType":"CAR","supplyIndex":1,"durationMin":0,"demandIndex":1,"distanceKm":0} |
| TC068 | /pricing/calculate | POST | {"vehicleType":"PLANE","supplyIndex":1,"durationMin":10,"demandIndex":1,"distanceKm":5} |
| TC069 | /pricing/calculate | POST | {"vehicleType":"CAR","supplyIndex":1,"durationMin":10,"demandIndex":1,"distanceKm":-1} |
| TC070 | /pricing/eta | POST | {"traffic_level":0.5,"distance_km":5} |
| TC071 | /pricing/eta | POST | {"distanceKm":2.5,"trafficLevel":0.2} |
| TC072 | /pricing/eta | POST | {"traffic_level":0.5,"distance_km":-3} |
| TC073 | /ai/eta | POST | {"traffic_level":0.5,"distance_km":5} |
| TC074 | /ai/eta | POST | {"distanceKm":0,"trafficLevel":0.8} |
| TC075 | /ai/eta | POST | {"traffic_level":0.1,"distance_km":-1} |
| TC076 | /ai/fraud | POST | {"location":"HCM","amount":120000,"device_fingerprint":"dev-123","booking_id":"B001","driver_id":"D001","user_id":"U001"} |
| TC077 | /ai/fraud | POST | {"location":"HCM","amount":2000000,"device_fingerprint":"dev-risk","booking_id":"B001","driver_id":"D001","user_id":"U001"} |
| TC078 | /ai/fraud | POST | {"user_id":"U001","amount":50000} |
| TC079 | /ai/recommendations | POST | {"drivers":[{"rating":4.9,"id":"D1","eta":4},{"rating":4.7,"id":"D2","eta":3},{"rating":4.5,"id":"D3","eta":2},{"rating":4.2,"id":"D4","eta":5}]} |
| TC080 | /ai/recommendations | POST | {"drivers":[]} |
| TC081 | /ai/forecast | POST | {"demand_index":1.2} |
| TC082 | /ai/forecast | POST | {"demandIndex":0} |
| TC083 | /ai/agent/select-driver | POST | {"drivers":[{"price":110,"rating":4.5,"id":"D1","eta":8,"distanceKm":3},{"price":130,"rating":4.2,"id":"D2","eta":4,"distanceKm":1}],"strategy":"nearest"} |
| TC084 | /ai/agent/select-driver | POST | {"drivers":[{"price":100,"rating":4.1,"id":"D1","eta":5,"distanceKm":2},{"price":120,"rating":4.9,"id":"D2","eta":8,"distanceKm":4}],"strategy":"rating"} |
| TC085 | /ai/agent/select-driver | POST | {"drivers":[],"strategy":"balanced"} |
| TC086 | /ai/model-info | GET | {} |
| TC087 | /payments/pay | POST | {"bookingId":"{{bookingId}}","method":"CASH","amount":120000} |
| TC088 | /payments/pay | POST | {"bookingId":"{{bookingId}}","method":"CARD","amount":120000} |
| TC089 | /payments/pay | POST | {"bookingId":"{{bookingId}}","amount":120000,"payment_method":"WALLET"} |
| TC090 | /payments/pay | POST | {"bookingId":"{{bookingId}}","method":"CRYPTO","amount":120000} |
| TC091 | /payments/pay | POST | {"bookingId":"{{bookingId}}","method":"CASH","amount":-10} |
| TC092 | /payments/pay | POST | {"method":"CASH","amount":120000} |
| TC093 | /payments/driver/total | GET | {} |
| TC094 | /payments/driver/total | GET | {} |
| TC095 | /reviews | POST | {"bookingId":"{{bookingId}}","comment":"Great trip","rating":5,"userId":"{{userId}}","driverId":"{{driverId}}"} |
| TC096 | /reviews | POST | {"bookingId":"{{bookingId}}","comment":"Average","rating":3,"userId":"{{userId}}","driverId":"{{driverId}}"} |
| TC097 | /reviews | POST | {"bookingId":"{{bookingId}}","comment":"Bad experience","rating":1,"userId":"{{userId}}","driverId":"{{driverId}}"} |
| TC098 | /reviews/driver/{{driverId}} | GET | {} |
| TC099 | /reviews/driver/{{driverIdAlt}} | GET | {} |
| TC100 | /reviews/driver/{{driverId}}/rating | GET | {} |
| TC101 | /notifications | POST | {"message":"Your ride is confirmed","userId":"{{userId}}","title":"Ride Update","type":"SYSTEM","payload":{"bookingId":"{{bookingId}}"}} |
| TC102 | /notifications | POST | {"message":"Driver is arriving","userId":"{{userId}}","title":"ETA","type":"RIDE","payload":{"eta":4}} |
| TC103 | /notifications | POST | {"userId":"{{userId}}","title":"Missing message"} |
| TC104 | /notifications/{{userId}} | GET | {} |
| TC105 | /notifications/{{userIdAlt}} | GET | {} |
| TC106 | /notifications/read/{{notificationId}} | PUT | {} |
| TC107 | /rides/booking/{{bookingId}} | GET | {} |
| TC108 | /rides/booking/{{bookingId2}} | GET | {} |
| TC109 | /rides/booking/{{invalidBookingId}} | GET | {} |
| TC110 | /rides/{{rideId}}/status | PUT | {"status":"ONGOING"} |
| TC111 | /rides/{{rideId}}/status | PUT | {"status":"COMPLETED"} |
| TC112 | /rides/{{rideId}}/status | PUT | {"status":"CANCELLED"} |
| TC113 | /rides/{{rideId}}/status | PUT | {"status":"PENDING"} |
| TC114 | /rides/{{rideId}}/status | PUT | {} |
| TC115 | /health | GET | {} |
| TC116 | /health | GET | {} |
| TC117 | /health | GET | {} |
| TC118 | /metrics | GET | {} |
| TC119 | /metrics | GET | {} |
| TC120 | /metrics | GET | {} |
