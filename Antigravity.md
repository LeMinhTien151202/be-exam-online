# Master Memory for AI Agent (Antigravity.md)

## 🧠 Chỉ thị hệ thống tối cao (System Instructions)

1. **Tiền kiểm tra (Pre-coding)**: Bắt buộc đọc hiểu `.docs/ARCHITECTURE.md` và `.agent/AGENTS.md` trước khi thực hiện bất kỳ thay đổi mã nguồn nào để nắm vững cấu trúc Module NestJS, các Guard và Decorator đang được cấu hình.
2. **Kỷ luật giao tiếp**: Trả lời ngắn gọn, tập trung vào giải pháp kỹ thuật và mã nguồn NestJS. Không giải thích dông dài trừ khi được yêu cầu.
3. **Quy trình hoàn thiện**: Sau khi hoàn thành một Task hoặc Tính năng, AI phải:
   - Tự động cập nhật hoặc nhắc nhở người dùng cập nhật vắn tắt tiến trình vào `.docs/FEATURES_DONE.md`.
   - Nhắc người dùng xóa nội dung trong `.docs/IDEA.md` để chuẩn bị cho nhiệm vụ mới.
4. **Kiến trúc bắt buộc**: Tuân thủ nghiêm ngặt mô hình cấu trúc NestJS (Module, Controller, Service, Entity/Prisma Client, DTO) và tách biệt rõ ràng trách nhiệm của từng layer như đã định nghĩa trong `.agent/skills/nestjs-backendend-skill.md`.

## 🛠 Lệnh Terminal cơ bản

- **Chạy môi trường Dev**: `npm run dev` hoặc `npm run start:dev` (chế độ watch tự động reload).
- **Build dự án**: `npm run build`
- **Lint code**: `npm run lint`
- **Chạy Tests**: `npm run test` hoặc `npm run test:e2e`
- **Database Migrations (Prisma)**: `npx prisma migrate dev` (hoặc TypeORM migrations).

## 📊 Quy chuẩn Backend & Database (PostgreSQL)
- Sử dụng PostgreSQL làm Cơ sở dữ liệu quan hệ chính.
- Sử dụng ORM (Prisma / TypeORM) để tương tác dữ liệu, thực hiện viết migration đầy đủ khi có thay đổi schema database.
- Thiết lập Soft Delete thông qua lưu trữ cột `deletedAt` (Timestamp) và `deletedBy` (User ID/Email) thay vì xóa vật lý trong database.
- Luôn kiểm tra DTO với `class-validator` và mô tả đầy đủ API bằng Swagger decorators.
