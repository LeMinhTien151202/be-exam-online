import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: number) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Không tìm thấy hồ sơ người dùng');
    }
    return profile;
  }

  async updateMe(userId: number, dto: UpdateProfileDto) {
    await this.getMe(userId);
    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        fullName: dto.full_name,
        avatarUrl: dto.avatar_url,
        targetDate: dto.target_date ? new Date(dto.target_date) : undefined,
        aptisGoal: dto.aptis_goal,
        schoolName: dto.school_name,
      },
    });
  }
}
