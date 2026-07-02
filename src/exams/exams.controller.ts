import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExamType, Role } from '@prisma/client';
import { ExamsService } from './exams.service';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { ResponseMessage, Roles, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';

@ApiTags('Exams (Student)')
@ApiBearerAuth('token')
@Roles(Role.STUDENT)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đề đang mở (luyện tập / thi thử)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'type', required: false, enum: ExamType })
  @ApiQuery({ name: 'skillId', required: false })
  @ResponseMessage('Lấy danh sách đề thành công')
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('type') type?: ExamType,
    @Query('skillId') skillId?: string,
  ) {
    return this.examsService.listActive(Number(page), Number(limit), {
      type,
      skillId: skillId ? Number(skillId) : undefined,
    });
  }

  @Get(':id/take')
  @ApiOperation({ summary: 'Lấy đề để làm (đã ẩn đáp án)' })
  @ResponseMessage('Lấy đề thành công')
  take(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getForTaking(id);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary:
      'Nộp bài — chấm trắc nghiệm; luyện tập cập nhật tiến độ, thi thử lưu điểm tổng',
  })
  @ResponseMessage('Nộp bài thành công')
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitExamDto,
    @User() user: IUser,
  ) {
    return this.examsService.submit(id, dto, user.id);
  }
}

@ApiTags('Exams (Student)')
@ApiBearerAuth('token')
@Roles(Role.STUDENT)
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lịch sử thi thử của tôi' })
  @ResponseMessage('Lấy lịch sử thi thành công')
  myAttempts(@User() user: IUser) {
    return this.examsService.listMyAttempts(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 lần thi thử' })
  @ResponseMessage('Lấy chi tiết lần thi thành công')
  myAttempt(
    @User() user: IUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.examsService.getMyAttempt(user.id, id);
  }
}
