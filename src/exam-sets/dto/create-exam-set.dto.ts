import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamType } from '@prisma/client';

export class CreateExamSetDto {
  @ApiProperty({ example: 'Luyện Listening Part 1 - Đề số 1' })
  @IsNotEmpty({ message: 'Tiêu đề đề thi không được để trống' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Đề luyện tập nghe thông tin chi tiết' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: ExamType,
    example: ExamType.PART_PRACTICE,
    description:
      'PART_PRACTICE: 1 phần của 1 kỹ năng (cần skillId + partNumber). SKILL_FULL_SET: đủ các phần của 1 kỹ năng (cần skillId). MOCK_TEST: đủ 5 kỹ năng (không cần skillId/partNumber).',
  })
  @IsEnum(ExamType, {
    message: 'type phải là PART_PRACTICE | SKILL_FULL_SET | MOCK_TEST',
  })
  type: ExamType;

  @ApiPropertyOptional({ example: 2, description: 'Bắt buộc với PART_PRACTICE và SKILL_FULL_SET' })
  @IsOptional()
  @IsInt({ message: 'skillId phải là số nguyên' })
  @Min(1)
  skillId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Chỉ dùng với PART_PRACTICE' })
  @IsOptional()
  @IsInt({ message: 'partNumber phải là số nguyên' })
  @Min(1)
  partNumber?: number;
}
