import { IsNotEmpty, IsEmail, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'tienle@example.com', description: 'Email của người dùng' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'Le Minh Tien', description: 'Tên hiển thị' })
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  name: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: true, description: 'Trạng thái hoạt động', required: false })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là boolean' })
  @IsOptional()
  hoatDong?: boolean;
}
