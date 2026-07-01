# Postman — Test API (Phase 1: Auth + Users)

Bộ collection test API cho **Phase 1** của hệ thống luyện thi APTIS (Auth + Users/Profile).
Bám theo thiết kế trong [`.docs/API_PLAN.md`](../.docs/API_PLAN.md).

## File trong thư mục

| File | Vai trò |
| :-- | :-- |
| `APTIS-Exam-Online.postman_collection.json` | Collection: folder **Auth**, **Users (Admin)**, **Profile** |
| `APTIS-Exam-Online.local.postman_environment.json` | Environment `Local` (base_url, token, biến mẫu) |

## Cách dùng trong Postman (UI)

1. **Import** cả 2 file (nút *Import* → kéo thả).
2. Góc trên bên phải chọn environment **APTIS Exam Online - Local**.
3. Chạy request theo thứ tự:
   - `Auth → Register (Public)` — tạo tài khoản student.
   - `Auth → Login (Public)` — **tự động lưu `access_token`** vào environment (không cần copy tay).
   - `Auth → Get Account`, `Profile → Get My Profile` — dùng token vừa lưu.
   - Với nhóm **Users (Admin)**: chạy `Auth → Login as Admin` trước (ghi đè token bằng token ADMIN), rồi `List Users`, `Create User` (tự lưu `user_id`), `Get User by id`, ...

> Các request đã bật sẵn Bearer `{{access_token}}` ở cấp collection; `Register`/`Login`/`Refresh` để *No Auth* vì là route công khai.

## Cách chạy tự động bằng Newman (CLI)

```bash
# Cài 1 lần
npm i -g newman

# Chạy toàn bộ
newman run postman/APTIS-Exam-Online.postman_collection.json \
  -e postman/APTIS-Exam-Online.local.postman_environment.json

# Chỉ chạy 1 folder
newman run postman/APTIS-Exam-Online.postman_collection.json \
  -e postman/APTIS-Exam-Online.local.postman_environment.json --folder Auth
```

## Kiểm tra & assertion tự động

- **Cấp collection**: mọi response được kiểm tra đúng shape `TransformInterceptor`
  (`{ code, success, message, messages, data, metaData }`) và `success === true`.
- **Login / Login as Admin**: tự lưu `access_token` (+ `refresh_token`, `user_id` nếu có).
- **Create User**: tự lưu `data.id` vào `user_id` để các request `/users/:id` sau dùng được.

## Lưu ý

- Collection theo **thiết kế** (Phase 1 chưa implement xong). Khi build backend nếu đổi tên
  field (vd `username` vs `email`) hoặc route thì **cập nhật lại collection cho khớp**.
- `base_url` mặc định `http://localhost:3000` — sửa lại nếu bạn đổi `PORT` trong `.env`.
- Refresh token dùng cookie httpOnly: trong Postman cookie tự lưu theo domain nên
  `Auth → Refresh Token` chạy được sau khi Login; qua Newman cần bật cookie jar (mặc định có).
- Các module còn lại (question-bank, exam-sets, exams, attempts...) sẽ bổ sung ở các phase sau.
