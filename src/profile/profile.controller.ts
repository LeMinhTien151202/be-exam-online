import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResponseMessage, User } from '../decorator/customize';
import { IUser } from '../users/users.interface';

@ApiTags('Profile')
@ApiBearerAuth('token')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Xem hồ sơ của tôi' })
  @ResponseMessage('Lấy hồ sơ thành công')
  getMe(@User() user: IUser) {
    return this.profileService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật hồ sơ của tôi' })
  @ResponseMessage('Cập nhật hồ sơ thành công')
  updateMe(@User() user: IUser, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateMe(user.id, dto);
  }
}
