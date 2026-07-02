# Kịch bản Phase 7 — Study Materials / Notifications / Settings

> Body mẫu cho 3 module phụ trợ. Base: `/api/v1`.
> **Trước khi chạy:** login → Authorize. (RolesGuard đang tắt nên tài khoản nào cũng gọi được; khi bật lại thì theo cột "Quyền".)

---

## 1. Study Materials (`/study-materials`) — tài liệu học PDF/VIDEO

| Method | Path | Quyền |
| :-- | :-- | :-- |
| POST | `/study-materials` | ADMIN/TEACHER |
| GET | `/study-materials?skillId=&fileType=&page=&limit=&search=` | mọi role |
| GET | `/study-materials/{id}` | mọi role |
| PATCH | `/study-materials/{id}` | ADMIN/TEACHER |
| DELETE | `/study-materials/{id}` | ADMIN/TEACHER (xóa mềm) |

### 1.1. Tạo tài liệu PDF
```json
{
  "title": "Ngữ pháp APTIS - Thì hiện tại đơn",
  "fileUrl": "https://ixloh....supabase.co/storage/v1/object/public/exam-online/documents/grammar-present.pdf",
  "fileType": "PDF",
  "skillId": 1
}
```

### 1.2. Tạo tài liệu VIDEO (có thời lượng)
```json
{
  "title": "Chiến thuật Listening Part 2",
  "fileUrl": "https://youtu.be/xxxx hoặc URL video",
  "fileType": "VIDEO",
  "durationSeconds": 720,
  "skillId": 2
}
```

### 1.3. Cập nhật tài liệu
```json
{ "title": "Ngữ pháp APTIS - Thì hiện tại (bản cập nhật)" }
```

> `fileUrl` hiện là **URL string** (dán link đã có). Upload PDF/VIDEO trực tiếp qua `/files/upload` chưa hỗ trợ (endpoint đó mới nhận ảnh/audio).

---

## 2. Notifications (`/notifications`)

| Method | Path | Quyền |
| :-- | :-- | :-- |
| GET | `/notifications/me?isRead=` | mọi role (của mình + broadcast) |
| PATCH | `/notifications/read-all` | mọi role |
| PATCH | `/notifications/{id}/read` | mọi role (chỉ thông báo riêng) |
| POST | `/notifications` | ADMIN |

### 2.1. Gửi broadcast toàn hệ thống (bỏ `receiverId`)
```json
{
  "notificationType": "SYSTEM",
  "title": "Bảo trì hệ thống",
  "message": "Hệ thống sẽ bảo trì từ 22h-23h hôm nay."
}
```

### 2.2. Gửi riêng cho 1 người (có `receiverId`)
```json
{
  "notificationType": "EXAM_REMINDER",
  "title": "Nhắc lịch thi thử",
  "message": "Bạn có bài thi thử cần hoàn thành trước Chủ nhật.",
  "receiverId": 5
}
```

### 2.3. Ví dụ loại GRADE_RESULT (báo có điểm)
```json
{
  "notificationType": "GRADE_RESULT",
  "title": "Kết quả bài thi",
  "message": "Bài thi thử của bạn đã được chấm xong.",
  "receiverId": 5
}
```

> `notificationType` ∈ `SYSTEM` | `EXAM_REMINDER` | `GRADE_RESULT`.
> `GET /notifications/me?isRead=false` → chỉ lấy thông báo chưa đọc.
> Thông báo **broadcast** (`receiverId` null) dùng chung 1 dòng nên **không đánh dấu đọc riêng từng người** được (giới hạn thiết kế tối giản); `read-all` chỉ áp dụng thông báo gửi riêng.

---

## 3. Settings (`/settings`) — cấu hình hệ thống (ADMIN)

| Method | Path | Quyền |
| :-- | :-- | :-- |
| GET | `/settings` | ADMIN |
| PATCH | `/settings/{key}` | ADMIN (upsert) |

Các key seed sẵn (thời gian mock test, phút): `MOCK_TEST_DURATION_GRAMMAR` (25), `MOCK_TEST_DURATION_LISTENING` (30), `MOCK_TEST_DURATION_READING` (30), `MOCK_TEST_DURATION_WRITING` (30), `MOCK_TEST_DURATION_SPEAKING` (15).

### 3.1. Đổi thời gian Listening mock → 35 phút
`PATCH /settings/MOCK_TEST_DURATION_LISTENING`
```json
{ "settingValue": "35" }
```

### 3.2. Thêm key mới (upsert tự tạo nếu chưa có)
`PATCH /settings/SUPPORT_EMAIL`
```json
{ "settingValue": "support@exam-online.vn" }
```

---

## 4. Kịch bản nhanh (end-to-end)

1. **ADMIN** đăng nhập → `POST /notifications` gửi broadcast (2.1).
2. **STUDENT** đăng nhập → `GET /notifications/me` → thấy thông báo broadcast.
3. TEACHER → `POST /study-materials` tạo tài liệu (1.1) → STUDENT `GET /study-materials?skillId=1` thấy tài liệu.
4. ADMIN → `GET /settings` xem cấu hình → `PATCH /settings/MOCK_TEST_DURATION_LISTENING` đổi 35 (3.1) → tạo MOCK_TEST mới thấy Listening = 35 phút.

---

## Lỗi hay gặp
- `notificationType phải là SYSTEM | EXAM_REMINDER | GRADE_RESULT` — sai enum.
- `fileType phải là PDF | VIDEO` — sai enum.
- Study material: `title` / `fileUrl` trống → 400.
- `settingValue không được để trống` — PATCH settings thiếu body.
