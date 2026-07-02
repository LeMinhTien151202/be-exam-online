import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.SYSTEM })
  @IsEnum(NotificationType, {
    message: 'notificationType phải là SYSTEM | EXAM_REMINDER | GRADE_RESULT',
  })
  notificationType: NotificationType;

  @ApiProperty({ example: 'Bảo trì hệ thống' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Hệ thống bảo trì 22h-23h hôm nay.' })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'ID người nhận. Bỏ trống = broadcast toàn hệ thống.',
  })
  @IsOptional()
  @IsInt({ message: 'receiverId phải là số nguyên' })
  @Min(1)
  receiverId?: number;
}
