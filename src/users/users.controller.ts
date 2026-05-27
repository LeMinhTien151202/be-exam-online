import { Controller, Get, Post, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResponseMessage } from '../decorator/customize';

@ApiTags('Users (Test API)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới một người dùng (Mock)' })
  @ResponseMessage('Tạo người dùng thành công')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng có phân trang (Mock)' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 2, description: 'Số lượng bản ghi trên một trang' })
  @ResponseMessage('Lấy danh sách người dùng thành công')
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 2,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một người dùng (Mock)' })
  @ResponseMessage('Lấy thông tin người dùng thành công')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
