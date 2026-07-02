import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ResponseMessage, Roles, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';

@ApiTags('Notifications')
@ApiBearerAuth('token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Thông báo của tôi (gồm broadcast)' })
  @ApiQuery({ name: 'isRead', required: false, enum: ['true', 'false'] })
  @ResponseMessage('Lấy thông báo thành công')
  getMine(@User() user: IUser, @Query('isRead') isRead?: string) {
    return this.service.getMine(
      user.id,
      isRead === undefined ? undefined : isRead === 'true',
    );
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu đã đọc tất cả (thông báo riêng)' })
  @ResponseMessage('Đã đọc tất cả')
  markAllRead(@User() user: IUser) {
    return this.service.markAllRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc 1 thông báo' })
  @ResponseMessage('Đã đánh dấu đã đọc')
  markRead(@Param('id', ParseIntPipe) id: number, @User() user: IUser) {
    return this.service.markRead(id, user.id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ADMIN gửi thông báo (broadcast hoặc 1 người)' })
  @ResponseMessage('Gửi thông báo thành công')
  create(@Body() dto: CreateNotificationDto) {
    return this.service.create(dto);
  }
}
