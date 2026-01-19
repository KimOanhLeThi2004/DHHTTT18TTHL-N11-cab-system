#  Taxi Booking System – Microservices Architecture

Hệ thống đặt xe taxi được xây dựng theo kiến trúc **Microservices**, hướng **cloud-native**, hỗ trợ
**real-time**, **event-driven**, **Zero Trust Architecture** và có khả năng mở rộng cao.

---

##  Kiến trúc tổng thể
- Client: ReactJS / NextJS
- Backend: Node.js (ExpressJS)
- Communication: REST API, gRPC, WebSocket
- Event-driven: Kafka / RabbitMQ
- Deployment: Docker, Kubernetes, AWS
- Monitoring & Logging: Prometheus, Grafana, ELK

---

##  Cấu trúc thư mục dự án

```text
taxi-booking-system/
├── docs/                    # Tài liệu phân tích & thiết kế
├── frontend/                # Ứng dụng client (Customer / Driver / Admin)
├── api-gateway/             # API Gateway (Node.js)
├── services/                # Các microservices backend
│   ├── auth-service/        # Xác thực & phân quyền
│   ├── user-service/        # Quản lý người dùng
│   ├── driver-service/      # Quản lý tài xế
│   ├── booking-service/     # Đặt xe
│   ├── ride-service/        # Quản lý chuyến đi
│   ├── payment-service/     # Thanh toán
│   ├── pricing-service/     # Tính giá
│   └── notification-service/# Thông báo
├── events/                  # Kafka / RabbitMQ (event-driven)
├── database/                # Cấu hình database
├── libs/                    # Thư viện dùng chung
├── observability/           # Monitoring & Logging
├── security/                # Zero Trust, RBAC, mTLS
├── infra/                   # Terraform, Kubernetes
├── scripts/                 # Script hỗ trợ
├── docker-compose.yml       # Chạy local
└── README.md
