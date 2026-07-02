import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { getPartConfig, QuestionPayload } from './question-config';

@Injectable()
export class QuestionBankService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuestionDto, userId: number) {
    const cfg = getPartConfig(dto.skillId, dto.partNumber);

    // partNumber phải nằm trong total_parts của skill.
    const skill = await this.prisma.skill.findUnique({
      where: { id: dto.skillId },
    });
    if (!skill) throw new BadRequestException('Kỹ năng không tồn tại');
    if (dto.partNumber > skill.totalParts) {
      throw new BadRequestException(
        `Kỹ năng ${skill.name} chỉ có ${skill.totalParts} phần`,
      );
    }

    const payload: QuestionPayload = {
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      extraConfig: dto.extraConfig,
    };
    cfg.validate(payload);

    return this.prisma.questionBank.create({
      data: {
        skillId: dto.skillId,
        partNumber: dto.partNumber,
        questionType: cfg.questionType, // tự suy ra, không nhận từ client
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        // Đáp án MC nằm trong extraConfig.options (không còn bảng riêng).
        extraConfig: (dto.extraConfig as Prisma.InputJsonValue) ?? undefined,
        createdBy: userId,
      },
    });
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: {
      skillId?: number;
      partNumber?: number;
      questionType?: QuestionType;
      search?: string;
    } = {},
  ) {
    const where: Prisma.QuestionBankWhereInput = { deletedAt: null };
    if (filters.skillId) where.skillId = filters.skillId;
    if (filters.partNumber) where.partNumber = filters.partNumber;
    if (filters.questionType) where.questionType = filters.questionType;
    if (filters.search) {
      where.content = { contains: filters.search, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;
    const [result, total] = await this.prisma.$transaction([
      this.prisma.questionBank.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.questionBank.count({ where }),
    ]);

    return {
      result,
      page,
      pageSize: limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const question = await this.prisma.questionBank.findFirst({
      where: { id, deletedAt: null },
    });
    if (!question) {
      throw new NotFoundException(`Không tìm thấy câu hỏi có ID = ${id}`);
    }
    return question;
  }

  async update(id: number, dto: UpdateQuestionDto) {
    const existing = await this.findOne(id);
    const cfg = getPartConfig(existing.skillId, existing.partNumber);

    // Ghép dữ liệu mới với dữ liệu cũ rồi validate lại theo đúng cấu hình part.
    const payload: QuestionPayload = {
      content: dto.content ?? existing.content,
      mediaUrl: dto.mediaUrl ?? existing.mediaUrl,
      extraConfig:
        (dto.extraConfig as Record<string, unknown>) ??
        (existing.extraConfig as Record<string, unknown> | null),
    };
    cfg.validate(payload);

    return this.prisma.questionBank.update({
      where: { id },
      data: {
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        extraConfig:
          dto.extraConfig !== undefined
            ? (dto.extraConfig as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  // Soft delete (question_bank có cột deleted_at).
  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.questionBank.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Đã xóa câu hỏi' };
  }
}
