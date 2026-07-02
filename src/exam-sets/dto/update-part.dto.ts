import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePartDto {
  @ApiPropertyOptional({ description: 'Hướng dẫn làm bài của part' })
  @IsOptional()
  @IsString()
  instruction?: string;

  @ApiPropertyOptional({
    description: 'Audio dùng chung cả part (Listening P3/P4)',
  })
  @IsOptional()
  @IsString()
  audioUrl?: string;
}
