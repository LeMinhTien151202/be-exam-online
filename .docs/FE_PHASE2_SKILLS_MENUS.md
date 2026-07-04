# FE Phase 2 — Skills & Menus

> Nền tảng chung: base `/api/v1`; response bọc `{ code, success, message, data, metaData }`; header Bearer token.

---

## 1. Skills — `GET /skills` (mọi role)

Danh sách 5 kỹ năng APTIS (dữ liệu tĩnh).

**Response:**
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy danh sách kỹ năng thành công",
  "messages": [],
  "data": [
    { "id": 1, "name": "Grammar & Vocabulary", "totalParts": 2 },
    { "id": 2, "name": "Listening", "totalParts": 4 },
    { "id": 3, "name": "Reading", "totalParts": 5 },
    { "id": 4, "name": "Writing", "totalParts": 4 },
    { "id": 5, "name": "Speaking", "totalParts": 4 }
  ],
  "metaData": null
}
```

---

## 2. Menus

### GET /menus/me (mọi role) — sidebar theo quyền
Trả **cây menu** đã lọc theo role hiện tại, sắp theo `sortOrder`.

**Response:**
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy menu thành công",
  "messages": [],
  "data": [
    {
      "id": 1,
      "label": "Trang chủ",
      "path": "/dashboard",
      "icon": "home",
      "parentId": null,
      "sortOrder": 0,
      "children": [
        { "id": 3, "label": "Luyện tập", "path": "/practice", "icon": "book", "parentId": 1, "sortOrder": 0, "children": [] }
      ]
    }
  ],
  "metaData": null
}
```

### GET /menus (ADMIN) — toàn bộ menu (cây)
Giống cấu trúc trên nhưng đủ mọi menu.

### POST /menus (ADMIN)
**Request:**
```json
{ "label": "Quản lý đề thi", "path": "/exam-sets", "icon": "file-text", "parentId": null, "sortOrder": 1 }
```
**Response `data`:** menu vừa tạo.

### PATCH /menus/{id} (ADMIN)
**Request:** (field tuỳ chọn)
```json
{ "label": "Quản lý đề (mới)", "sortOrder": 2 }
```

### DELETE /menus/{id} (ADMIN)
**Response `data`:** `{ "message": "Đã xóa menu" }`

### PUT /menus/{id}/access (ADMIN) — gán role được thấy menu
**Request:**
```json
{ "roles": ["ADMIN", "TEACHER"] }
```
**Response `data`:** `{ "menuId": 5, "roles": ["ADMIN", "TEACHER"] }`

---

## Tóm tắt endpoint

| Method | Path | Quyền | Ghi chú |
| :-- | :-- | :-- | :-- |
| GET | `/skills` | Đăng nhập | 5 kỹ năng + total_parts |
| GET | `/menus/me` | Đăng nhập | Sidebar theo role (cây) |
| GET | `/menus` | ADMIN | Toàn bộ menu (cây) |
| POST | `/menus` | ADMIN | Tạo menu |
| PATCH | `/menus/{id}` | ADMIN | Sửa menu |
| DELETE | `/menus/{id}` | ADMIN | Xóa menu |
| PUT | `/menus/{id}/access` | ADMIN | Gán role thấy menu |
