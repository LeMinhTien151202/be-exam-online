# Kiến trúc hệ thống Backend PostgreSQL (Backend Architecture)

## 1. Sơ đồ tư duy Cấu trúc thư mục (Directory Structure)

Dự án áp dụng mô hình kiến trúc **Module-based** chuẩn của NestJS kết hợp cơ sở dữ liệu quan hệ **PostgreSQL**. Các domain nghiệp vụ được chia tách thành các module cô lập nhằm nâng cao tính tái sử dụng và khả năng mở rộng.

```text
/src
├── auth/                        # Xác thực & Phân quyền (Guard, Strategy, Cookie/JWT)
│   ├── passport/                # Các passport strategy (local.strategy.ts, jwt.strategy.ts)
│   ├── auth.controller.ts       # Đăng nhập, đăng ký, refresh, logout
│   ├── auth.service.ts          # Logic xử lý JWT, validate user, cookie management
│   └── auth.module.ts           # Đăng ký cấu hình Passport, JwtModule
├── users/                       # Domain: Quản lý người dùng
│   ├── dto/                     # Dữ liệu đầu vào (create-user.dto.ts, update-user.dto.ts)
│   ├── entities/                # Thực thể cơ sở dữ liệu (user.entity.ts hoặc prisma model)
│   ├── users.controller.ts      # REST API endpoints quản lý user
│   ├── users.service.ts         # Xử lý nghiệp vụ user, hash mật khẩu, cập nhật token
│   └── users.module.ts          # Đăng ký Controller, Service và Entity của User
├── roles/                       # Domain: Quản lý vai trò (liên kết với Permissions)
├── permissions/                 # Domain: Danh mục các quyền API chi tiết (Path + Method)
├── questions/                   # Domain: Ngân hàng câu hỏi trắc nghiệm
├── exams/                       # Domain: Đề thi và cấu trúc câu hỏi đề thi
├── results/                     # Domain: Kết quả bài thi của người dùng
├── files/                       # Domain: Xử lý upload tệp tin hình ảnh (Multer config)
├── decorator/                   # Custom Decorators (Public, ResponseMessage, User, ...)
├── core/                        # Nhân của hệ thống (TransformInterceptor, Exception Filters)
├── app.controller.ts            # Root Controller
├── app.service.ts               # Root Service
├── app.module.ts                # Root Module (Đóng gói Database và import các module con)
└── main.ts                      # Điểm khởi chạy ứng dụng (Bootstrap, CORS, Versioning, Swagger, Global Guards)
```

---

## 2. Luồng xử lý dữ liệu (Data Flow)

Kiến trúc luồng xử lý một request từ Client lên Server và phản hồi ngược lại được định nghĩa nghiêm ngặt:

### 2.1. Request & Guard Layer
- Mọi HTTP request trước tiên đi qua các Guard được cấu hình toàn cục hoặc scoped tại Controller:
  - **`JwtAuthGuard`**:
    1. Kiểm tra xem route hiện tại có được đánh dấu `@Public()` hay không. Nếu có, cho qua luôn.
    2. Nếu không, tiến hành giải mã token JWT gửi kèm trong Header (`Authorization: Bearer <token>`).
    3. Đọc danh sách permissions của User từ cơ sở dữ liệu PostgreSQL thông qua mối quan hệ quan hệ: `User` -> `Role` -> `Permission`.
    4. So khớp phương thức HTTP (`request.method`) và endpoint (`request.route.path`) hiện tại với danh sách permissions của user.
    5. Cho phép đi tiếp hoặc ném ra lỗi `ForbiddenException` ("bạn không có quyền truy cập") hoặc `UnauthorizedException` nếu token không hợp lệ/hết hạn.

### 2.2. Controller Layer (Tầng giao diện API)
- Tiếp nhận request đã được xác thực thành công.
- Trích xuất thông tin người dùng hiện tại thông qua `@User()` decorator.
- Validate dữ liệu truyền lên (Query, Body, Param) bằng các class DTO kết hợp với `ValidationPipe` toàn cục.
- Gọi hàm xử lý tương ứng trong tầng Service và trả kết quả thô về.

### 2.3. Service Layer (Tầng nghiệp vụ chính)
- Thực hiện toàn bộ logic tính toán, xử lý nghiệp vụ, kiểm tra ràng buộc khóa ngoại/quan hệ.
- Tương tác với Database thông qua Prisma Client (`PrismaService`).
- Sử dụng transactions đối với các tác vụ ghi đồng thời lên nhiều bảng.
- Cập nhật thông tin audit fields (`createdBy`, `updatedBy`, `deletedBy`) dựa trên user thực hiện hành động.
- Ném ra các HTTP Exception tiêu chuẩn khi xảy ra lỗi nghiệp vụ.

### 2.4. Response & Interceptor Layer (Tầng phản hồi)
- Dữ liệu thô từ Controller trả về sẽ đi qua **`TransformInterceptor`**.
- Interceptor này lấy thông điệp tuỳ chỉnh đã khai báo ở `@ResponseMessage(...)` trên controller, kết hợp mã trạng thái HTTP thực tế và data thô để đóng gói thành cấu trúc JSON đồng nhất:

#### A. Đối với dữ liệu thông thường:
```json
{
  "code": 200,            // Mã HTTP Status hoặc mã code nghiệp vụ (0, 1, ...)
  "success": true,        // Trạng thái (true/false)
  "message": "Đăng ký thành công",
  "messages": [],         // Mảng thông báo lỗi/chi tiết
  "data": { 
    // Dữ liệu thực tế của response
  },
  "metaData": null
}
```

#### B. Đối với dữ liệu phân trang (Pagination):
Khi Service trả về object dạng `{ result, page, pageSize, total, totalPage }`, Interceptor sẽ tự động phân rã để phản hồi dạng:
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy danh sách thành công",
  "messages": [],
  "data": [
    {
      "id": 1,
      "hoatDong": true
      // ... thông tin bản ghi
    }
  ],
  "metaData": {
    "page": 1,            // Trang hiện tại
    "pageSize": 10,       // Kích thước trang
    "total": 45,          // Tổng số phần tử
    "totalPage": 5        // Tổng số trang
  }
}
```

---

## 3. Kiến trúc Cơ sở dữ liệu PostgreSQL

Để đảm bảo hiệu năng và tính toàn vẹn của PostgreSQL, hệ thống thiết lập các quy chuẩn sau:

1. **Quản lý Schema & Migration**:
   * Tất cả cấu trúc bảng, kiểu dữ liệu, index và khóa ngoại đều được mô tả trong code (`prisma/schema.prisma`) và sinh ra các file SQL migration tương ứng.
   * Chạy migration đồng bộ cơ sở dữ liệu trên môi trường phát triển và production.
2. **Kiểu Dữ liệu**:
   * Khóa chính: Ưu tiên sử dụng `UUID` cho các thực thể quan trọng (như User, Exam, Result) để tránh lộ thứ tự dữ liệu và nâng cao tính bảo mật.
   * Dữ liệu Audit: Các cột `createdAt`, `updatedAt`, `deletedAt` được định kiểu `TIMESTAMP WITH TIME ZONE`.
3. **Soft Delete trên PostgreSQL**:
   * Triển khai trường `deletedAt` dạng nullable DateTime trên các bảng cần xóa mềm.
   * *Prisma*: Định nghĩa trường `deletedAt DateTime?` và luôn gán bộ lọc `{ deletedAt: null }` trong phần `where` của các truy vấn đọc.
