import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.systemSetting.findMany({
      orderBy: { settingKey: 'asc' },
    });
  }

  // Upsert: cho phép cập nhật hoặc tạo key mới.
  update(settingKey: string, settingValue: string) {
    return this.prisma.systemSetting.upsert({
      where: { settingKey },
      create: { settingKey, settingValue },
      update: { settingValue },
    });
  }
}
