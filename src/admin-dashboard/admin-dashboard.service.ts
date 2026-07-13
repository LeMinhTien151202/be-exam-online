import { Injectable } from '@nestjs/common';
import { ExamType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Khóa skill dùng cho biểu đồ vùng (FE map sẵn theo tên tiếng Anh).
const SKILL_KEY: Record<number, string> = {
  1: 'grammar',
  2: 'listening',
  3: 'reading',
  4: 'writing',
  5: 'speaking',
};

// Tên hiển thị + thứ tự cho examCounts.
const EXAM_TYPE_META: Record<ExamType, string> = {
  PART_PRACTICE: 'Theo phần',
  SKILL_FULL_SET: 'Theo bộ đề',
  MOCK_TEST: 'Đề thi thử',
};

type TrendType = 'up' | 'down' | 'neutral';

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────── 1. SUMMARY ───────────────────────────
  async summary() {
    const { start: todayStart } = dayRange(0);
    const { start: yesterdayStart, end: yesterdayEnd } = dayRange(-1);

    const [
      totalStudents,
      studentsToday,
      studentsYesterday,
      totalQuestions,
      questionBySkill,
      totalExams,
      examByType,
      completedTests,
      completedToday,
      completedYesterday,
      activeToday,
      activeYesterday,
      progressBySkill,
      skills,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({
        where: { role: 'STUDENT', createdAt: { gte: todayStart } },
      }),
      this.prisma.user.count({
        where: {
          role: 'STUDENT',
          createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
        },
      }),
      this.prisma.questionBank.count({ where: { deletedAt: null } }),
      this.prisma.questionBank.groupBy({
        by: ['skillId'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.examSet.count({ where: { deletedAt: null } }),
      this.prisma.examSet.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.examAttempt.count(),
      this.prisma.examAttempt.count({
        where: { finishedAt: { gte: todayStart } },
      }),
      this.prisma.examAttempt.count({
        where: { finishedAt: { gte: yesterdayStart, lt: yesterdayEnd } },
      }),
      this.distinctActiveStudents(todayStart),
      this.distinctActiveStudents(yesterdayStart, yesterdayEnd),
      this.prisma.studentProgress.groupBy({
        by: ['skillId'],
        _sum: { answered: true },
      }),
      this.prisma.skill.findMany({ select: { id: true, name: true } }),
    ]);

    const skillName = new Map(skills.map((s) => [s.id, s.name]));

    // questionStats — đủ 5 skill kể cả skill 0 câu.
    const qCount = new Map(
      questionBySkill.map((r) => [r.skillId, r._count._all]),
    );
    const questionSkills = skills
      .sort((a, b) => a.id - b.id)
      .map((s) => ({
        skillId: s.id,
        name: s.name,
        count: qCount.get(s.id) ?? 0,
      }));

    // examCounts — đủ 3 loại đề.
    const eCount = new Map(examByType.map((r) => [r.type, r._count._all]));
    const examTypes = (Object.keys(EXAM_TYPE_META) as ExamType[]).map((t) => ({
      type: t,
      name: EXAM_TYPE_META[t],
      count: eCount.get(t) ?? 0,
    }));

    // skillDistribution — % lượt luyện theo skill (làm tròn, tổng ≈ 100).
    const distRaw = progressBySkill.map((r) => ({
      skillId: r.skillId,
      name: skillName.get(r.skillId) ?? `Skill ${r.skillId}`,
      weight: r._sum.answered ?? 0,
    }));
    const skillDistribution = toPercent(distRaw);

    return {
      kpis: {
        totalStudents: {
          value: totalStudents,
          ...trend(studentsToday, studentsYesterday),
        },
        totalQuestions: { value: totalQuestions, trendType: 'neutral' },
        dailyActivity: {
          value: activeToday,
          ...trend(activeToday, activeYesterday),
        },
        totalExams: { value: totalExams, trendType: 'neutral' },
        completedTests: {
          value: completedTests,
          ...trend(completedToday, completedYesterday),
        },
        // Chấm AI đồng bộ, KHÔNG lưu trạng thái chờ -> hiện chưa có hàng đợi.
        pendingGrading: { value: 0 },
      },
      questionStats: { total: totalQuestions, skills: questionSkills },
      examCounts: { total: totalExams, types: examTypes },
      skillDistribution,
    };
  }

  // ─────────────────────────── 2. ACTIVITY ───────────────────────────
  async activity(days = 30, bucket: 'day' | 'week' = 'day') {
    const safeDays = Math.min(Math.max(days, 1), 365);
    const { start: from } = dayRange(-(safeDays - 1));
    const { end: to } = dayRange(0);

    // Nguồn: student_progress (updatedAt + skillId) — tín hiệu luyện tập theo
    // kỹ năng có mốc thời gian duy nhất trong schema hiện tại.
    const rows = await this.prisma.studentProgress.findMany({
      where: { updatedAt: { gte: from, lt: to } },
      select: { updatedAt: true, skillId: true },
    });

    // Khởi tạo đủ mốc (điền 0) để đồ thị liền mạch.
    const buckets = buildBuckets(from, to, bucket);
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const r of rows) {
      const key = bucketKey(r.updatedAt, bucket);
      const i = index.get(key);
      if (i === undefined) continue;
      const skillKey = SKILL_KEY[r.skillId];
      if (skillKey) {
        buckets[i][skillKey] = (buckets[i][skillKey] as number) + 1;
      }
    }

    return {
      range: { from: isoDate(from), to: isoDate(addDays(to, -1)), bucket },
      series: buckets.map((b) => ({
        date: b.date,
        label: b.label,
        grammar: b.grammar,
        reading: b.reading,
        listening: b.listening,
        speaking: b.speaking,
        writing: b.writing,
      })),
    };
  }

  // ─────────────────────── 3. RECENT STUDENTS ───────────────────────
  async recentStudents(limit = 5) {
    const take = clampLimit(limit);
    const users = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
      take,
      include: { profile: { select: { fullName: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      fullName: u.profile?.fullName ?? u.email,
      email: u.email,
      registeredAt: u.createdAt,
      status: u.status, // ACTIVE | LOCKED
    }));
  }

  // ───────────────────────── 4. RECENT TESTS ─────────────────────────
  async recentTests(limit = 5) {
    const take = clampLimit(limit);
    const attempts = await this.prisma.examAttempt.findMany({
      orderBy: { finishedAt: 'desc' },
      take,
      include: {
        student: { include: { profile: { select: { fullName: true } } } },
        exam: { include: { skill: { select: { id: true, name: true } } } },
      },
    });
    return attempts.map((a) => ({
      resultId: a.id,
      studentName: a.student.profile?.fullName ?? a.student.email,
      skillId: a.exam.skill?.id ?? null,
      skillName: a.exam.skill?.name ?? 'Tổng hợp',
      score: a.totalScore, // điểm 0-100
      maxScore: 100,
      status: 'GRADED', // chấm đồng bộ khi nộp -> luôn đã chấm
      durationSeconds: Math.max(
        0,
        Math.round(
          (a.finishedAt.getTime() - a.startedAt.getTime()) / 1000,
        ),
      ),
    }));
  }

  // ─────────────────────────── 5. ACTIVITIES ───────────────────────────
  async activities(limit = 5) {
    const take = clampLimit(limit);
    const [attempts, questions, exams, notifications] = await Promise.all([
      this.prisma.examAttempt.findMany({
        orderBy: { finishedAt: 'desc' },
        take,
        include: {
          student: { include: { profile: { select: { fullName: true } } } },
          exam: { select: { title: true } },
        },
      }),
      this.prisma.questionBank.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take,
        include: { skill: { select: { name: true } } },
      }),
      this.prisma.examSet.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, title: true, createdAt: true },
      }),
      this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, title: true, createdAt: true },
      }),
    ]);

    const items = [
      ...attempts.map((a) => ({
        id: a.id,
        type: 'EXAM_COMPLETED' as const,
        message: `Học viên ${a.student.profile?.fullName ?? a.student.email} đã hoàn thành "${a.exam.title}"`,
        createdAt: a.finishedAt,
      })),
      ...questions.map((q) => ({
        id: q.id,
        type: 'QUESTION_ADDED' as const,
        message: `Thêm câu hỏi ${q.skill?.name ?? ''} vào ngân hàng`.trim(),
        createdAt: q.createdAt,
      })),
      ...exams.map((e) => ({
        id: e.id,
        type: 'EXAM_CREATED' as const,
        message: `Tạo bộ đề mới "${e.title}"`,
        createdAt: e.createdAt,
      })),
      ...notifications.map((n) => ({
        id: n.id,
        type: 'NOTIFICATION_SENT' as const,
        message: `Gửi thông báo "${n.title}"`,
        createdAt: n.createdAt,
      })),
    ];

    // Trộn mọi nguồn, sắp theo thời gian giảm dần, cắt lấy N mới nhất.
    return items
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, take);
  }

  // Số học viên có hoạt động (student_progress cập nhật) trong khoảng.
  private async distinctActiveStudents(gte: Date, lt?: Date) {
    const rows = await this.prisma.studentProgress.findMany({
      where: { updatedAt: lt ? { gte, lt } : { gte } },
      select: { studentId: true },
      distinct: ['studentId'],
    });
    return rows.length;
  }
}

// ─────────────────────────── Helpers ───────────────────────────

// [start, end) của ngày lệch `offset` so với hôm nay (giờ máy chủ).
function dayRange(offset: number): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function trend(
  current: number,
  previous: number,
): { trendPercent?: number; trendType: TrendType } {
  if (previous === 0) {
    return current > 0
      ? { trendPercent: 100, trendType: 'up' }
      : { trendType: 'neutral' };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  const trendType: TrendType = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
  return { trendPercent: Math.abs(pct), trendType };
}

// Quy đổi trọng số -> % làm tròn, ép tổng = 100 (bù phần dư vào mục lớn nhất).
function toPercent(
  rows: { skillId: number; name: string; weight: number }[],
): { skillId: number; name: string; value: number }[] {
  const total = rows.reduce((s, r) => s + r.weight, 0);
  if (total === 0) {
    return rows
      .sort((a, b) => a.skillId - b.skillId)
      .map((r) => ({ skillId: r.skillId, name: r.name, value: 0 }));
  }
  const out = rows
    .sort((a, b) => b.weight - a.weight)
    .map((r) => ({
      skillId: r.skillId,
      name: r.name,
      value: Math.round((r.weight / total) * 100),
    }));
  const diff = 100 - out.reduce((s, r) => s + r.value, 0);
  if (out.length && diff !== 0) out[0].value += diff;
  return out;
}

interface Bucket {
  key: string;
  date: string;
  label: string;
  grammar: number;
  reading: number;
  listening: number;
  speaking: number;
  writing: number;
  [skill: string]: string | number;
}

function bucketKey(d: Date, bucket: 'day' | 'week'): string {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  if (bucket === 'week') {
    // Về đầu tuần (Thứ 2).
    const dow = (day.getDay() + 6) % 7;
    day.setDate(day.getDate() - dow);
  }
  return isoDate(day);
}

function buildBuckets(from: Date, to: Date, bucket: 'day' | 'week'): Bucket[] {
  const buckets: Bucket[] = [];
  const step = bucket === 'week' ? 7 : 1;
  let cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  if (bucket === 'week') {
    const dow = (cursor.getDay() + 6) % 7;
    cursor.setDate(cursor.getDate() - dow);
  }
  let n = 1;
  while (cursor < to) {
    const key = isoDate(cursor);
    buckets.push({
      key,
      date: key,
      label: bucket === 'week' ? `Tuần ${n}` : `Ngày ${n}`,
      grammar: 0,
      reading: 0,
      listening: 0,
      speaking: 0,
      writing: 0,
    });
    cursor = addDays(cursor, step);
    n += 1;
  }
  return buckets;
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < 1) return 5;
  return Math.min(Math.floor(limit), 50);
}
