import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileType } from '@prisma/client';

export class CreateStudyMaterialDto {
  @ApiProperty({ example: 'Ngữ pháp APTIS - Thì hiện tại' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'https://.../materials/grammar.pdf' })
  @IsNotEmpty({ message: 'file_url không được để trống' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ enum: FileType, example: FileType.PDF })
  @IsEnum(FileType, { message: 'fileType phải là PDF | VIDEO' })
  fileType: FileType;

  @ApiPropertyOptional({ example: 300, description: 'Thời lượng (giây) cho VIDEO' })
  @IsOptional()
  @IsInt({ message: 'durationSeconds phải là số nguyên' })
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 1, description: 'Gắn với kỹ năng (1-5)' })
  @IsOptional()
  @IsInt({ message: 'skillId phải là số nguyên' })
  @Min(1)
  skillId?: number;
}
