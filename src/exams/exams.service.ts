import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamType, Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService, ProgressItem } from '../progress/progress.service';
import {
  AiGradingService,
  SubjectiveItem,
} from '../ai-grading/ai-grading.service';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { gradeQuestion, stripAnswers } from './grading';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private progressService: ProgressService,
    private aiGrading: AiGradingService,
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
    const questionMap = new Map<number, (typeof exam.sections)[0]['parts'][0]['questions'][0]['question']>();
    for (const section of exam.sections) {
      for (const part of section.parts) {
        for (const pq of part.questions) {
          questionMap.set(pq.question.id, pq.question);
        }
      }
    }

    // Map đáp án học viên gửi lên -> tra nhanh; câu không có trong map = bỏ trống.
    const answerMap = new Map<number, unknown>();
    for (const ans of dto.answers) answerMap.set(ans.questionId, ans.response);

    // Tách trắc nghiệm (chấm ngay) và tự luận (chờ AI).
    const details = [];
    const subjectiveItems: SubjectiveItem[] = [];
    const percents: number[] = [];
    let earnedAuto = 0;
    let totalAuto = 0;
    // Tiến độ theo (skill, part) của ĐỀ NÀY: total = tổng câu, answered = câu đã làm.
    const progressCount = new Map<string, ProgressItem>();

    // Duyệt TOÀN BỘ câu của đề (không chỉ câu gửi lên): câu bỏ trống vẫn tính
    // 0 điểm để mẫu số = cả đề, tránh thổi phồng điểm khi FE skip câu chưa làm.
    for (const q of questionMap.values()) {
      const answered = answerMap.has(q.id);
      const response = answerMap.get(q.id);

      // Cộng total cho MỌI câu của đề; answered chỉ cho câu học viên THỰC SỰ làm.
      const key = `${q.skillId}-${q.partNumber}`;
      const item = progressCount.get(key) ?? {
        skillId: q.skillId,
        partNumber: q.partNumber,
        answered: 0,
        total: 0,
      };
      item.total += 1;
      if (answered) item.answered += 1;
      progressCount.set(key, item);

      if (
        q.questionType === QuestionType.ESSAY ||
        q.questionType === QuestionType.RECORD
      ) {
        if (answered) {
          subjectiveItems.push({
            questionId: q.id,
            questionType: q.questionType,
            content: q.content,
            extraConfig: q.extraConfig as Record<string, unknown> | null,
            response,
          });
        } else {
          // Bỏ trống câu tự luận -> 0% (không tốn lượt gọi Gemini).
          percents.push(0);
        }
      } else {
        // response = undefined nếu bỏ trống -> gradeQuestion trả earned 0,
        // total = độ dài config, nên câu bỏ trống vẫn góp mẫu số.
        const r = gradeQuestion(
          {
            id: q.id,
            skillId: q.skillId,
            partNumber: q.partNumber,
            questionType: q.questionType,
            extraConfig: q.extraConfig as Record<string, unknown> | null,
          },
          response,
        );
        details.push(r);
        earnedAuto += r.earned;
        totalAuto += r.total;
        if (r.total > 0) percents.push((r.earned / r.total) * 100);
      }
    }

    // Chấm tự luận qua Gemini (song song). Thiếu key -> needsManualReview.
    const aiResults = await this.aiGrading.gradeMany(subjectiveItems);

    // Điểm tổng = trung bình % theo từng câu. Câu chờ chấm tay (AI lỗi) không
    // tính; câu bỏ trống đã cộng 0% ở trên nên vẫn kéo điểm xuống đúng.
    aiResults.forEach((a) => {
      if (a.aiScore !== null) percents.push(a.aiScore);
    });
    const overallScore = percents.length
      ? Math.round(percents.reduce((s, v) => s + v, 0) / percents.length)
      : 0;
    const autoScore =
      totalAuto > 0 ? Math.round((earnedAuto / totalAuto) * 100) : 0;
    const needsManualReviewCount = aiResults.filter(
      (a) => a.needsManualReview,
    ).length;

    // Lưu tiến độ theo LOẠI ĐỀ (xem EXAM_SUBMIT_SAMPLES.md):
    // - PART_PRACTICE: KHÔNG attempt, chỉ tăng student_progress (tiến độ từng phần).
    // - SKILL_FULL_SET: ghi 1 attempt (đánh dấu "đã làm" đề) + tăng student_progress.
    //   Điểm KHÔNG dùng tính trung bình (chỉ MOCK_TEST mới tính AVG).
    // - MOCK_TEST: ghi 1 attempt mỗi lần nộp (dùng cho "đã thi" + điểm trung bình).
    let attemptId: number | null = null;
    if (
      exam.type === ExamType.MOCK_TEST ||
      exam.type === ExamType.SKILL_FULL_SET
    ) {
      const attempt = await this.prisma.examAttempt.create({
        data: {
          studentId,
          examId: exam.id,
          status: 'SUBMITTED',
          totalScore: overallScore,
        },
      });
      attemptId = attempt.id;
    }
    // Ghi tiến độ theo (đề, kỹ năng, phần) cho MỌI loại đề -> mỗi đề có % riêng.
    // Đề mới (id khác) chưa có dòng nên tự về 0%.
    await this.progressService.upsertExamProgress(
      studentId,
      exam.id,
      Array.from(progressCount.values()),
    );

    // Cập nhật streak cho mọi loại submit.
    await this.progressService.touchStreak(studentId);

    return {
      examId: exam.id,
      type: exam.type,
      attemptId,
      score: overallScore, // điểm tổng (trắc nghiệm + AI)
      autoScore, // riêng phần trắc nghiệm
      earnedAutoPoints: earnedAuto,
      totalAutoPoints: totalAuto,
      needsManualReviewCount, // số câu AI chưa chấm được (chờ chấm tay)
      details, // chi tiết trắc nghiệm
      ai: aiResults, // chi tiết chấm tự luận (score/band/feedback)
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

  // Tập examId học viên ĐÃ làm (có attempt) — FE gắn nhãn Đã làm/Chưa làm
  // cho SKILL_FULL_SET & MOCK_TEST.
  async listMyDoneExamIds(studentId: number) {
    const rows = await this.prisma.examAttempt.findMany({
      where: { studentId },
      select: { examId: true },
      distinct: ['examId'],
    });
    return rows.map((r) => r.examId);
  }

  // TEACHER/ADMIN: toàn bộ lần làm bài + filter studentId/status/type + phân trang.
  async listAllAttempts(
    page = 1,
    limit = 10,
    filters: { studentId?: number; status?: string; type?: ExamType } = {},
  ) {
    const where: Prisma.ExamAttemptWhereInput = {};
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.exam = { type: filters.type };

    const skip = (page - 1) * limit;
    const [result, total] = await this.prisma.$transaction([
      this.prisma.examAttempt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          exam: { select: { id: true, title: true, type: true } },
          student: { select: { id: true, email: true } },
        },
      }),
      this.prisma.examAttempt.count({ where }),
    ]);
    return {
      result,
      page,
      pageSize: limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
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
