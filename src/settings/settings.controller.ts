import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { ResponseMessage, Roles } from '../decorator/customize';

@ApiTags('Settings')
@ApiBearerAuth('token')
@Roles(Role.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'ADMIN: toàn bộ cấu hình hệ thống' })
  @ResponseMessage('Lấy cấu hình thành công')
  findAll() {
    return this.service.findAll();
  }

  @Patch(':key')
  @ApiOperation({ summary: 'ADMIN: cập nhật một cấu hình' })
  @ResponseMessage('Cập nhật cấu hình thành công')
  update(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.service.update(key, dto.settingValue);
  }
}
