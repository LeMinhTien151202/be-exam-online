import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { ResponseMessage } from '../decorator/customize';

@ApiTags('Skills')
@ApiBearerAuth('token')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách 5 kỹ năng APTIS' })
  @ResponseMessage('Lấy danh sách kỹ năng thành công')
  findAll() {
    return this.skillsService.findAll();
  }
}
