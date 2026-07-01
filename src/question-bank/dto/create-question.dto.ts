import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionOptionDto {
  @ApiProperty({ example: 'went' })
  @IsNotEmpty({ message: 'Nội dung đáp án không được để trống' })
  @IsString()
  content: string;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'isCorrect phải là boolean' })
  isCorrect: boolean;
}

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
      'Cấu hình đặc thù theo dạng câu hỏi (JSONB). Xem validator theo từng (skill, part).',
  })
  @IsOptional()
  @IsObject({ message: 'extraConfig phải là object' })
  extraConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: [QuestionOptionDto],
    description: 'Đáp án cho MC thường (chỉ dùng cho các part dùng option)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}
