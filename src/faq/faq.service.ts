import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateFaqDto, userId: number) {
    return this.prisma.faq.create({
      data: {
        question: dto.question,
        answer: dto.answer,
        category: dto.category,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        createdBy: userId,
      },
    });
  }

  // Học viên: chỉ FAQ đang hiển thị. Admin: includeInactive=true để thấy cả ẩn.
  async findAll(
    page = 1,
    limit = 10,
    filters: { category?: string; search?: string; includeInactive?: boolean } = {},
  ) {
    const where: Prisma.FaqWhereInput = { deletedAt: null };
    if (!filters.includeInactive) where.isActive = true;
    if (filters.category) where.category = filters.category;
    if (filters.search) {
      where.OR = [
        { question: { contains: filters.search, mode: 'insensitive' } },
        { answer: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [result, total] = await this.prisma.$transaction([
      this.prisma.faq.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.faq.count({ where }),
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
    const faq = await this.prisma.faq.findFirst({
      where: { id, deletedAt: null },
    });
    if (!faq) throw new NotFoundException(`Không tìm thấy FAQ ID = ${id}`);
    return faq;
  }

  async update(id: number, dto: UpdateFaqDto) {
    await this.findOne(id);
    return this.prisma.faq.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.faq.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Đã xóa FAQ' };
  }
}
