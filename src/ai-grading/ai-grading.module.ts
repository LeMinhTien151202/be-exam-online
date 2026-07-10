import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { AiGradingService } from './ai-grading.service';
import { AiGradingController } from './ai-grading.controller';

@Module({
  controllers: [AiGradingController],
  providers: [GeminiService, AiGradingService],
  exports: [AiGradingService],
})
export class AiGradingModule {}
