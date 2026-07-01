import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Không bao giờ trả passwordHash ra ngoài.
const userSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  profile: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  // Dùng cho AuthService.validateUser — cần cả passwordHash để so khớp.
  findByEmailWithSecret(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // Dùng cho đổi mật khẩu — cần passwordHash hiện tại.
  findByIdWithSecret(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Đăng ký công khai: luôn tạo STUDENT.
  async register(email: string, password: string, fullName: string) {
    return this.createUserWithProfile(email, password, fullName, Role.STUDENT);
  }

  // Đăng ký qua OAuth (Google): tạo STUDENT với mật khẩu ngẫu nhiên (không dùng để login pass).
  async registerOAuth(email: string, fullName: string) {
    const randomPassword = randomBytes(24).toString('hex');
    return this.createUserWithProfile(
      email,
      randomPassword,
      fullName,
      Role.STUDENT,
    );
  }

  // ADMIN tạo user với role tuỳ ý.
  async create(dto: CreateUserDto) {
    return this.createUserWithProfile(
      dto.email,
      dto.password,
      dto.full_name,
      dto.role,
    );
  }

  private async createUserWithProfile(
    email: string,
    password: string,
    fullName: string,
    role: Role,
  ) {
    const existed = await this.prisma.user.findUnique({ where: { email } });
    if (existed) {
      throw new BadRequestException(`Email ${email} đã được sử dụng`);
    }
    const passwordHash = await this.hashPassword(password);
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        profile: { create: { fullName } },
      },
      select: userSelect,
    });
  }

  async findAll(
    page = 1,
    limit = 10,
    filters: { role?: Role; status?: UserStatus; search?: string } = {},
  ) {
    const where: Prisma.UserWhereInput = {};
    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.email = { contains: filters.search, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;
    const [result, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        select: userSelect,
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng có ID = ${id}`);
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role, status: dto.status },
      select: userSelect,
    });
  }

  // users không có deleted_at → "xóa" = khoá tài khoản (status LOCKED).
  async lock(id: number) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.LOCKED },
      select: userSelect,
    });
  }

  async updatePassword(id: number, newPassword: string) {
    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
