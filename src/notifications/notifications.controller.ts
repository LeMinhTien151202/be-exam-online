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
import { NotificationType, Role } from '@prisma/client';
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
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'isRead', required: false, enum: ['true', 'false'] })
  @ResponseMessage('Lấy thông báo thành công')
  getMine(
    @User() user: IUser,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('isRead') isRead?: string,
  ) {
    return this.service.getMine(
      user.id,
      Number(page),
      Number(limit),
      isRead === undefined ? undefined : isRead === 'true',
    );
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ADMIN: tất cả thông báo + bộ lọc (quản lý)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'notificationType', required: false, enum: NotificationType })
  @ApiQuery({ name: 'isRead', required: false, enum: ['true', 'false'] })
  @ApiQuery({
    name: 'audience',
    required: false,
    enum: ['all', 'broadcast', 'personal'],
    description: 'broadcast = gửi mọi người; personal = gửi riêng',
  })
  @ApiQuery({ name: 'receiverId', required: false, description: 'Lọc theo 1 người nhận' })
  @ApiQuery({ name: 'search', required: false })
  @ResponseMessage('Lấy danh sách thông báo thành công')
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('notificationType') notificationType?: NotificationType,
    @Query('isRead') isRead?: string,
    @Query('audience') audience?: 'all' | 'broadcast' | 'personal',
    @Query('receiverId') receiverId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllAdmin(Number(page), Number(limit), {
      notificationType,
      isRead: isRead === undefined ? undefined : isRead === 'true',
      audience,
      receiverId: receiverId ? Number(receiverId) : undefined,
      search,
    });
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
