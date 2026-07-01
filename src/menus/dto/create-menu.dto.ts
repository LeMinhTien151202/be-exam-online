import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ example: 'Quản lý đề thi' })
  @IsNotEmpty({ message: 'Nhãn menu không được để trống' })
  @IsString()
  label: string;

  @ApiProperty({ example: '/exam-sets' })
  @IsNotEmpty({ message: 'Đường dẫn không được để trống' })
  @IsString()
  path: string;

  @ApiProperty({ required: false, example: 'file-text' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false, example: null, description: 'ID menu cha (null nếu là menu gốc)' })
  @IsOptional()
  @IsInt({ message: 'parentId phải là số nguyên' })
  parentId?: number;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
