import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService, ProgressItem } from '../progress/progress.service';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { gradeQuestion, stripAnswers, GradableQuestion } from './grading';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private progressService: ProgressService,
  ) {}

  // Danh sách đề đang mở cho học viên.
  async listActive(
    page = 1,
    limit = 10,
    filters: { type?: ExamType; skillId?: number } = {},
  ) {
    const where: Prisma.ExamSetWhereInput = {
      deletedAt: null,
      isActive: true,
    };
    if (filters.type) where.type = filters.type;
    if (filters.skillId) where.skillId = filters.skillId;

    const skip = (page - 1) * limit;
    const [result, total] = await this.prisma.$transaction([
      this.prisma.examSet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: { skill: true },
      }),
      this.prisma.examSet.count({ where }),
    ]);
    return {
      result,
      page,
      pageSize: limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
  }

  // Lấy đề để làm — ĐÃ ẩn mọi đáp án.
  async getForTaking(id: number) {
    const exam = await this.loadFullExam(id, true);
    if (!exam) {
      throw new NotFoundException(`Không tìm thấy đề thi có ID = ${id}`);
    }
    return stripAnswers(exam);
  }

  // Nộp bài + chấm.
  async submit(id: number, dto: SubmitExamDto, studentId: number) {
    const exam = await this.loadFullExam(id, false);
    if (!exam) {
      throw new NotFoundException(`Không tìm thấy đề thi có ID = ${id}`);
    }

    // Gom toàn bộ câu hỏi thuộc đề -> map để tra nhanh.
    const questionMap = new Map<number, GradableQuestion>();
    for (const section of exam.sections) {
      for (const part of section.parts) {
        for (const pq of part.questions) {
          const q = pq.question;
          questionMap.set(q.id, {
            id: q.id,
            skillId: q.skillId,
            partNumber: q.partNumber,
            questionType: q.questionType,
            extraConfig: q.extraConfig as Record<string, unknown> | null,
          });
        }
      }
    }

    // Chấm từng câu học viên gửi (bỏ qua câu không thuộc đề).
    const details = [];
    let earnedAuto = 0;
    let totalAuto = 0;
    let needsAi = 0;
    const progressCount = new Map<string, ProgressItem>();

    for (const ans of dto.answers) {
      const q = questionMap.get(ans.questionId);
      if (!q) continue;
      const r = gradeQuestion(q, ans.response);
      details.push(r);
      if (r.autoGraded) {
        earnedAuto += r.earned;
        totalAuto += r.total;
      }
      if (r.needsAiGrading) needsAi++;

      const key = `${q.skillId}-${q.partNumber}`;
      const item = progressCount.get(key) ?? {
        skillId: q.skillId,
        partNumber: q.partNumber,
        count: 0,
      };
      item.count += 1;
      progressCount.set(key, item);
    }

    // Điểm auto (0-100). Phần ESSAY/RECORD chờ Gemini (Phase 6).
    const autoScore =
      totalAuto > 0 ? Math.round((earnedAuto / totalAuto) * 100) : 0;

    // Luyện tập: KHÔNG lưu attempt, chỉ tăng student_progress.
    // Thi thử (MOCK_TEST): lưu 1 dòng exam_attempts.
    let attemptId: number | null = null;
    if (exam.type === ExamType.MOCK_TEST) {
      const attempt = await this.prisma.examAttempt.create({
        data: {
          studentId,
          examId: exam.id,
          status: 'SUBMITTED',
          totalScore: autoScore,
        },
      });
      attemptId = attempt.id;
    } else {
      await this.progressService.increment(
        studentId,
        Array.from(progressCount.values()),
      );
    }

    // Cập nhật streak cho mọi loại submit.
    await this.progressService.touchStreak(studentId);

    return {
      examId: exam.id,
      type: exam.type,
      attemptId,
      autoScore,
      earnedAutoPoints: earnedAuto,
      totalAutoPoints: totalAuto,
      needsAiGradingCount: needsAi, // số câu ESSAY/RECORD chờ chấm AI (Phase 6)
      details,
    };
  }

  private loadFullExam(id: number, activeOnly: boolean) {
    return this.prisma.examSet.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        skill: true,
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            skill: true,
            parts: {
              orderBy: { partNumber: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { question: true },
                },
              },
            },
          },
        },
      },
    });
  }

  // Lịch sử thi thử của học viên.
  listMyAttempts(studentId: number) {
    return this.prisma.examAttempt.findMany({
      where: { studentId },
      orderBy: { id: 'desc' },
      include: { exam: { select: { id: true, title: true, type: true } } },
    });
  }

  async getMyAttempt(studentId: number, attemptId: number) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, studentId },
      include: { exam: { select: { id: true, title: true, type: true } } },
    });
    if (!attempt) {
      throw new NotFoundException(`Không tìm thấy lần thi ID = ${attemptId}`);
    }
    return attempt;
  }
}
