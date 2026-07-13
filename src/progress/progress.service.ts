import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProgressItem {
  skillId: number;
  partNumber: number;
  answered: number; // số câu học viên THỰC SỰ làm ở part này của đề
  total: number; // tổng số câu của part này trong đề
}

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  // Ghi tiến độ theo (đề, kỹ năng, phần). Làm lại đề -> GIỮ answered cao nhất
  // (không tụt khi nộp lại ít câu hơn); total luôn cập nhật theo đề hiện tại.
  // Đề bị xóa -> các dòng này cascade theo examId nên tự sạch.
  async upsertExamProgress(
    studentId: number,
    examId: number,
    items: ProgressItem[],
  ) {
    if (items.length === 0) return;

    const existing = await this.prisma.studentProgress.findMany({
      where: { studentId, examId },
      select: { skillId: true, partNumber: true, answered: true },
    });
    const prev = new Map(
      existing.map((r) => [`${r.skillId}-${r.partNumber}`, r.answered]),
    );

    await this.prisma.$transaction(
      items.map((it) => {
        const answered = Math.max(
          prev.get(`${it.skillId}-${it.partNumber}`) ?? 0,
          it.answered,
        );
        return this.prisma.studentProgress.upsert({
          where: {
            studentId_examId_skillId_partNumber: {
              studentId,
              examId,
              skillId: it.skillId,
              partNumber: it.partNumber,
            },
          },
          create: {
            studentId,
            examId,
            skillId: it.skillId,
            partNumber: it.partNumber,
            answered: it.answered,
            total: it.total,
          },
          update: { answered, total: it.total },
        });
      }),
    );
  }

  // VIEW 1 — % hoàn thành theo TỪNG ĐỀ (gộp các part của cùng examId).
  // Đề mới (id khác) chưa có dòng -> không xuất hiện -> FE coi là 0%.
  async getMyExamProgress(studentId: number) {
    const rows = await this.prisma.studentProgress.groupBy({
      by: ['examId'],
      where: { studentId },
      _sum: { answered: true, total: true },
    });
    return rows.map((r) => {
      const answered = r._sum.answered ?? 0;
      const total = r._sum.total ?? 0;
      return {
        examId: r.examId,
        answered,
        total,
        percent: total > 0 ? Math.round((answered / total) * 100) : 0,
      };
    });
  }

  // VIEW 2 — dashboard tích lũy theo (kỹ năng, phần), gộp mọi đề.
  async getMyProgress(studentId: number) {
    const rows = await this.prisma.studentProgress.groupBy({
      by: ['skillId', 'partNumber'],
      where: { studentId },
      _sum: { answered: true, total: true },
      orderBy: [{ skillId: 'asc' }, { partNumber: 'asc' }],
    });
    return rows.map((r) => ({
      skillId: r.skillId,
      partNumber: r.partNumber,
      answered: r._sum.answered ?? 0,
      total: r._sum.total ?? 0,
    }));
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
