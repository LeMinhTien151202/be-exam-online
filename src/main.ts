import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { TransformInterceptor } from './core/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const reflector = app.get(Reflector);

  // Serve file tĩnh khi dùng storage driver 'local' (dev): /uploads
  if ((process.env.STORAGE_DRIVER || 'local') === 'local') {
    app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  }

  // 1. Validation toàn cục
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // 2. Interceptor định dạng dữ liệu trả về đồng nhất
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // 3. Cookie Parser đọc Cookie
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
    .setTitle('NestJS Exam Online API Specs')
    .setDescription('Tài liệu đặc tả các API của hệ thống (Mock / Test)')
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
