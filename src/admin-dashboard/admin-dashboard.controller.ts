import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminDashboardService } from './admin-dashboard.service';
import { ResponseMessage, Roles } from '../decorator/customize';

@ApiTags('Admin Dashboard')
@ApiBearerAuth('token')
@Roles(Role.ADMIN)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'ADMIN: KPI + phân bổ câu hỏi/đề/kỹ năng' })
  @ResponseMessage('Lấy tổng quan dashboard thành công')
  summary() {
    return this.service.summary();
  }

  @Get('activity')
  @ApiOperation({ summary: 'ADMIN: chuỗi hoạt động theo ngày/tuần (area chart)' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiQuery({ name: 'bucket', required: false, enum: ['day', 'week'] })
  @ResponseMessage('Lấy hoạt động thành công')
  activity(
    @Query('days') days = '30',
    @Query('bucket') bucket: 'day' | 'week' = 'day',
  ) {
    return this.service.activity(Number(days), bucket === 'week' ? 'week' : 'day');
  }

  @Get('recent-students')
  @ApiOperation({ summary: 'ADMIN: học viên đăng ký mới nhất' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ResponseMessage('Lấy học viên mới thành công')
  recentStudents(@Query('limit') limit = '5') {
    return this.service.recentStudents(Number(limit));
  }

  @Get('recent-tests')
  @ApiOperation({ summary: 'ADMIN: bài làm/nộp mới nhất' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ResponseMessage('Lấy bài làm mới thành công')
  recentTests(@Query('limit') limit = '5') {
    return this.service.recentTests(Number(limit));
  }

  @Get('activities')
  @ApiOperation({ summary: 'ADMIN: nhật ký hoạt động gần đây (timeline)' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ResponseMessage('Lấy nhật ký hoạt động thành công')
  activities(@Query('limit') limit = '5') {
    return this.service.activities(Number(limit));
  }
}
