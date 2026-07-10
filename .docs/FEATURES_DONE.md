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

#### 🎧 Cập nhật lưu câu hỏi Listening (2026-07-07)
- [x] Listening Part 3 (Man/Woman/Both): gói CẢ PART vào 1 bản ghi qua `extra_config.statements[]` (audio chung ở `media_url`), bỏ shape cũ 1 nhận định/dòng.
- [x] Listening Part 4 (Monologue): MỖI BÀI NGHE = 1 bản ghi qua `extra_config.questions[]` (audio riêng ở `media_url`), bỏ `audio_group_id`.
- [x] Cập nhật validator (`validateAgreement`, `validateMonologueMc`) và grading (`gradeMc` chấm từng ý cho statements/questions).
- [x] Đồng bộ `QUESTION_SAMPLES.md` + `EXAM_SUBMIT_SAMPLES.md` cho FE nối.

#### 🎤 Cập nhật lưu câu hỏi Speaking (2026-07-07)
- [x] Speaking Part 1 giữ tách lẻ (3 câu độc lập, mỗi câu 1 bản ghi).
- [x] Speaking Part 2/3/4: GÓI toàn bộ câu hỏi của part vào 1 bản ghi qua `extra_config.questions[]`.
- [x] Tách validator `validateRecord` (P1) và `validateRecordGrouped` (P2-4); AI chấm Speaking đọc `questions[]`, gom nhiều audio → chấm tổng thể cả part.
- [x] Đồng bộ `QUESTION_SAMPLES.md` + `EXAM_SUBMIT_SAMPLES.md` (response P2/3/4 = mảng URL audio).

#### 📊 Cập nhật luồng lưu tiến độ khi nộp bài (2026-07-07)
- [x] PART_PRACTICE: chỉ tăng `student_progress` (không ghi attempt).
- [x] SKILL_FULL_SET: ghi 1 dòng `exam_attempts` (đánh dấu "đã làm" đề) + tăng `student_progress`; điểm không tính trung bình.
- [x] MOCK_TEST: ghi 1 dòng `exam_attempts` mỗi lần nộp (dùng cho "đã thi" + điểm trung bình).
- [x] Sửa `exams.service.ts submit()` + Swagger; đồng bộ bảng "Lưu tiến độ theo từng loại đề" trong `EXAM_SUBMIT_SAMPLES.md`.

#### 🧩 Bổ sung endpoint còn thiếu + test AI (2026-07-09)
- [x] `GET /attempts/me/done` — trả tập `examId` học viên đã làm (FE gắn nhãn Đã làm/Chưa làm).
- [x] `GET /attempts` (TEACHER/ADMIN) — toàn bộ lần làm bài + filter `studentId`/`status`/`type` + phân trang.
- [x] `GET /ai-grading/status` — kiểm tra Gemini đã bật chưa (có `GEMINI_API_KEY`).
- [x] `POST /ai-grading/test` — chấm thử 1 câu ESSAY/RECORD bằng Gemini, không lưu DB (chỉ ADMIN/TEACHER).
- [x] Đồng bộ `API_PLAN.md` (bổ sung Google OAuth `/auth/google*`, `DELETE /files`, endpoint test AI; sửa mục 3.5/3.6 khớp code).

#### 📝 Questions & Exams Modules
- [x] Quản lý ngân hàng câu hỏi trắc nghiệm (`Questions`) gồm các đáp án và đáp án đúng.
- [x] Quản lý thông tin đề thi (`Exams`), liên kết quan hệ 1-nhiều hoặc nhiều-nhiều với các câu hỏi thuộc đề thi đó, quản lý phân loại (`category`) và mức độ (`level`).

#### 🏆 Results Module
- [x] Lưu trữ điểm thi của người dùng (`Results`) sau khi hoàn thành bài làm.

#### 📂 Files Module
- [x] Tích hợp Multer disk storage phục vụ upload hình ảnh đề thi hoặc avatar.
- [x] Cấu hình filter định dạng tệp tin chỉ cho phép ảnh (`jpeg`, `jpg`, `png`, `gif`) và giới hạn kích thước tối đa 1MB.
- [x] Tổ chức lưu trữ ảnh có phân loại theo header `folder_type`.
