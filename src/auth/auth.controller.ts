import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LocalAuthGuard } from './local-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { Public, ResponseMessage, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản STUDENT' })
  @ResponseMessage('Đăng ký thành công')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiBody({ type: LoginDto })
  @ResponseMessage('Đăng nhập thành công')
  login(
    @User() user: IUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(user, response);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Bắt đầu đăng nhập Google (trình duyệt sẽ redirect sang Google)' })
  googleAuth() {
    // GoogleAuthGuard tự redirect sang trang consent của Google. Handler không chạy.
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Callback Google — cấp JWT hoặc redirect về frontend' })
  async googleCallback(@User() user: IUser, @Res() response: Response) {
    const result = await this.authService.login(user, response);
    const redirect = this.configService.get<string>('GOOGLE_SUCCESS_REDIRECT');
    if (redirect) {
      return response.redirect(
        `${redirect}?access_token=${result.access_token}`,
      );
    }
    return response.json({
      code: 200,
      success: true,
      message: 'Đăng nhập Google thành công',
      messages: [],
      data: result,
      metaData: null,
    });
  }

  @Get('account')
  @ApiBearerAuth('token')
  @ApiOperation({ summary: 'Thông tin tài khoản hiện tại' })
  @ResponseMessage('Lấy thông tin tài khoản thành công')
  getAccount(@User() user: IUser) {
    return this.usersService.findOne(user.id);
  }

  @Public()
  @Get('refresh')
  @ApiOperation({ summary: 'Cấp lại access token từ cookie refresh_token' })
  @ResponseMessage('Làm mới token thành công')
  refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.['refresh_token'];
    return this.authService.processNewToken(refreshToken, response);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth('token')
  @ApiOperation({ summary: 'Đăng xuất' })
  @ResponseMessage('Đăng xuất thành công')
  logout(@Res({ passthrough: true }) response: Response) {
    return this.authService.logout(response);
  }

  @Patch('change-password')
  @ApiBearerAuth('token')
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @ResponseMessage('Đổi mật khẩu thành công')
  changePassword(@User() user: IUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }
}
