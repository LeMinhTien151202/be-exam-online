import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private mockUsers = [
    { id: 1, email: 'tienle@example.com', name: 'Le Minh Tien', hoatDong: true },
    { id: 2, email: 'nguyenvana@example.com', name: 'Nguyen Van A', hoatDong: false },
    { id: 3, email: 'tranvanb@example.com', name: 'Tran Van B', hoatDong: true },
    { id: 4, email: 'phamthic@example.com', name: 'Pham Thi C', hoatDong: true },
    { id: 5, email: 'hoangvand@example.com', name: 'Hoang Van D', hoatDong: false },
  ];

  create(createUserDto: CreateUserDto) {
    const newUser = {
      id: this.mockUsers.length + 1,
      email: createUserDto.email,
      name: createUserDto.name,
      hoatDong: createUserDto.hoatDong ?? true,
    };
    this.mockUsers.push(newUser);
    return newUser;
  }

  findAll(page: number = 1, limit: number = 2) {
    const totalItems = this.mockUsers.length;
    const totalPage = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;
    const result = this.mockUsers.slice(skip, skip + limit);

    return {
      result,
      page,
      pageSize: limit,
      total: totalItems,
      totalPage,
    };
  }

  findOne(id: number) {
    const user = this.mockUsers.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng có ID = ${id}`);
    }
    return user;
  }
}
