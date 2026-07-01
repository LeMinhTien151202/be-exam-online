import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Kích hoạt LocalStrategy cho route đăng nhập.
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
