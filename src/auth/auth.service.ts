import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { IUser } from '../users/users.interface';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { IJwtPayload } from './passport/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // LocalStrategy gọi: trả về IUser nếu hợp lệ, null nếu sai.
  async validateUser(email: string, password: string): Promise<IUser | null> {
    const user = await this.usersService.findByEmailWithSecret(email);
    if (!user) return null;
    if (user.status === UserStatus.LOCKED) {
      throw new UnauthorizedException('Tài khoản đã bị khoá');
    }
    const matched = await bcrypt.compare(password, user.passwordHash);
    if (!matched) return null;
    return { id: user.id, email: user.email, role: user.role };
  }

  async register(dto: RegisterDto) {
    return this.usersService.register(dto.email, dto.password, dto.full_name);
  }

  // Google OAuth: tìm user theo email, chưa có thì tạo mới (STUDENT). Trả IUser để cấp JWT.
  async validateGoogleUser(profile: {
    emails?: { value: string }[];
    displayName?: string;
  }): Promise<IUser> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('Tài khoản Google không cung cấp email');
    }
    const existing = await this.usersService.findByEmailWithSecret(email);
    if (existing) {
      if (existing.status === UserStatus.LOCKED) {
        throw new UnauthorizedException('Tài khoản đã bị khoá');
      }
      return { id: existing.id, email: existing.email, role: existing.role };
    }
    const created = await this.usersService.registerOAuth(
      email,
      profile.displayName || email,
    );
    return { id: created.id, email: created.email, role: created.role };
  }

  async login(user: IUser, response: Response) {
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.createRefreshToken(payload, response);
    // Kèm fullName (nằm ở bảng user_profiles) để FE khỏi phải gọi thêm /auth/account.
    const fullName = await this.usersService.getFullName(user.id);
    return { access_token, refresh_token, user: { ...user, fullName } };
  }

  // Refresh stateless: chỉ xác thực chữ ký + hạn (schema users không lưu refresh token).
  async processNewToken(refreshToken: string, response: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Không tìm thấy refresh token');
    }
    let payload: IJwtPayload;
    try {
      payload = this.jwtService.verify<IJwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
    const newPayload: IJwtPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    const access_token = this.jwtService.sign(newPayload);
    const refresh_token = this.createRefreshToken(newPayload, response);
    return { access_token, refresh_token };
  }

  logout(response: Response) {
    response.clearCookie('refresh_token');
    return { message: 'Đăng xuất thành công' };
  }

  async changePassword(user: IUser, dto: ChangePasswordDto) {
    const record = await this.usersService.findByIdWithSecret(user.id);
    if (!record) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }
    const matched = await bcrypt.compare(dto.oldPassword, record.passwordHash);
    if (!matched) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    await this.usersService.updatePassword(user.id, dto.newPassword);
    return { message: 'Đổi mật khẩu thành công' };
  }

  private createRefreshToken(payload: IJwtPayload, response: Response): string {
    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES',
      ) as JwtSignOptions['expiresIn'],
    });
    // maxAge lấy từ chính exp của token để khớp JWT_REFRESH_EXPIRES.
    const decoded = this.jwtService.decode(refresh_token) as { exp?: number };
    const maxAge = decoded?.exp
      ? decoded.exp * 1000 - Date.now()
      : 7 * 24 * 60 * 60 * 1000;
    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      maxAge,
    });
    return refresh_token;
  }
}
