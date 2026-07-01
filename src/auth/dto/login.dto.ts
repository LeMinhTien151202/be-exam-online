import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTO phục vụ mô tả Swagger; LocalStrategy đọc trực tiếp từ body.
export class LoginDto {
  @ApiProperty({ example: 'student@test.com', description: 'Email đăng nhập' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  username: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
