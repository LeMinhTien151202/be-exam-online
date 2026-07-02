import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ExamSetsService } from './exam-sets.service';
import { ExamPartQuestionsService } from './exam-part-questions.service';
import { CreateExamSetDto } from './dto/create-exam-set.dto';
import { UpdateExamSetDto } from './dto/update-exam-set.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import {
  AssignQuestionsDto,
  ReorderQuestionsDto,
} from './dto/assign-questions.dto';
import { ResponseMessage, Roles, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';

@ApiTags('Exam Sets')
@ApiBearerAuth('token')
@Roles(Role.ADMIN, Role.TEACHER)
@Controller('exam-sets')
export class ExamSetsController {
  constructor(
    private readonly examSetsService: ExamSetsService,
    private readonly partQuestionsService: ExamPartQuestionsService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Tạo đề — tự sinh sections + parts theo loại (PART_PRACTICE / SKILL_FULL_SET / MOCK_TEST)',
  })
  @ResponseMessage('Tạo đề thi thành công')
  create(@Body() dto: CreateExamSetDto, @User() user: IUser) {
    return this.examSetsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đề (lọc type/skill/isActive)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'type', required: false, enum: ExamType })
  @ApiQuery({ name: 'skillId', required: false })
  @ApiQuery({ name: 'isActive', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'search', required: false })
  @ResponseMessage('Lấy danh sách đề thi thành công')
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('type') type?: ExamType,
    @Query('skillId') skillId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.examSetsService.findAll(Number(page), Number(limit), {
      type,
      skillId: skillId ? Number(skillId) : undefined,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đề: sections → parts → câu hỏi đã gán' })
  @ResponseMessage('Lấy chi tiết đề thi thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.examSetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Sửa tiêu đề / mô tả đề' })
  @ResponseMessage('Cập nhật đề thi thành công')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamSetDto,
  ) {
    return this.examSetsService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Bật/tắt hiển thị đề cho học viên' })
  @ResponseMessage('Đổi trạng thái đề thi thành công')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.examSetsService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm đề thi' })
  @ResponseMessage('Xóa đề thi thành công')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.examSetsService.remove(id);
  }
}

@ApiTags('Exam Sets')
@ApiBearerAuth('token')
@Roles(Role.ADMIN, Role.TEACHER)
@Controller('exam-sections')
export class ExamSectionsController {
  constructor(private readonly examSetsService: ExamSetsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Chỉnh thời gian làm bài của section' })
  @ResponseMessage('Cập nhật section thành công')
  updateSection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.examSetsService.updateSection(id, dto);
  }
}

@ApiTags('Exam Sets')
@ApiBearerAuth('token')
@Roles(Role.ADMIN, Role.TEACHER)
@Controller('exam-parts')
export class ExamPartsController {
  constructor(
    private readonly examSetsService: ExamSetsService,
    private readonly partQuestionsService: ExamPartQuestionsService,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Chỉnh instruction / audio chung của part' })
  @ResponseMessage('Cập nhật part thành công')
  updatePart(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePartDto,
  ) {
    return this.examSetsService.updatePart(id, dto);
  }

  @Post(':id/questions')
  @ApiOperation({
    summary: 'Gán câu hỏi từ ngân hàng vào part (validate cùng skill + part)',
  })
  @ResponseMessage('Gán câu hỏi thành công')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignQuestionsDto,
  ) {
    return this.partQuestionsService.assign(id, dto);
  }

  @Patch(':id/questions/reorder')
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự câu hỏi trong part' })
  @ResponseMessage('Sắp xếp câu hỏi thành công')
  reorder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.partQuestionsService.reorder(id, dto);
  }

  @Delete(':id/questions/:questionId')
  @ApiOperation({ summary: 'Gỡ câu hỏi khỏi part' })
  @ResponseMessage('Gỡ câu hỏi thành công')
  unassign(
    @Param('id', ParseIntPipe) id: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return this.partQuestionsService.unassign(id, questionId);
  }
}
