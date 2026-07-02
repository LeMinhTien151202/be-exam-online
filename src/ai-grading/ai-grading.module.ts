import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { AiGradingService } from './ai-grading.service';

@Module({
  providers: [GeminiService, AiGradingService],
  exports: [AiGradingService],
})
export class AiGradingModule {}
