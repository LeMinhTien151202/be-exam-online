import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export enum FileType {
  PDF = 'PDF',
  VIDEO = 'VIDEO',
  DOCX = 'DOCX',
  PPTX = 'PPTX',
  XLSX = 'XLSX',
  ZIP = 'ZIP',
  LINK = 'LINK',
}
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { UpdateStudyMaterialDto } from './dto/update-study-material.dto';

@Injectable()
export class StudyMaterialsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateStudyMaterialDto, teacherId: number) {
    return this.prisma.studyMaterial.create({
      data: {
        title: dto.title,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType,
        durationSeconds: dto.durationSeconds,
        skillId: dto.skillId,
        teacherId,
      },
    });
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: { skillId?: number; fileType?: FileType; search?: string } = {},
  ) {
    const where: Prisma.StudyMaterialWhereInput = { deletedAt: null };
    if (filters.skillId) where.skillId = filters.skillId;
    if (filters.fileType) where.fileType = filters.fileType as any;
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;
    const [result, total] = await this.prisma.$transaction([
      this.prisma.studyMaterial.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: { skill: true },
      }),
      this.prisma.studyMaterial.count({ where }),
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
    const material = await this.prisma.studyMaterial.findFirst({
      where: { id, deletedAt: null },
      include: { skill: true },
    });
    if (!material) {
      throw new NotFoundException(`Không tìm thấy tài liệu ID = ${id}`);
    }
    return material;
  }

  async update(id: number, dto: UpdateStudyMaterialDto) {
    await this.findOne(id);
    return this.prisma.studyMaterial.update({
      where: { id },
      data: {
        title: dto.title,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType,
        durationSeconds: dto.durationSeconds,
        skillId: dto.skillId,
        teacherId: dto.teacherId,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.studyMaterial.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Đã xóa tài liệu' };
  }
}
