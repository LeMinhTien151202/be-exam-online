import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExamType, Prisma, Skill } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamSetDto } from './dto/create-exam-set.dto';
import { UpdateExamSetDto } from './dto/update-exam-set.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { UpdatePartDto } from './dto/update-part.dto';

// Mapping skillId -> key thời gian mặc định trong system_settings.
const DURATION_KEY_BY_SKILL: Record<number, string> = {
  1: 'MOCK_TEST_DURATION_GRAMMAR',
  2: 'MOCK_TEST_DURATION_LISTENING',
  3: 'MOCK_TEST_DURATION_READING',
  4: 'MOCK_TEST_DURATION_WRITING',
  5: 'MOCK_TEST_DURATION_SPEAKING',
};
const DEFAULT_DURATION: Record<number, number> = {
  1: 25,
  2: 30,
  3: 30,
  4: 30,
  5: 15,
};

@Injectable()
export class ExamSetsService {
  constructor(private prisma: PrismaService) {}

  // ───────────────────────── Tạo đề + tự sinh sections/parts ─────────────────────────
  async create(dto: CreateExamSetDto, userId: number) {
    this.validateTypeConstraints(dto);
    if (dto.type !== ExamType.MOCK_TEST) {
      await this.validatePartNumber(dto); // skill tồn tại + partNumber trong total_parts
    }

    const skills = await this.prisma.skill.findMany({ orderBy: { id: 'asc' } });
    if (skills.length === 0) {
      throw new BadRequestException(
        'Chưa có dữ liệu kỹ năng (skills) — hãy chạy seed trước',
      );
    }
    const durations = await this.loadDurations();

    return this.prisma.$transaction(async (tx) => {
      const examSet = await tx.examSet.create({
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type,
          skillId: dto.type === ExamType.MOCK_TEST ? null : dto.skillId,
          partNumber:
            dto.type === ExamType.PART_PRACTICE ? dto.partNumber : null,
          createdBy: userId,
        },
      });

      // Xác định danh sách section cần sinh: MOCK_TEST = 5 skill; còn lại = 1 skill.
      const sectionSkills =
        dto.type === ExamType.MOCK_TEST
          ? skills
          : skills.filter((s) => s.id === dto.skillId);

      for (const [index, skill] of sectionSkills.entries()) {
        const section = await tx.examSection.create({
          data: {
            examId: examSet.id,
            skillId: skill.id,
            durationMinutes:
              durations[skill.id] ?? DEFAULT_DURATION[skill.id] ?? 30,
            orderIndex: index,
          },
        });

        // PART_PRACTICE: 1 part duy nhất (đúng partNumber đã chọn).
        // SKILL_FULL_SET / MOCK_TEST: đủ N parts theo skills.total_parts.
        const partNumbers =
          dto.type === ExamType.PART_PRACTICE
            ? [dto.partNumber as number]
            : Array.from({ length: skill.totalParts }, (_, i) => i + 1);

        await tx.examPart.createMany({
          data: partNumbers.map((pn) => ({
            sectionId: section.id,
            partNumber: pn,
          })),
        });
      }

      return this.findOneTx(tx, examSet.id);
    });
  }

  // Ràng buộc type <-> skillId/partNumber (tương đương CHECK constraint trong SQL).
  private validateTypeConstraints(dto: CreateExamSetDto): void {
    switch (dto.type) {
      case ExamType.PART_PRACTICE:
        if (!dto.skillId || !dto.partNumber) {
          throw new BadRequestException(
            'PART_PRACTICE cần cả skillId và partNumber',
          );
        }
        break;
      case ExamType.SKILL_FULL_SET:
        if (!dto.skillId) {
          throw new BadRequestException('SKILL_FULL_SET cần skillId');
        }
        if (dto.partNumber) {
          throw new BadRequestException(
            'SKILL_FULL_SET không dùng partNumber (tự sinh đủ các phần)',
          );
        }
        break;
      case ExamType.MOCK_TEST:
        if (dto.skillId || dto.partNumber) {
          throw new BadRequestException(
            'MOCK_TEST không dùng skillId/partNumber (tự sinh đủ 5 kỹ năng)',
          );
        }
        break;
    }
  }

  // Kiểm tra thêm partNumber nằm trong total_parts (chỉ PART_PRACTICE).
  private async validatePartNumber(dto: CreateExamSetDto): Promise<Skill> {
    const skill = await this.prisma.skill.findUnique({
      where: { id: dto.skillId },
    });
    if (!skill) throw new BadRequestException('Kỹ năng không tồn tại');
    if (
      dto.type === ExamType.PART_PRACTICE &&
      (dto.partNumber as number) > skill.totalParts
    ) {
      throw new BadRequestException(
        `Kỹ năng ${skill.name} chỉ có ${skill.totalParts} phần`,
      );
    }
    return skill;
  }

  private async loadDurations(): Promise<Record<number, number>> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { settingKey: { in: Object.values(DURATION_KEY_BY_SKILL) } },
    });
    const bySkill: Record<number, number> = {};
    for (const [skillId, key] of Object.entries(DURATION_KEY_BY_SKILL)) {
      const found = settings.find((s) => s.settingKey === key);
      if (found && !Number.isNaN(Number(found.settingValue))) {
        bySkill[Number(skillId)] = Number(found.settingValue);
      }
    }
    return bySkill;
  }

  // ───────────────────────── Đọc ─────────────────────────
  async findAll(
    page = 1,
    limit = 10,
    filters: {
      type?: ExamType;
      skillId?: number;
      isActive?: boolean;
      search?: string;
    } = {},
  ) {
    const where: Prisma.ExamSetWhereInput = { deletedAt: null };
    if (filters.type) where.type = filters.type;
    if (filters.skillId) where.skillId = filters.skillId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;
    const [result, total] = await this.prisma.$transaction([
      this.prisma.examSet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          skill: true,
          _count: { select: { sections: true, attempts: true } },
        },
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

  // Chi tiết đầy đủ: sections -> parts -> câu hỏi đã gán (kèm options).
  async findOne(id: number) {
    return this.findOneTx(this.prisma, id);
  }

  private async findOneTx(
    db: Prisma.TransactionClient | PrismaService,
    id: number,
  ) {
    const examSet = await db.examSet.findFirst({
      where: { id, deletedAt: null },
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
                  include: {
                    question: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!examSet) {
      throw new NotFoundException(`Không tìm thấy đề thi có ID = ${id}`);
    }
    return examSet;
  }

  // ───────────────────────── Cập nhật / xóa ─────────────────────────
  async update(id: number, dto: UpdateExamSetDto) {
    await this.ensureExists(id);
    return this.prisma.examSet.update({
      where: { id },
      data: { title: dto.title, description: dto.description },
    });
  }

  async toggleActive(id: number) {
    const examSet = await this.ensureExists(id);
    return this.prisma.examSet.update({
      where: { id },
      data: { isActive: !examSet.isActive },
    });
  }

  // Soft delete (sections/parts giữ nguyên trong DB, cascade chỉ khi xóa cứng).
  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.examSet.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Đã xóa đề thi' };
  }

  private async ensureExists(id: number) {
    const examSet = await this.prisma.examSet.findFirst({
      where: { id, deletedAt: null },
    });
    if (!examSet) {
      throw new NotFoundException(`Không tìm thấy đề thi có ID = ${id}`);
    }
    return examSet;
  }

  // ───────────────────────── Section / Part ─────────────────────────
  async updateSection(sectionId: number, dto: UpdateSectionDto) {
    const section = await this.prisma.examSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) {
      throw new NotFoundException(`Không tìm thấy section ID = ${sectionId}`);
    }
    return this.prisma.examSection.update({
      where: { id: sectionId },
      data: { durationMinutes: dto.durationMinutes },
    });
  }

  async updatePart(partId: number, dto: UpdatePartDto) {
    const part = await this.prisma.examPart.findUnique({
      where: { id: partId },
    });
    if (!part) {
      throw new NotFoundException(`Không tìm thấy part ID = ${partId}`);
    }
    return this.prisma.examPart.update({
      where: { id: partId },
      data: { instruction: dto.instruction, audioUrl: dto.audioUrl },
    });
  }
}
