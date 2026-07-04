# FE Phase 8 — Góc giải đáp (FAQ)

> FAQ tĩnh: ADMIN/TEACHER đăng câu hỏi + trả lời sẵn; học viên đọc/tìm.
> Base `/api/v1`; response bọc `{ code, success, message, data, metaData }`; header Bearer token.

---

## 1. Danh sách FAQ — `GET /faqs`
Query: `?page=1&limit=10&category=&search=&includeInactive=`. Học viên chỉ thấy FAQ đang bật (`isActive=true`). ADMIN thêm `includeInactive=true` để thấy cả FAQ ẩn. **Có phân trang.**

**Response** (mảng sắp theo `sortOrder`, kèm `metaData`):
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy danh sách FAQ thành công",
  "messages": [],
  "data": [
    {
      "id": 1,
      "question": "Làm sao để bắt đầu bài thi thử?",
      "answer": "Vào mục Thi thử, chọn đề và bấm Bắt đầu.",
      "category": "Thi thử",
      "sortOrder": 0,
      "isActive": true,
      "createdBy": 2,
      "createdAt": "2026-07-04T10:00:00.000Z",
      "deletedAt": null
    }
  ],
  "metaData": { "page": 1, "pageSize": 10, "total": 22, "totalPage": 3 }
}
```
> FE muốn hiển thị dạng accordion group theo `category`: gọi `?category=...` cho từng nhóm, hoặc `?limit=100` để lấy nhiều rồi tự group.

## 2. Chi tiết — `GET /faqs/{id}`
**Response `data`:** 1 object FAQ như trên.

## 3. Tạo — `POST /faqs` (ADMIN/TEACHER)
**Request:**
```json
{ "question": "Quên mật khẩu thì làm sao?", "answer": "Dùng chức năng đổi mật khẩu trong Hồ sơ.", "category": "Tài khoản", "sortOrder": 1, "isActive": true }
```
**Response:**
```json
{
  "code": 201,
  "success": true,
  "message": "Tạo FAQ thành công",
  "messages": [],
  "data": {
    "id": 2,
    "question": "Quên mật khẩu thì làm sao?",
    "answer": "Dùng chức năng đổi mật khẩu trong Hồ sơ.",
    "category": "Tài khoản",
    "sortOrder": 1,
    "isActive": true,
    "createdBy": 2,
    "createdAt": "2026-07-04T10:05:00.000Z",
    "deletedAt": null
  },
  "metaData": null
}
```

## 4. Sửa — `PATCH /faqs/{id}` (ADMIN/TEACHER)
Chỉ gửi field cần đổi (vd ẩn FAQ: `{ "isActive": false }`).
```json
{ "answer": "Câu trả lời đã cập nhật.", "isActive": false }
```

## 5. Xóa mềm — `DELETE /faqs/{id}` (ADMIN/TEACHER)
Không body. **Response `data`:** `{ "message": "Đã xóa FAQ" }`.

---

## Tóm tắt endpoint

| Method | Path | Quyền | Ghi chú |
| :-- | :-- | :-- | :-- |
| GET | `/faqs` | Đăng nhập | List FAQ (lọc category/search) |
| GET | `/faqs/{id}` | Đăng nhập | Chi tiết |
| POST | `/faqs` | ADMIN/TEACHER | Tạo FAQ |
| PATCH | `/faqs/{id}` | ADMIN/TEACHER | Sửa / ẩn (isActive) |
| DELETE | `/faqs/{id}` | ADMIN/TEACHER | Xóa mềm |
