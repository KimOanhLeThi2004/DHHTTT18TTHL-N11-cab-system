--
-- PostgreSQL database dump for Taxi Booking Review Service
--

-- Tạo bảng reviews nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" SERIAL PRIMARY KEY,
    "booking_id" VARCHAR(255) NOT NULL,
    "reviewer_id" VARCHAR(255) NOT NULL,
    "reviewee_id" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER', 'DRIVER')),
    "rating" INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    "comment" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tạo Index để truy vấn nhanh
CREATE INDEX IF NOT EXISTS "idx_reviews_reviewee_id" ON "reviews" ("reviewee_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_booking_id" ON "reviews" ("booking_id");

--
-- Dữ liệu mẫu (Dumping data for table `reviews`)
--

INSERT INTO "reviews" ("booking_id", "reviewer_id", "reviewee_id", "role", "rating", "comment", "created_at", "updated_at") VALUES
('BK-2023001', 'CUST-001', 'DRV-888', 'CUSTOMER', 5, 'Tài xế rất lịch sự, xe thơm tho.', NOW(), NOW()),
('BK-2023002', 'CUST-002', 'DRV-888', 'CUSTOMER', 4, 'Đi hơi nhanh một chút nhưng vẫn ổn.', NOW(), NOW()),
('BK-2023003', 'DRV-888', 'CUST-001', 'DRIVER', 5, 'Khách hàng đúng giờ, thân thiện.', NOW(), NOW()),
('BK-2023004', 'CUST-005', 'DRV-999', 'CUSTOMER', 2, 'Xe bẩn, thái độ không tốt.', NOW(), NOW()),
('BK-2023005', 'CUST-003', 'DRV-888', 'CUSTOMER', 5, 'Chuyến đi tuyệt vời!', NOW(), NOW());

-- Reset sequence để ID tự tăng tiếp theo không bị lỗi
SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM "reviews"));