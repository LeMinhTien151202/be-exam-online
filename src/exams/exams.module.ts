import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController, AttemptsController } from './exams.controller';
import { ProgressModule } from '../progress/progress.module';
import { AiGradingModule } from '../ai-grading/ai-grading.module';

@Module({
  imports: [ProgressModule, AiGradingModule],
  controllers: [ExamsController, AttemptsController],
  providers: [ExamsService],
})
export class ExamsModule {}
