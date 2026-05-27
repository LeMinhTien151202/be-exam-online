# Kỹ năng lập trình NestJS Backend cho AI Agent (Cấu hình PostgreSQL)

Dưới đây là Workflow (Quy trình chuẩn) từng bước mà Agent bắt buộc phải tuân theo khi được giao nhiệm vụ "Tạo một module/tính năng mới" hoặc "Nâng cấp tính năng hiện có" trong dự án NestJS sử dụng **PostgreSQL**.

---

## Workflow Chuẩn: Phát triển một Module CRUD mới
Giả sử nhiệm vụ là tạo module quản lý danh mục đề thi "Categories" (Mã hóa thư mục: `categories`).

### ⏳ Bước 1: Thiết kế Thực thể Cơ sở dữ liệu (Prisma Schema)
**Vị trí**: `prisma/schema.prisma`

- **Thiết kế quan hệ thực thể (Relational DB)**:
  * Xác định các trường dữ liệu, kiểu dữ liệu tương thích với PostgreSQL (UUID, Int, VarChar, Text, Decimal, DateTime).
  * Định nghĩa khóa chính (`id` dạng UUID hoặc Serial Int).
  * Khai báo quan hệ rõ ràng (ví dụ: Quan hệ 1-nhiều từ `Category` tới `Exam`).
  * Bắt buộc có các cột Audit và Soft Delete:
    * `createdAt` (Timestamp)
    * `updatedAt` (Timestamp)
    * `deletedAt` (Timestamp, nullable - phục vụ xóa mềm)
    * `createdBy` (JSON hoặc Foreign Key tới User)
    * `updatedBy` (JSON hoặc Foreign Key tới User)
    * `deletedBy` (JSON hoặc Foreign Key tới User)
- **Thiết lập model**:
  * Thêm model mới vào `schema.prisma`.
  * Chạy lệnh migration để cập nhật database: `npx prisma migrate dev --name init_categories`.

### ⏳ Bước 2: Khởi tạo các Data Transfer Objects (DTO)
**Vị trí**: `src/categories/dto/create-category.dto.ts` và `src/categories/dto/update-category.dto.ts`.

- Định nghĩa class `CreateCategoryDto` chứa các thuộc tính cần thiết khi tạo mới.
- Sử dụng các decorator từ thư viện `class-validator` để validate dữ liệu đầu vào. Hãy luôn kèm theo tham số `message` tiếng Việt rõ nghĩa:
  ```ts
  @IsNotEmpty({ message: "Tên danh mục không được để trống" })
  name: string;
  ```
- Định nghĩa class `UpdateCategoryDto` kế thừa từ `PartialType(CreateCategoryDto)` của `@nestjs/mapped-types` hoặc `@nestjs/swagger`.

### ⏳ Bước 3: Xây dựng Service (Tầng Logic Nghiệp vụ & Truy vấn PostgreSQL)
**Vị trí**: `src/categories/categories.service.ts`

- Inject `PrismaService` (thường import từ `PrismaModule` dùng chung) vào constructor:
  ```ts
  constructor(private prisma: PrismaService) {}
  ```
- Viết các phương thức CRUD chính:
  1. **`create(createCategoryDto, user: IUser)`**: Gán thêm thông tin audit `createdBy` chứa ID và email của user đang thao tác.
  2. **`findAll(currentPage, limit, queryParams)`**:
     * Tính toán `skip = (currentPage - 1) * limit` và `take = limit`.
     * Sử dụng các câu lệnh truy vấn của ORM để tìm kiếm (ví dụ dùng `contains` hoặc `LIKE` cho PostgreSQL), lọc những record có `deletedAt: null`.
     * Tính toán tổng số bản ghi khớp bộ lọc (`totalItems`) và tổng số trang (`totalPages = Math.ceil(totalItems / limit)`).
     * Bắt buộc trả về cấu trúc Object sau để Controller / Interceptor dễ dàng định dạng:
       ```ts
       return {
         result,              // Mảng danh sách kết quả truy vấn (sẽ map vào thuộc tính 'data' ở cấp root)
         page: currentPage,   // Trang hiện tại
         pageSize: limit,     // Kích thước trang
         total: totalItems,   // Tổng số bản ghi
         totalPage: totalPages // Tổng số trang
       };
       ```
  3. **`findOne(id)`**:
     * Kiểm tra ID có định dạng hợp lệ hay không.
     * Tìm kiếm bản ghi có ID tương ứng và `deletedAt: null`.
     * Ném ra `NotFoundException` nếu không tìm thấy bản ghi.
  4. **`update(id, updateCategoryDto, user: IUser)`**: Cập nhật dữ liệu mới cùng thông tin audit `updatedBy`.
  5. **`remove(id, user: IUser)`**:
     * Thực hiện Soft Delete bằng cách cập nhật trường `deletedAt: new Date()` và `deletedBy`.
     * Không thực hiện xóa cứng (vật lý) trừ khi có yêu cầu đặc biệt.

### ⏳ Bước 4: Xây dựng Controller (Tầng Định tuyến & Xác thực)
**Vị trí**: `src/categories/categories.controller.ts`

- Định danh API Tags bằng `@ApiTags('Categories')` để hiển thị đẹp trên Swagger.
- Đăng ký route bằng `@Controller('categories')`.
- Sử dụng các Http methods: `@Post()`, `@Get()`, `@Patch(':id')`, `@Delete(':id')`.
- Sử dụng `@ResponseMessage('...')` để truyền thông điệp thành công mong muốn xuống Interceptor.
- Lấy thông tin user đăng nhập qua `@User()` decorator.
- Phân quyền (Guard):
  * Mặc định, tất cả các endpoint đều bị chặn bởi `JwtAuthGuard` toàn cục và được check quyền dựa trên permissions lưu trong DB.
  * Nếu endpoint là công khai (không cần login), thêm decorator `@Public()`.
  * Nếu endpoint cần đăng nhập nhưng muốn bỏ qua bước check permission chi tiết, thêm decorator `@SkipCheckPermission()`.

### ⏳ Bước 5: Cấu hình Module và Đăng ký Hệ thống
**Vị trí**: `src/categories/categories.module.ts` và `src/app.module.ts`

- Đăng ký `controllers: [CategoriesController]` và `providers: [CategoriesService]` (đảm bảo module có import `PrismaModule` để dùng `PrismaService`).
- Import `CategoriesModule` vào mảng `imports` của `app.module.ts`.

---

## ⚠️ Lưu ý quan trọng khi lập trình (AI Guidelines)

1. **Ràng buộc toàn vẹn cơ sở dữ liệu (PostgreSQL Constraints)**:
   * PostgreSQL kiểm tra rất nghiêm ngặt về khóa ngoại và dữ liệu duy nhất (Unique). Hãy luôn bắt lỗi lỗi trùng lặp (ví dụ mã lỗi `23505` của PostgreSQL) hoặc khóa ngoại không tồn tại bằng cách ném ra `BadRequestException`.
2. **Database Transactions**:
   * Khi viết các nghiệp vụ tác động lên nhiều bảng cùng lúc (ví dụ: tạo đề thi và tạo danh sách câu hỏi đính kèm), bắt buộc phải sử dụng Prisma $transaction API (ví dụ: `this.prisma.$transaction(async (tx) => { ... })`) để đảm bảo dữ liệu không bị mâu thuẫn khi có lỗi xảy ra.
3. **Soft Delete mặc định**: Mọi truy vấn đọc (`findMany`, `findFirst`, `findUnique`) phải luôn lọc bỏ các record đã xóa (`deletedAt: null`).
4. **Audit Tracking**: Mọi hành động ghi (Create, Update, Delete) phải cập nhật đầy đủ thông tin người thực hiện (`createdBy`, `updatedBy`, `deletedBy`) lấy từ token người dùng hiện tại thông qua `@User()`.
