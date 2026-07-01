import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Kích hoạt GoogleStrategy: /auth/google redirect sang Google, /auth/google/callback nhận kết quả.
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
