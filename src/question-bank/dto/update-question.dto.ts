import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Không cho đổi skillId/partNumber/questionType khi update (giữ toàn vẹn cấu hình).
export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'Gồm cả đáp án MC (options) nếu là dạng MC',
  })
  @IsOptional()
  @IsObject({ message: 'extraConfig phải là object' })
  extraConfig?: Record<string, unknown>;
}
