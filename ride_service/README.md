
## 1. cab Booking
`RIDE_SERVICE` là microservice trong hệ thống Cab Booking System, phụ trách xử lý các chức năng liên quan đến **chuyến đi (ride)**.  
Service sử dụng:
- **MongoDB** để lưu trữ dữ liệu (NoSQL)
- **Redis** để cache / hỗ trợ xử lý nhanh (tuỳ thiết kế)
- Triển khai bằng **Docker Compose**

---

## 2. Công nghệ sử dụng
- NodeJS  
- MongoDB  
- Redis  
- Docker & Docker Compose  

---

## 3. Cấu trúc thư mục
```text
RIDE_SERVICE/
├── infra
│   ├── mongo
│   │   └── init.js
│   └── redis
│       └── redis.conf
├── ride_service_module
│   ├── node_modules
│   ├── shared
│   │   └── bus.js
│   ├── src
│   ├── .dockerignore
│   ├── .env
│   ├── body.json
│   ├── Dockerfile
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
├── volume
├── .env
├── docker-compose.ride.yml
├── docker-compose.yml
├── package-lock.json
└── README.md
```
# TEST COMMANDS – RIDE SERVICE

## 1. Kiểm tra container đang chạy
```bash
docker ps
```

#hoặc
```bash
docker compose ps

```

##2. Test MongoDB
##2.1 Ping MongoDB
```bash
docker exec -it <mongo_container_name> mongosh --eval "db.runCommand({ ping: 1 })"
```

#Kết quả mong đợi:
```json
{ "ok" : 1 }
```
##2.2 Kiểm tra log MongoDB
```bash
docker logs --tail 50 <mongo_container_name>
```
##3. Test Redis
##3.1 Ping Redis
```bash
docker exec -it <redis_container_name> redis-cli ping
```

#Kết quả mong đợi:
```text
PONG
```
##3.2 Test set / get Redis
```bash
docker exec -it <redis_container_name> redis-cli set test_key "hello"
docker exec -it <redis_container_name> redis-cli get test_key
```

#Kết quả mong đợi:
```text
hello
```
##4. Test ride_service API
##4.1 Test health endpoint (nếu có)
```bash
curl http://localhost:3000/health
```
##4.2 Test tạo ride bằng file body.json
```bash
curl -X POST http://localhost:3000/api/rides \
  -H "Content-Type: application/json" \
  -d @ride_service_module/body.json
```


