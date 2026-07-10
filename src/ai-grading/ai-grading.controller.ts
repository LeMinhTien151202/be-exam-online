import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AiGradingService } from './ai-grading.service';
import { GeminiService } from './gemini.service';
import { TestGradeDto } from './dto/test-grade.dto';
import { ResponseMessage, Roles } from '../decorator/customize';

// Endpoint TEST chấm AI — gọi thẳng Gemini để kiểm tra hoạt động,
// không cần tạo đề/nộp bài. Chỉ ADMIN/TEACHER.
@ApiTags('AI Grading (Test)')
@ApiBearerAuth('token')
@Roles(Role.ADMIN, Role.TEACHER)
@Controller('ai-grading')
export class AiGradingController {
  constructor(
    private readonly aiGrading: AiGradingService,
    private readonly gemini: GeminiService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Kiểm tra Gemini đã bật chưa (có GEMINI_API_KEY)' })
  @ResponseMessage('Trạng thái AI grading')
  status() {
    return {
      enabled: this.gemini.enabled,
      note: this.gemini.enabled
        ? 'Gemini đã bật — có thể chấm thử.'
        : 'Chưa cấu hình GEMINI_API_KEY — chấm sẽ trả needsManualReview.',
    };
  }

  @Post('test')
  @ApiOperation({
    summary: 'Chấm thử 1 câu ESSAY/RECORD bằng Gemini (test nhanh, không lưu)',
  })
  @ResponseMessage('Chấm thử thành công')
  async test(@Body() dto: TestGradeDto) {
    const [result] = await this.aiGrading.gradeMany([
      {
        questionId: 0,
        questionType: dto.questionType,
        content: dto.content ?? null,
        extraConfig: dto.extraConfig ?? null,
        response: dto.response,
      },
    ]);
    return result;
  }
}
