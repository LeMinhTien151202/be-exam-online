import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({ example: 'Làm sao để bắt đầu bài thi thử?' })
  @IsNotEmpty({ message: 'Câu hỏi không được để trống' })
  @IsString()
  question: string;

  @ApiProperty({ example: 'Vào mục Thi thử, chọn đề và bấm Bắt đầu.' })
  @IsNotEmpty({ message: 'Câu trả lời không được để trống' })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ example: 'Thi thử', description: 'Nhóm chủ đề' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 0, description: 'Thứ tự hiển thị' })
  @IsOptional()
  @IsInt({ message: 'sortOrder phải là số nguyên' })
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'Hiển thị cho học viên' })
  @IsOptional()
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive?: boolean;
}
