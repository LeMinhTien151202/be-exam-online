import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

// Đăng nhập qua Google OAuth 2.0.
// Nếu chưa cấu hình GOOGLE_CLIENT_ID/SECRET, dùng placeholder để app vẫn boot được;
// các route /auth/google chỉ hoạt động khi đã điền credentials thật.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
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

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const user = await this.authService.validateGoogleUser(profile);
    done(null, user);
  }
}
