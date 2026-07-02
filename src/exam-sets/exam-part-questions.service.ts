import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignQuestionsDto,
  ReorderQuestionsDto,
} from './dto/assign-questions.dto';

@Injectable()
export class ExamPartQuestionsService {
  constructor(private prisma: PrismaService) {}

  // Gán danh sách câu hỏi vào part. Câu hỏi phải cùng (skillId, partNumber) với part.
  async assign(partId: number, dto: AssignQuestionsDto) {
    const part = await this.getPartWithSection(partId);

    const questionIds = dto.questions.map((q) => q.questionId);
    const dedup = new Set(questionIds);
    if (dedup.size !== questionIds.length) {
      throw new BadRequestException('Danh sách câu hỏi bị trùng questionId');
    }

    const questions = await this.prisma.questionBank.findMany({
      where: { id: { in: questionIds }, deletedAt: null },
    });
    if (questions.length !== questionIds.length) {
      const foundIds = new Set(questions.map((q) => q.id));
      const missing = questionIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Câu hỏi không tồn tại hoặc đã bị xóa: ${missing.join(', ')}`,
      );
    }

    // Validate từng câu khớp kỹ năng + phần của part.
    const mismatched = questions.filter(
      (q) =>
        q.skillId !== part.section.skillId ||
        q.partNumber !== part.partNumber,
    );
    if (mismatched.length > 0) {
      throw new BadRequestException(
        `Câu hỏi không thuộc kỹ năng ${part.section.skillId} phần ${part.partNumber}: ${mismatched
          .map((q) => q.id)
          .join(', ')}`,
      );
    }

    // Bỏ qua câu đã gán trước đó (skipDuplicates theo khóa chính kép).
    await this.prisma.examPartQuestion.createMany({
      data: dto.questions.map((q) => ({
        examPartId: partId,
        questionId: q.questionId,
        orderIndex: q.orderIndex,
      })),
      skipDuplicates: true,
    });

    return this.listOfPart(partId);
  }

  // Gỡ 1 câu hỏi khỏi part.
  async unassign(partId: number, questionId: number) {
    await this.getPartWithSection(partId);
    const existing = await this.prisma.examPartQuestion.findUnique({
      where: {
        examPartId_questionId: { examPartId: partId, questionId },
      },
    });
    if (!existing) {
      throw new NotFoundException(
        `Câu hỏi ${questionId} chưa được gán vào part ${partId}`,
      );
    }
    await this.prisma.examPartQuestion.delete({
      where: {
        examPartId_questionId: { examPartId: partId, questionId },
      },
    });
    return { message: 'Đã gỡ câu hỏi khỏi part' };
  }

  // Sắp lại thứ tự toàn bộ câu hỏi trong part (kéo-thả).
  async reorder(partId: number, dto: ReorderQuestionsDto) {
    await this.getPartWithSection(partId);
    const assigned = await this.prisma.examPartQuestion.findMany({
      where: { examPartId: partId },
      select: { questionId: true },
    });
    const assignedIds = new Set(assigned.map((a) => a.questionId));
    for (const q of dto.questions) {
      if (!assignedIds.has(q.questionId)) {
        throw new BadRequestException(
          `Câu hỏi ${q.questionId} chưa được gán vào part này`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.questions.map((q) =>
        this.prisma.examPartQuestion.update({
          where: {
            examPartId_questionId: {
              examPartId: partId,
              questionId: q.questionId,
            },
          },
          data: { orderIndex: q.orderIndex },
        }),
      ),
    );
    return this.listOfPart(partId);
  }

  private async getPartWithSection(partId: number) {
    const part = await this.prisma.examPart.findUnique({
      where: { id: partId },
      include: { section: true },
    });
    if (!part) {
      throw new NotFoundException(`Không tìm thấy part ID = ${partId}`);
    }
    return part;
  }

  private listOfPart(partId: number) {
    return this.prisma.examPartQuestion.findMany({
      where: { examPartId: partId },
      orderBy: { orderIndex: 'asc' },
      include: { question: true },
    });
  }
}
