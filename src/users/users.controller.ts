import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResponseMessage, Roles } from '../decorator/customize';

@ApiTags('Users (Admin)')
@ApiBearerAuth('token')
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'ADMIN tạo người dùng mới' })
  @ResponseMessage('Tạo người dùng thành công')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách người dùng (phân trang + lọc)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo email' })
  @ResponseMessage('Lấy danh sách người dùng thành công')
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('role') role?: Role,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(Number(page), Number(limit), {
      role,
      status,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một người dùng' })
  @ResponseMessage('Lấy thông tin người dùng thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật vai trò / trạng thái' })
  @ResponseMessage('Cập nhật người dùng thành công')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/lock')
  @ApiOperation({ summary: 'Khoá tài khoản (thay cho xóa)' })
  @ResponseMessage('Khoá tài khoản thành công')
  lock(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.lock(id);
  }
}
