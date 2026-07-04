# FE Phase 1 — Users & Profile

> Auth (đăng ký/đăng nhập/refresh/Google) xem [FE_AUTH_GUIDE.md](FE_AUTH_GUIDE.md).
> Nền tảng chung: base `/api/v1`; response bọc `{ code, success, message, messages, data, metaData }` (đọc `data`); header `Authorization: Bearer <access_token>`.

---

## 1. Profile (STUDENT/TEACHER — của chính mình)

### GET /profile/me
**Response:**
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy hồ sơ thành công",
  "messages": [],
  "data": {
    "userId": 1,
    "fullName": "Nguyen Van A",
    "avatarUrl": null,
    "targetDate": "2026-12-31T00:00:00.000Z",
    "aptisGoal": "B2",
    "schoolName": "THPT ABC",
    "overallMockAvg": 0
  },
  "metaData": null
}
```

### PATCH /profile/me
**Request** (chỉ gửi field cần đổi):
```json
{
  "full_name": "Nguyen Van A",
  "avatar_url": "https://.../avatar.png",
  "target_date": "2026-12-31",
  "aptis_goal": "B2",
  "school_name": "THPT ABC"
}
```
**Response `data`:** object profile sau cập nhật (như GET). `aptis_goal` ∈ `B1|B2|C`.

---

## 2. Users (ADMIN)

### GET /users?page=1&limit=10&role=STUDENT&status=ACTIVE&search=
**Response (có phân trang — `metaData`):**
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy danh sách người dùng thành công",
  "messages": [],
  "data": [
    {
      "id": 1,
      "email": "student@test.com",
      "role": "STUDENT",
      "status": "ACTIVE",
      "createdAt": "2026-07-02T10:00:00.000Z",
      "profile": { "userId": 1, "fullName": "Nguyen Van A", "aptisGoal": "B2" }
    }
  ],
  "metaData": { "page": 1, "pageSize": 10, "total": 45, "totalPage": 5 }
}
```

### POST /users
**Request:**
```json
{ "email": "teacher1@test.com", "password": "123456", "full_name": "Giao Vien 1", "role": "TEACHER" }
```
**Response `data`:** user vừa tạo (kèm `profile`).

### GET /users/{id}
**Response `data`:** 1 user + profile.

### PATCH /users/{id}
**Request:**
```json
{ "role": "STUDENT", "status": "ACTIVE" }
```

### PATCH /users/{id}/lock
Không body → khoá tài khoản (`status = LOCKED`).

---

## Enum
- `role`: `ADMIN` | `TEACHER` | `STUDENT`
- `status`: `ACTIVE` | `LOCKED`

## Lỗi mẫu
```json
{ "statusCode": 400, "message": "Email teacher1@test.com đã được sử dụng", "error": "Bad Request" }
```

---

## Tóm tắt endpoint

| Method | Path | Quyền | Ghi chú |
| :-- | :-- | :-- | :-- |
| GET | `/profile/me` | Đăng nhập | Hồ sơ của tôi |
| PATCH | `/profile/me` | Đăng nhập | Cập nhật hồ sơ |
| GET | `/users` | ADMIN | List + phân trang + lọc |
| POST | `/users` | ADMIN | Tạo user |
| GET | `/users/{id}` | ADMIN | Chi tiết user |
| PATCH | `/users/{id}` | ADMIN | Đổi role/status |
| PATCH | `/users/{id}/lock` | ADMIN | Khoá tài khoản |
