# Bản Hiến pháp của dự án NestJS Backend (Project Constitution)

## 1. Tech Stack Chính (Core Technologies)

Dự án được xây dựng dựa trên các công nghệ backend hiện đại, hướng module và tối ưu hóa hiệu năng cho cơ sở dữ liệu quan hệ:

- **Core Framework**: NestJS v10 kết hợp TypeScript.
- **Platform**: Express (mặc định của NestJS).
- **Database chính**: PostgreSQL (hệ quản trị cơ sở dữ liệu quan hệ).
- **ORM (Object-Relational Mapping)**: Sử dụng **Prisma ORM** để quản lý thực thể (Entities/Models), các quan hệ (Relations) và truy vấn dữ liệu PostgreSQL.
- **Quản lý Schema**: Sử dụng Prisma Migrations (`npx prisma migrate dev`) để theo dõi và đồng bộ các thay đổi của cấu trúc bảng PostgreSQL.
- **Hỗ trợ Soft Delete**: Triển khai trường `deletedAt` (DateTime, nullable) và `deletedBy` (JSON chứa id và email) trên các bảng cần xóa mềm. Mọi truy vấn đọc của Prisma phải lọc các bản ghi có `deletedAt: null`.
- **Authentication & Security**:
  - Passport (`passport-jwt`, `passport-local`) để xây dựng các Auth Strategy.
  - JWT (`@nestjs/jwt`) để ký và xác thực token (Access token ngắn hạn, Refresh token lưu HttpOnly Cookie).
  - Custom Guard (`JwtAuthGuard`) kiểm tra quyền truy cập động (Dynamic Endpoint Permission Check).
- **Validation**: `class-validator` và `class-transformer` để validate dữ liệu đầu vào thông qua các DTO.
- **API Documentation**: `@nestjs/swagger` kết hợp `swagger-ui-express` để tự động tạo và tương tác API Docs tại `/api/docs`.

## 2. "Đạo luật công nghệ" bắt buộc (Coding Laws)

### 2.1. TypeScript Kỷ luật Thép

- **KHÔNG dùng `any`**: Mọi DTO, response type, parameters đều phải được định nghĩa kiểu rõ ràng. Tránh tuyệt đối việc ép kiểu sang `any` để qua mặt trình biên dịch.
- **Kiểu dữ liệu Database**: Sử dụng kiểu khóa chính UUID hoặc Integer Auto-increment phù hợp cho PostgreSQL. Khóa ngoại luôn được định kiểu dữ liệu đồng nhất và có quan hệ tường minh (Cascade Delete/Set Null khi cần thiết).

### 2.2. Quy tắc Đặt tên File & Thư mục (Naming Conventions)

Tuân thủ nghiêm ngặt quy tắc đặt tên bằng **kebab-case** kèm theo hậu tố chỉ định chức năng:

- **Module**: `[module-name].module.ts` (VD: `users.module.ts`, `auth.module.ts`)
- **Controller**: `[module-name].controller.ts` (VD: `users.controller.ts`)
- **Service**: `[module-name].service.ts` (VD: `users.service.ts`)
- **Entity/Model**: Định nghĩa các model trực tiếp trong `prisma/schema.prisma` sử dụng PascalCase cho tên model (VD: `User`, `Exam`) và camelCase cho tên trường. Dữ liệu trung gian hoặc custom type có thể định nghĩa trong file `*.interface.ts` hoặc `*.types.ts`.
- **DTO**: `[action]-[entity-name].dto.ts` (VD: `create-user.dto.ts`, `update-exam.dto.ts`).
- **Guard & Decorator**: `[name].guard.ts` hoặc `[name].decorator.ts` (VD: `jwt-auth.guard.ts`, `customize.ts`).
- **Thư mục**: Tên module viết thường hoàn toàn, dạng số nhiều (VD: `users`, `exams`, `questions`, `results`).

### 2.3. Quy tắc Export & Khai báo Class

- Sử dụng **Named Export** cho toàn bộ class (VD: `export class UsersService`, `export class CreateUserDto`).
- Tên class viết bằng **PascalCase** và phải khớp với hậu tố của file (VD: file `users.service.ts` chứa `export class UsersService`).

### 2.4. Quy chuẩn Dữ liệu Trả về (Standardized Response Shape)

Mọi API thành công trả về đều phải được định dạng đồng nhất theo cấu trúc JSON sau:

```json
{
  "code": 200,            // Mã HTTP Status (200, 201, ...) hoặc mã code nghiệp vụ (0, 1, ...)
  "success": true,        // Trạng thái thành công của request (true/false)
  "message": "Thành công", // Thông điệp tóm tắt
  "messages": [],         // Mảng các thông điệp chi tiết (dùng cho validation hoặc cảnh báo)
  "data": {               // Dữ liệu trả về (Object, Mảng danh sách kết quả, hoặc null)
    // Thực thể dữ liệu hoặc danh sách kết quả ở đây
  },
  "metaData": null        // Thông tin phân trang (Bằng null nếu không có phân trang)
}
```

#### Cấu trúc khi API có phân trang (Pagination):
Khi API trả về danh sách có phân trang, mảng kết quả sẽ nằm trong `data`, còn thông tin phân trang bắt buộc phải nằm ở `metaData` ở cấp ngoài cùng với các trường:
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
    "page": 1,            // Trang hiện tại (currentPage)
    "pageSize": 10,       // Kích thước trang (limit)
    "total": 45,          // Tổng số lượng bản ghi (totalItems)
    "totalPage": 5        // Tổng số trang (totalPages)
  }
}
```

- **Quy tắc**: Tuyệt đối không tự viết thủ công wrap cấu trúc này trong controller. Tầng `Interceptor` (ví dụ: `TransformInterceptor`) sẽ tự động lấy thông điệp từ `@ResponseMessage`, trạng thái HTTP thực tế và data trả về từ Controller để định dạng thành cấu trúc chuẩn ở trên.
- **Đối với Service có phân trang**: Service cần trả về một Object có cấu trúc chứa dữ liệu danh sách và các thông tin phân trang (ví dụ: `return { result, page, pageSize, total, totalPage }`) để Controller chuyển tiếp và Interceptor có thể phân rã thành `data` và `metaData` tương ứng.

### 2.5. Xử lý Lỗi (Error Handling)

- Sử dụng các Exception tích hợp sẵn của NestJS từ `@nestjs/common` (VD: `BadRequestException`, `NotFoundException`, `UnauthorizedException`, `ForbiddenException`).
- Cung cấp message lỗi thân thiện với người dùng (tiếng Việt hoặc tiếng Anh rõ ràng) trong `class-validator` hoặc khi throw exception:
  ```ts
  throw new NotFoundException("Không tìm thấy đề thi yêu cầu");
  ```
