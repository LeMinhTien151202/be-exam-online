# Hướng Dẫn Khởi Tạo Dự Án NestJS + PostgreSQL Từ Đầu (Sử Dụng Prisma & pnpm)

Tài liệu này hướng dẫn chi tiết từng bước cách khởi tạo một dự án NestJS mới sử dụng cơ sở dữ liệu **PostgreSQL** thông qua **Prisma ORM**, cài đặt các thư viện cần thiết cho xác thực JWT, phân quyền, cookie, validate dữ liệu đầu vào và thiết lập môi trường chạy thử nghiệm bằng package manager **pnpm**.

---

## 🛠️ Bước 1: Khởi Tạo Dự Án NestJS

1. Đầu tiên, đảm bảo bạn đã cài đặt Node.js (khuyến nghị phiên bản LTS mới nhất) và **pnpm**:
   ```bash
   npm i -g pnpm
   ```
2. Cài đặt NestJS CLI toàn cục (nếu chưa có):
   ```bash
   pnpm add -g @nestjs/cli
   ```
3. Tạo một dự án NestJS mới:
   ```bash
   nest new my-nest-project
   ```
   *(Khi CLI hỏi, chọn `pnpm` làm package manager).*
4. Di chuyển vào thư mục dự án vừa tạo:
   ```bash
   cd my-nest-project
   ```

---

## 📦 Bước 2: Cài Đặt Các Thư Viện Cần Thiết

Cài đặt tất cả các dependencies phục vụ cho cơ sở dữ liệu, bảo mật, validate và tài liệu API bằng `pnpm`:

### 1. Thư viện Cốt lõi & Tiện ích (Config, Cookie, Validation)
```bash
pnpm add @nestjs/config class-validator class-transformer cookie-parser
pnpm add -D @types/cookie-parser
```

### 2. Thư viện Xác thực & Bảo mật (JWT & Passport)
```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcryptjs
pnpm add -D @types/passport-jwt @types/passport-local @types/bcryptjs
```

### 3. Thư viện Tài liệu API (Swagger UI)
```bash
pnpm add @nestjs/swagger swagger-ui-express
```

### 4. Cài đặt Prisma ORM cho PostgreSQL
```bash
# Cài đặt Prisma CLI dưới dạng dev dependency
pnpm add -D prisma

# Cài đặt Prisma Client phục vụ truy vấn code
pnpm add @prisma/client

# Khởi tạo cấu hình Prisma (tạo thư mục prisma/ và file schema.prisma)
pnpm prisma init
```

---

## 🗄️ Bước 3: Cấu Hình Database & Chạy Migrations (Với Prisma)

1. Mở file `.env` được tạo ra ở gốc dự án và thay đổi `DATABASE_URL` kết nối tới PostgreSQL của bạn:
   ```env
   PORT=6969
   DATABASE_URL="postgresql://postgres:user_password@localhost:5432/my_database?schema=public"
   JWT_ACCESS_TOKEN_SECRET="access_secret_key"
   JWT_ACCESS_EXPIRES="15m"
   JWT_REFRESH_TOKEN_SECRET="refresh_secret_key"
   JWT_REFRESH_EXPIRES="7d"
   ```
2. Mở file `prisma/schema.prisma` và thiết kế các model PostgreSQL cơ bản (ví dụ `User` và `Role`):
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
   }

   model Role {
     id          String   @id @default(uuid())
     name        String   @unique
     description String?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     users       User[]
   }

   model User {
     id           String    @id @default(uuid())
     email        String    @unique
     password     String
     name         String?
     roleId       String?
     role         Role?     @relation(fields: [roleId], references: [id])
     refreshToken String?
     createdAt    DateTime  @default(now())
     updatedAt    DateTime  @updatedAt
     deletedAt    DateTime? // Dành cho xóa mềm
   }
   ```
3. Chạy lệnh Migration đầu tiên để đồng bộ schema vào PostgreSQL:
   ```bash
   pnpm prisma migrate dev --name init_database
   ```

---

## 🧩 Bước 4: Thiết Lập Cấu Trúc Boilerplate

Để dự án hoạt động đúng quy tắc đã định sẵn, hãy tạo các file nền tảng sau:

### 1. Tạo Custom Decorators (`src/decorator/customize.ts`)
Tạo file này để khai báo các decorator bỏ qua xác thực, lấy thông tin user, và đặt message phản hồi:
```typescript
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RESPONSE_MESSAGE = 'response_message';
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE, message);

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const IS_PUBLIC_PERMISSION = 'isPublicPermission';
export const SkipCheckPermission = () => SetMetadata(IS_PUBLIC_PERMISSION, true);
```

### 2. Tạo Transform Interceptor định dạng JSON trả về (`src/core/transform.interceptor.ts`)
Tạo file này để định dạng đồng nhất API (bao gồm phân trang chứa `metaData` có các trường `page`, `pageSize`, `total`, `totalPage`):
```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  code: number;
  success: boolean;
  message: string;
  messages: string[];
  data: any;
  metaData: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((rawOutput) => {
        const response = context.switchToHttp().getResponse();
        const customMessage = this.reflector.get<string>('response_message', context.getHandler()) || 'Thành công';

        // Kiểm tra xem dữ liệu thô trả về từ Service/Controller có chứa cấu trúc phân trang hay không
        const isPaginated = rawOutput && 'result' in rawOutput && 'page' in rawOutput;

        return {
          code: response.statusCode,
          success: response.statusCode >= 200 && response.statusCode < 300,
          message: customMessage,
          messages: [],
          data: isPaginated ? rawOutput.result : rawOutput,
          metaData: isPaginated
            ? {
                page: rawOutput.page,
                pageSize: rawOutput.pageSize,
                total: rawOutput.total,
                totalPage: rawOutput.totalPage,
              }
            : null,
        };
      }),
    );
  }
}
```

### 3. Cấu hình file khởi chạy (`src/main.ts`)
Cấu hình CORS, Versioning API, Swagger và đăng ký các Filter/Interceptor toàn cục:
```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { TransformInterceptor } from './core/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);

  // 1. Validation toàn cục
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // 2. Interceptor định dạng dữ liệu trả về đồng nhất
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // 3. Cookie Parser đọc Refresh Token
  app.use(cookieParser());

  // 4. Định dạng tiền tố và Versioning API (ví dụ: api/v1/...)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // 5. Cấu hình CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 6. Cấu hình Swagger API Docs
  const config = new DocumentBuilder()
    .setTitle('NestJS PostgreSQL API Specs')
    .setDescription('Tài liệu đặc tả các API của hệ thống')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'token',
    )
    .addSecurityRequirements('token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server dang chay tai: http://localhost:${port}`);
  console.log(`Tai lieu API Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
```

---

## ⚡ Bước 5: Chạy Thử Nghiệm Dự Án & Tests

### 1. Khởi động máy chủ dev:
```bash
pnpm start:dev
```
*Bạn có thể truy cập `http://localhost:6969/api/docs` để kiểm tra tài liệu API tự động.*

### 2. Kiểm tra biên dịch mã nguồn (Build test):
```bash
pnpm build
```

### 3. Chạy unit tests:
```bash
pnpm test
```

### 4. Chạy kiểm thử tích hợp (e2e):
```bash
pnpm test:e2e
```
*(Hãy cấu hình lại cơ sở dữ liệu test trong file `./test/jest-e2e.json` khi chạy e2e).*
