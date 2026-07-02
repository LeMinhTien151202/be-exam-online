import { Module } from '@nestjs/common';
import { StudyMaterialsService } from './study-materials.service';
import { StudyMaterialsController } from './study-materials.controller';

@Module({
  controllers: [StudyMaterialsController],
  providers: [StudyMaterialsService],
})
export class StudyMaterialsModule {}
