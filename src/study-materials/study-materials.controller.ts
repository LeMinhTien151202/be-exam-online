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
import { FileType, Role } from '@prisma/client';
import { StudyMaterialsService } from './study-materials.service';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { UpdateStudyMaterialDto } from './dto/update-study-material.dto';
import { ResponseMessage, Roles, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';

@ApiTags('Study Materials')
@ApiBearerAuth('token')
@Controller('study-materials')
export class StudyMaterialsController {
  constructor(private readonly service: StudyMaterialsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Tạo tài liệu học (PDF/VIDEO)' })
  @ResponseMessage('Tạo tài liệu thành công')
  create(@Body() dto: CreateStudyMaterialDto, @User() user: IUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách tài liệu (lọc skill/fileType)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'skillId', required: false })
  @ApiQuery({ name: 'fileType', required: false, enum: FileType })
  @ApiQuery({ name: 'search', required: false })
  @ResponseMessage('Lấy danh sách tài liệu thành công')
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('skillId') skillId?: string,
    @Query('fileType') fileType?: FileType,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(Number(page), Number(limit), {
      skillId: skillId ? Number(skillId) : undefined,
      fileType,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết tài liệu' })
  @ResponseMessage('Lấy chi tiết tài liệu thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Cập nhật tài liệu' })
  @ResponseMessage('Cập nhật tài liệu thành công')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudyMaterialDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Xóa mềm tài liệu' })
  @ResponseMessage('Xóa tài liệu thành công')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
