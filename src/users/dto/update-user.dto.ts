import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({ enum: Role, required: false, description: 'Vai trò mới' })
  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò không hợp lệ (ADMIN | TEACHER | STUDENT)' })
  role?: Role;

  @ApiProperty({ enum: UserStatus, required: false, description: 'Trạng thái mới' })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ (ACTIVE | LOCKED)' })
  status?: UserStatus;
}
