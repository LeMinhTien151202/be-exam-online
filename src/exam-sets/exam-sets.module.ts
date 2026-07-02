import { Module } from '@nestjs/common';
import { ExamSetsService } from './exam-sets.service';
import { ExamPartQuestionsService } from './exam-part-questions.service';
import {
  ExamSetsController,
  ExamSectionsController,
  ExamPartsController,
} from './exam-sets.controller';

@Module({
  controllers: [
    ExamSetsController,
    ExamSectionsController,
    ExamPartsController,
  ],
  providers: [ExamSetsService, ExamPartQuestionsService],
  exports: [ExamSetsService],
})
export class ExamSetsModule {}
