import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { IUser } from '../../users/users.interface';

// Đăng nhập qua Google OAuth 2.0.
// Nếu chưa cấu hình GOOGLE_CLIENT_ID/SECRET, dùng placeholder để app vẫn boot được;
// các route /auth/google chỉ hoạt động khi đã điền credentials thật.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') ||
        'google-client-id-not-set',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ||
        'google-client-secret-not-set',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  // KHÔNG nhận `done` -> để NestJS tự gọi done(null, user) / done(err) khi throw.
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<IUser> {
    try {
      return await this.authService.validateGoogleUser(profile);
    } catch (err) {
      this.logger.error(`Google validate lỗi: ${(err as Error).message}`);
      throw err;
    }
  }
}
