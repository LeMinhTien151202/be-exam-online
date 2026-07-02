import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController, AttemptsController } from './exams.controller';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [ProgressModule],
  controllers: [ExamsController, AttemptsController],
  providers: [ExamsService],
})
export class ExamsModule {}
