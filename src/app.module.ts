import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { SkillsModule } from './skills/skills.module';
import { MenusModule } from './menus/menus.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { ExamSetsModule } from './exam-sets/exam-sets.module';
import { ExamsModule } from './exams/exams.module';
import { ProgressModule } from './progress/progress.module';
import { StorageModule } from './storage/storage.module';
import { FilesModule } from './files/files.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
// import { RolesGuard } from './auth/roles.guard'; // TẠM TẮT check role

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    SkillsModule,
    MenusModule,
    QuestionBankModule,
    ExamSetsModule,
    ExamsModule,
    ProgressModule,
    StorageModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Xác thực (JWT) toàn cục. Route @Public() được bỏ qua.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // TẠM TẮT check role để test API trơn tru — bật lại khi cần phân quyền:
    // { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
