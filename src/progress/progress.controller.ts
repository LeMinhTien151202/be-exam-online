import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProgressService } from './progress.service';
import { ResponseMessage, Roles, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';

@ApiTags('Progress')
@ApiBearerAuth('token')
@Roles(Role.STUDENT)
@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('progress/me')
  @ApiOperation({ summary: 'Bộ đếm câu đã làm theo (kỹ năng, phần)' })
  @ResponseMessage('Lấy tiến độ thành công')
  myProgress(@User() user: IUser) {
    return this.progressService.getMyProgress(user.id);
  }

  @Get('streaks/me')
  @ApiOperation({ summary: 'Chuỗi ngày học liên tiếp của tôi' })
  @ResponseMessage('Lấy streak thành công')
  myStreak(@User() user: IUser) {
    return this.progressService.getMyStreak(user.id);
  }
}
