import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { SetMenuAccessDto } from './dto/set-menu-access.dto';
import { ResponseMessage, Roles, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';

@ApiTags('Menus')
@ApiBearerAuth('token')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get('me')
  @ApiOperation({ summary: 'Sidebar theo role của tôi (dạng cây)' })
  @ResponseMessage('Lấy menu thành công')
  getMyMenus(@User() user: IUser) {
    return this.menusService.getMenusForRole(user.role);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ADMIN: toàn bộ menu (cây)' })
  @ResponseMessage('Lấy danh sách menu thành công')
  findAll() {
    return this.menusService.findAllTree();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ADMIN: tạo menu' })
  @ResponseMessage('Tạo menu thành công')
  create(@Body() dto: CreateMenuDto) {
    return this.menusService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ADMIN: cập nhật menu' })
  @ResponseMessage('Cập nhật menu thành công')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMenuDto) {
    return this.menusService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ADMIN: xóa menu' })
  @ResponseMessage('Xóa menu thành công')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menusService.remove(id);
  }

  @Put(':id/access')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ADMIN: gán role được thấy menu' })
  @ResponseMessage('Cập nhật phân quyền menu thành công')
  setAccess(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetMenuAccessDto,
  ) {
    return this.menusService.setAccess(id, dto.roles);
  }
}
