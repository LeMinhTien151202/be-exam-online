# Sổ tay tiến độ dự án Backend PostgreSQL (FEATURES_DONE)

## Phiên bản: 1.0.0 (Khởi tạo Backend PostgreSQL Base)

### 🚀 Giai đoạn 0: Khởi tạo hệ thống (Setup Base)

- [x] Phân tích và xây dựng cấu trúc thư mục chuẩn NestJS Module-based.
- [x] Tích hợp `@nestjs/config` đọc cấu hình từ file `.env` (Port, DATABASE_URL PostgreSQL, JWT Secrets).
- [x] Cấu hình ORM (Prisma / TypeORM) kết nối cơ sở dữ liệu PostgreSQL.
- [x] Triển khai migrations ban đầu để tạo cấu trúc bảng cho các module.
- [x] Cấu hình cơ chế Soft Delete (lọc các bản ghi có `deletedAt: null`).
- [x] Thiết lập bộ tài liệu hướng dẫn AI (.agent/ & .docs/).

### 🛡️ Giai đoạn 1: Bảo mật, Xác thực & Phân quyền (Auth & Security)

- [x] Thiết lập Passport Strategies (`local.strategy.ts` để đăng nhập bằng email/pass, `jwt.strategy.ts` để check Access Token).
- [x] Triển khai quy trình cấp phát token JWT kép (Access Token ngắn hạn, Refresh Token dài hạn được lưu dưới dạng HTTP-only cookie).
- [x] Triển khai API `/api/v1/auth/refresh` để tự động refresh Access Token khi hết hạn.
- [x] Thiết lập custom decorator `@Public()` để miễn trừ xác thực cho các route công khai.
- [x] Triển khai `JwtAuthGuard` toàn cục để tự động kiểm tra quyền hạn người dùng bằng cách truy vấn quan hệ `User` -> `Role` -> `Permission` từ PostgreSQL.
- [x] Thiết lập custom decorator `@SkipCheckPermission()` để bỏ qua check permission chi tiết cho các route nội bộ cần đăng nhập.

### 📦 Các Module Nghiệp vụ Đã Hoàn Thành (Completed Modules)

#### 👥 Users Module
- [x] Đăng ký tài khoản mới `/api/v1/auth/register` (mã hóa mật khẩu bằng bcrypt).
- [x] CRUD thông tin người dùng với phân quyền chặt chẽ thông qua ORM.
- [x] Tích hợp phân trang và lọc động (skip, take, where conditions).
- [x] Tự động điền thông tin audit (`createdBy`, `updatedBy`, `deletedBy`) dựa trên token của người thực hiện hành động.

#### 🔑 Roles & Permissions Modules
- [x] Quản lý danh mục các API endpoint cần bảo vệ (`Permissions`).
- [x] Quản lý nhóm vai trò (`Roles`) và liên kết quan hệ nhiều-nhiều với permissions tương ứng cho từng vai trò.

#### 📝 Questions & Exams Modules
- [x] Quản lý ngân hàng câu hỏi trắc nghiệm (`Questions`) gồm các đáp án và đáp án đúng.
- [x] Quản lý thông tin đề thi (`Exams`), liên kết quan hệ 1-nhiều hoặc nhiều-nhiều với các câu hỏi thuộc đề thi đó, quản lý phân loại (`category`) và mức độ (`level`).

#### 🏆 Results Module
- [x] Lưu trữ điểm thi của người dùng (`Results`) sau khi hoàn thành bài làm.

#### 📂 Files Module
- [x] Tích hợp Multer disk storage phục vụ upload hình ảnh đề thi hoặc avatar.
- [x] Cấu hình filter định dạng tệp tin chỉ cho phép ảnh (`jpeg`, `jpg`, `png`, `gif`) và giới hạn kích thước tối đa 1MB.
- [x] Tổ chức lưu trữ ảnh có phân loại theo header `folder_type`.
