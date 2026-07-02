import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ example: '30', description: 'Giá trị mới của setting' })
  @IsNotEmpty({ message: 'settingValue không được để trống' })
  @IsString()
  settingValue: string;
}
