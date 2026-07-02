import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSectionDto {
  @ApiProperty({ example: 30, description: 'Thời gian làm bài (phút)' })
  @IsInt({ message: 'durationMinutes phải là số nguyên' })
  @Min(1, { message: 'durationMinutes tối thiểu 1 phút' })
  durationMinutes: number;
}
