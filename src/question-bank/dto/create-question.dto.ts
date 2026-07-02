import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({ example: 3, description: 'ID kỹ năng (1-5)' })
  @IsInt({ message: 'skillId phải là số nguyên' })
  @Min(1)
  skillId: number;

  @ApiProperty({ example: 2, description: 'Số thứ tự phần trong kỹ năng' })
  @IsInt({ message: 'partNumber phải là số nguyên' })
  @Min(1)
  partNumber: number;

  @ApiPropertyOptional({
    description: 'Nội dung câu hỏi / đề bài / đoạn văn (tuỳ dạng)',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'URL ảnh/audio riêng của câu hỏi' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({
    description:
      'Cấu hình đặc thù theo dạng câu hỏi (JSONB). Đáp án MC nằm ở extraConfig.options = [{ content, is_correct }]. Xem validator theo từng (skill, part).',
  })
  @IsOptional()
  @IsObject({ message: 'extraConfig phải là object' })
  extraConfig?: Record<string, unknown>;
}
