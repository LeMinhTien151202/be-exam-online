import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'student@test.com', description: 'Email đăng ký' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu (tối thiểu 6 ký tự)' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nguyen Van Test', description: 'Họ tên hiển thị' })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  full_name: string;
}
