import { ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class SetMenuAccessDto {
  @ApiProperty({
    enum: Role,
    isArray: true,
    example: [Role.ADMIN, Role.TEACHER],
    description: 'Danh sách role được thấy menu này',
  })
  @IsArray({ message: 'roles phải là mảng' })
  @ArrayUnique()
  @IsEnum(Role, { each: true, message: 'Mỗi role phải là ADMIN | TEACHER | STUDENT' })
  roles: Role[];
}
