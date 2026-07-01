import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  // Dữ liệu tĩnh (5 kỹ năng), seed sẵn qua prisma/seed.ts.
  findAll() {
    return this.prisma.skill.findMany({ orderBy: { id: 'asc' } });
  }
}
