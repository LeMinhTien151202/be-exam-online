import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
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
  async getMine(userId: number, page = 1, limit = 10, isRead?: boolean) {
    const where: Prisma.NotificationWhereInput = {
      OR: [{ receiverId: userId }, { receiverId: null }],
    };
    if (isRead !== undefined) where.isRead = isRead;
    return this.paginate(where, page, limit);
  }

  // ADMIN: xem TẤT CẢ thông báo + bộ lọc để quản lý.
  async findAllAdmin(
    page = 1,
    limit = 10,
    filters: {
      notificationType?: NotificationType;
      isRead?: boolean;
      audience?: 'all' | 'broadcast' | 'personal';
      receiverId?: number;
      search?: string;
    } = {},
  ) {
    const where: Prisma.NotificationWhereInput = {};
    if (filters.notificationType) where.notificationType = filters.notificationType;
    if (filters.isRead !== undefined) where.isRead = filters.isRead;
    if (filters.audience === 'broadcast') where.receiverId = null;
    else if (filters.audience === 'personal') where.receiverId = { not: null };
    else if (filters.receiverId) where.receiverId = filters.receiverId;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.paginate(where, page, limit, true);
  }

  private async paginate(
    where: Prisma.NotificationWhereInput,
    page: number,
    limit: number,
    withReceiver = false,
  ) {
    const skip = (page - 1) * limit;
    const [result, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        ...(withReceiver
          ? { include: { receiver: { select: { id: true, email: true } } } }
          : {}),
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      result,
      page,
      pageSize: limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
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
