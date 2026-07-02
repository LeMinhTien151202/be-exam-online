import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProgressItem {
  skillId: number;
  partNumber: number;
  count: number;
}

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  // Tăng bộ đếm câu đã làm theo (skill, part). Dùng khi submit luyện tập.
  async increment(studentId: number, items: ProgressItem[]) {
    await this.prisma.$transaction(
      items.map((it) =>
        this.prisma.studentProgress.upsert({
          where: {
            studentId_skillId_partNumber: {
              studentId,
              skillId: it.skillId,
              partNumber: it.partNumber,
            },
          },
          create: {
            studentId,
            skillId: it.skillId,
            partNumber: it.partNumber,
            questionsAnswered: it.count,
          },
          update: { questionsAnswered: { increment: it.count } },
        }),
      ),
    );
  }

  getMyProgress(studentId: number) {
    return this.prisma.studentProgress.findMany({
      where: { studentId },
      orderBy: [{ skillId: 'asc' }, { partNumber: 'asc' }],
    });
  }

  // Cập nhật streak học tập (gọi mỗi lần có hoạt động submit).
  async touchStreak(studentId: number) {
    const existing = await this.prisma.learningStreak.findUnique({
      where: { studentId },
    });
    const today = startOfDay(new Date());

    if (!existing) {
      return this.prisma.learningStreak.create({
        data: {
          studentId,
          currentStreak: 1,
          longestStreak: 1,
          lastActivity: today,
        },
      });
    }

    const last = startOfDay(new Date(existing.lastActivity));
    const diffDays = Math.round(
      (today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (diffDays === 0) {
      return existing; // đã hoạt động hôm nay -> giữ nguyên
    }
    const current = diffDays === 1 ? existing.currentStreak + 1 : 1;
    return this.prisma.learningStreak.update({
      where: { studentId },
      data: {
        currentStreak: current,
        longestStreak: Math.max(existing.longestStreak, current),
        lastActivity: today,
      },
    });
  }

  async getMyStreak(studentId: number) {
    const streak = await this.prisma.learningStreak.findUnique({
      where: { studentId },
    });
    return (
      streak ?? {
        studentId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: null,
      }
    );
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
