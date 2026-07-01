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
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionType, Role } from '@prisma/client';
import { QuestionBankService } from './question-bank.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ResponseMessage, Roles, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';

@ApiTags('Question Bank')
@ApiBearerAuth('token')
@Roles(Role.ADMIN, Role.TEACHER)
@Controller('questions')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo câu hỏi (tự suy question_type + validate extra_config theo part)',
  })
  @ResponseMessage('Tạo câu hỏi thành công')
  create(@Body() dto: CreateQuestionDto, @User() user: IUser) {
    return this.questionBankService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách câu hỏi (lọc theo skill/part/type)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'skillId', required: false })
  @ApiQuery({ name: 'partNumber', required: false })
  @ApiQuery({ name: 'questionType', required: false, enum: QuestionType })
  @ApiQuery({ name: 'search', required: false })
  @ResponseMessage('Lấy danh sách câu hỏi thành công')
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('skillId') skillId?: string,
    @Query('partNumber') partNumber?: string,
    @Query('questionType') questionType?: QuestionType,
    @Query('search') search?: string,
  ) {
    return this.questionBankService.findAll(Number(page), Number(limit), {
      skillId: skillId ? Number(skillId) : undefined,
      partNumber: partNumber ? Number(partNumber) : undefined,
      questionType,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết câu hỏi' })
  @ResponseMessage('Lấy chi tiết câu hỏi thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionBankService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật câu hỏi (validate lại theo cấu hình part)' })
  @ResponseMessage('Cập nhật câu hỏi thành công')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionBankService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm câu hỏi' })
  @ResponseMessage('Xóa câu hỏi thành công')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionBankService.remove(id);
  }
}
