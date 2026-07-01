import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: '123456', description: 'Mật khẩu hiện tại' })
  @IsNotEmpty({ message: 'Mật khẩu cũ không được để trống' })
  oldPassword: string;

  @ApiProperty({ example: '123456new', description: 'Mật khẩu mới (tối thiểu 6 ký tự)' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải chứa ít nhất 6 ký tự' })
  newPassword: string;
}
