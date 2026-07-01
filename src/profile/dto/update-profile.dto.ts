import { IsIn, IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'Nguyen Van Test' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ required: false, example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiProperty({ required: false, example: '2026-12-31', description: 'Ngày mục tiêu (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'target_date phải là ngày hợp lệ (YYYY-MM-DD)' })
  target_date?: string;

  @ApiProperty({ required: false, example: 'B2', description: 'Mục tiêu APTIS: B1 | B2 | C' })
  @IsOptional()
  @IsIn(['B1', 'B2', 'C'], { message: 'aptis_goal phải là B1, B2 hoặc C' })
  aptis_goal?: string;

  @ApiProperty({ required: false, example: 'THPT ABC' })
  @IsOptional()
  @IsString()
  school_name?: string;
}
