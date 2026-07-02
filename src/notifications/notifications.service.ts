import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        notificationType: dto.notificationType,
        title: dto.title,
        message: dto.message,
        receiverId: dto.receiverId ?? null, // null = broadcast
      },
    });
  }

  // Của tôi = gửi riêng cho tôi + broadcast (receiver_id NULL).
  async getMine(userId: number, isRead?: boolean) {
    const where: Prisma.NotificationWhereInput = {
      OR: [{ receiverId: userId }, { receiverId: null }],
    };
    if (isRead !== undefined) where.isRead = isRead;
    return this.prisma.notification.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }

  // Chỉ đánh dấu đọc thông báo GỬI RIÊNG cho user (broadcast dùng chung 1 dòng, không đánh dấu riêng được).
  async markRead(id: number, userId: number) {
    const noti = await this.prisma.notification.findUnique({ where: { id } });
    if (!noti) throw new NotFoundException(`Không tìm thấy thông báo ID = ${id}`);
    if (noti.receiverId !== userId) {
      return {
        id,
        message:
          'Thông báo broadcast hoặc không thuộc bạn — không đánh dấu riêng được',
      };
    }
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return { id, message: 'Đã đánh dấu đã đọc' };
  }

  async markAllRead(userId: number) {
    const res = await this.prisma.notification.updateMany({
      where: { receiverId: userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: res.count };
  }
}
