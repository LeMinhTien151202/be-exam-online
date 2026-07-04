# FE Phase 7 — Study Materials, Notifications, Settings

> Nền tảng chung: base `/api/v1`; response bọc `{ code, success, message, messages, data, metaData }` (đọc `data`); header `Authorization: Bearer <access_token>`.
> Body thêm: [PHASE7_SAMPLES.md](PHASE7_SAMPLES.md).

---

# A. Study Materials (tài liệu học PDF/VIDEO)

## A1. Danh sách — `GET /study-materials`
Query: `?skillId=&fileType=&search=&page=1&limit=10`. Mọi role xem được.

**Response** (phân trang):
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy danh sách tài liệu thành công",
  "messages": [],
  "data": [
    {
      "id": 1,
      "title": "Ngữ pháp APTIS - Thì hiện tại đơn",
      "fileUrl": "https://.../grammar.pdf",
      "fileType": "PDF",
      "durationSeconds": null,
      "skillId": 1,
      "teacherId": 2,
      "deletedAt": null,
      "skill": { "id": 1, "name": "Grammar & Vocabulary", "totalParts": 2 }
    }
  ],
  "metaData": { "page": 1, "pageSize": 10, "total": 3, "totalPage": 1 }
}
```

## A2. Chi tiết — `GET /study-materials/{id}`
**Response `data`:** 1 object như phần tử trong mảng A1 (kèm `skill`).

## A3. Tạo — `POST /study-materials` (ADMIN/TEACHER)
`fileUrl` là URL đã có (dán link). `fileType` ∈ `PDF | VIDEO`. `durationSeconds` chỉ cho VIDEO.

**Request:**
```json
{ "title": "Chiến thuật Listening P2", "fileUrl": "https://.../video.mp4", "fileType": "VIDEO", "durationSeconds": 720, "skillId": 2 }
```
**Response:**
```json
{
  "code": 201,
  "success": true,
  "message": "Tạo tài liệu thành công",
  "messages": [],
  "data": {
    "id": 4,
    "title": "Chiến thuật Listening P2",
    "fileUrl": "https://.../video.mp4",
    "fileType": "VIDEO",
    "durationSeconds": 720,
    "skillId": 2,
    "teacherId": 2,
    "deletedAt": null
  },
  "metaData": null
}
```

## A4. Sửa — `PATCH /study-materials/{id}` (ADMIN/TEACHER)
Chỉ gửi field cần đổi.
**Request:**
```json
{ "title": "Chiến thuật Listening P2 (cập nhật)" }
```
**Response `data`:** tài liệu sau cập nhật.

## A5. Xóa mềm — `DELETE /study-materials/{id}` (ADMIN/TEACHER)
Không body. **Response `data`:** `{ "message": "Đã xóa tài liệu" }`.

---

# B. Notifications

## B0. ADMIN — tất cả thông báo (quản lý) — `GET /notifications`
Query: `?page=1&limit=10&notificationType=&isRead=&audience=&receiverId=&search=`.
- `audience` ∈ `all` (mặc định) | `broadcast` (gửi mọi người) | `personal` (gửi riêng).
- `receiverId` = lọc theo 1 người nhận cụ thể.

**Response** (phân trang, kèm `receiver`):
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy danh sách thông báo thành công",
  "messages": [],
  "data": [
    {
      "id": 9,
      "receiverId": 5,
      "notificationType": "GRADE_RESULT",
      "title": "Kết quả bài thi",
      "message": "Bài thi thử của bạn đã được chấm xong.",
      "isRead": false,
      "createdAt": "2026-07-02T09:30:00.000Z",
      "receiver": { "id": 5, "email": "student@test.com" }
    },
    {
      "id": 8,
      "receiverId": null,
      "notificationType": "SYSTEM",
      "title": "Bảo trì hệ thống",
      "message": "Hệ thống bảo trì 22h-23h hôm nay.",
      "isRead": false,
      "createdAt": "2026-07-02T09:00:00.000Z",
      "receiver": null
    }
  ],
  "metaData": { "page": 1, "pageSize": 10, "total": 27, "totalPage": 3 }
}
```
> `receiver: null` = broadcast. Dùng cho trang quản trị thông báo (lọc + phân trang).

## B1. Của tôi — `GET /notifications/me`
Query: `?page=1&limit=10&isRead=` (`isRead` bỏ trống = tất cả). Trả thông báo gửi riêng cho tôi **+ broadcast** (`receiverId: null`), **có phân trang**.

**Response `data`:**
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy thông báo thành công",
  "messages": [],
  "data": [
    {
      "id": 9,
      "receiverId": 5,
      "notificationType": "GRADE_RESULT",
      "title": "Kết quả bài thi",
      "message": "Bài thi thử của bạn đã được chấm xong.",
      "isRead": false,
      "createdAt": "2026-07-02T09:30:00.000Z"
    },
    {
      "id": 8,
      "receiverId": null,
      "notificationType": "SYSTEM",
      "title": "Bảo trì hệ thống",
      "message": "Hệ thống bảo trì 22h-23h hôm nay.",
      "isRead": false,
      "createdAt": "2026-07-02T09:00:00.000Z"
    }
  ],
  "metaData": { "page": 1, "pageSize": 10, "total": 5, "totalPage": 1 }
}
```
> `receiverId: null` = broadcast (gửi mọi người). Badge "chưa đọc": gọi `?isRead=false` xem `metaData.total`.

## B2. Đánh dấu đã đọc 1 cái — `PATCH /notifications/{id}/read`
Không body.
**Response `data`:**
```json
{ "id": 9, "message": "Đã đánh dấu đã đọc" }
```

Với broadcast (receiverId null) → không đánh dấu riêng được, trả:
```json
{ "id": 8, "message": "Thông báo broadcast hoặc không thuộc bạn — không đánh dấu riêng được" }
```

## B3. Đọc tất cả — `PATCH /notifications/read-all`
Không body. **Response `data`:**
```json
{ "updated": 3 }
```
> Chỉ áp dụng thông báo gửi riêng (`updated` = số dòng vừa đánh dấu).

## B4. Gửi thông báo — `POST /notifications` (ADMIN)
Broadcast: bỏ `receiverId`. Gửi riêng: có `receiverId`. `notificationType` ∈ `SYSTEM | EXAM_REMINDER | GRADE_RESULT`.

**Request (broadcast):**
```json
{ "notificationType": "SYSTEM", "title": "Bảo trì hệ thống", "message": "Hệ thống bảo trì 22h-23h hôm nay." }
```
**Request (gửi riêng):**
```json
{ "notificationType": "EXAM_REMINDER", "title": "Nhắc lịch thi", "message": "Bạn có bài thi thử cần hoàn thành.", "receiverId": 5 }
```
**Response:**
```json
{
  "code": 201,
  "success": true,
  "message": "Gửi thông báo thành công",
  "messages": [],
  "data": {
    "id": 10,
    "receiverId": null,
    "notificationType": "SYSTEM",
    "title": "Bảo trì hệ thống",
    "message": "Hệ thống bảo trì 22h-23h hôm nay.",
    "isRead": false,
    "createdAt": "2026-07-02T10:00:00.000Z"
  },
  "metaData": null
}
```

---

# C. Settings (ADMIN)

## C1. Toàn bộ cấu hình — `GET /settings`
**Response `data`:**
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy cấu hình thành công",
  "messages": [],
  "data": [
    { "settingKey": "MOCK_TEST_DURATION_GRAMMAR", "settingValue": "25" },
    { "settingKey": "MOCK_TEST_DURATION_LISTENING", "settingValue": "30" },
    { "settingKey": "MOCK_TEST_DURATION_READING", "settingValue": "30" },
    { "settingKey": "MOCK_TEST_DURATION_WRITING", "settingValue": "30" },
    { "settingKey": "MOCK_TEST_DURATION_SPEAKING", "settingValue": "15" }
  ],
  "metaData": null
}
```

## C2. Sửa 1 cấu hình — `PATCH /settings/{key}`
Upsert — tự tạo nếu key chưa có. `settingValue` luôn là **chuỗi**.
**Request** (`PATCH /settings/MOCK_TEST_DURATION_LISTENING`):
```json
{ "settingValue": "35" }
```
**Response:**
```json
{
  "code": 200,
  "success": true,
  "message": "Cập nhật cấu hình thành công",
  "messages": [],
  "data": { "settingKey": "MOCK_TEST_DURATION_LISTENING", "settingValue": "35" },
  "metaData": null
}
```

---

## Enum
- `fileType`: `PDF` | `VIDEO`
- `notificationType`: `SYSTEM` | `EXAM_REMINDER` | `GRADE_RESULT`

## Lỗi mẫu
```json
{ "statusCode": 400, "message": "fileType phải là PDF | VIDEO", "error": "Bad Request" }
```

---

## Tóm tắt endpoint

| Method | Path | Quyền | Ghi chú |
| :-- | :-- | :-- | :-- |
| GET | `/study-materials` | Đăng nhập | List tài liệu + lọc |
| GET | `/study-materials/{id}` | Đăng nhập | Chi tiết |
| POST | `/study-materials` | ADMIN/TEACHER | Tạo tài liệu |
| PATCH | `/study-materials/{id}` | ADMIN/TEACHER | Sửa |
| DELETE | `/study-materials/{id}` | ADMIN/TEACHER | Xóa mềm |
| GET | `/notifications` | ADMIN | Tất cả thông báo + bộ lọc (quản lý), phân trang |
| GET | `/notifications/me` | Đăng nhập | Thông báo của tôi + broadcast (phân trang) |
| PATCH | `/notifications/{id}/read` | Đăng nhập | Đánh dấu đã đọc |
| PATCH | `/notifications/read-all` | Đăng nhập | Đọc tất cả |
| POST | `/notifications` | ADMIN | Gửi thông báo |
| GET | `/settings` | ADMIN | Toàn bộ cấu hình |
| PATCH | `/settings/{key}` | ADMIN | Sửa cấu hình |
