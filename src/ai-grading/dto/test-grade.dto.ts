import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { Allow, IsEnum, IsOptional, IsString } from 'class-validator';

// DTO test nhanh chấm AI — không cần tạo đề/nộp bài, gọi thẳng Gemini.
export class TestGradeDto {
  @ApiProperty({
    enum: [QuestionType.ESSAY, QuestionType.RECORD],
    description: 'ESSAY = chấm text (Writing); RECORD = chấm audio (Speaking)',
    example: QuestionType.ESSAY,
  })
  @IsEnum(QuestionType, { message: 'questionType phải là ESSAY hoặc RECORD' })
  questionType: QuestionType;

  @ApiPropertyOptional({
    description: 'Đề bài / bối cảnh (tuỳ chọn)',
    example: 'Describe your hometown.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description:
      'extra_config như câu hỏi thật (prompts[]/tasks[]/questions[], word_limit...). Bỏ trống nếu chỉ test 1 câu đơn.',
    type: Object,
  })
  @IsOptional()
  extraConfig?: Record<string, unknown>;

  @ApiProperty({
    description:
      'Bài làm cần chấm. ESSAY = text (hoặc mảng text theo prompts/tasks). RECORD = URL audio (hoặc mảng URL).',
    example:
      'My hometown is a small coastal town. It is famous for its beautiful beaches and fresh seafood.',
  })
  @Allow()
  response: unknown;
}
