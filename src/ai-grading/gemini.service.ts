import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  Part,
  ResponseSchema,
} from '@google/generative-ai';

// Wrapper Gemini: structured JSON output + retry/timeout. Tự tắt nếu thiếu API key.
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly modelName: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly client?: GoogleGenerativeAI;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('GEMINI_API_KEY') || '';
    this.modelName = config.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash';
    this.timeoutMs = Number(config.get('GEMINI_TIMEOUT_MS') || 45000);
    this.maxRetries = Number(config.get('GEMINI_MAX_RETRIES') || 2);
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.logger.log(`Gemini bật (model: ${this.modelName})`);
    } else {
      this.logger.warn('GEMINI_API_KEY trống — chấm AI sẽ bị bỏ qua');
    }
  }

  get enabled(): boolean {
    return !!this.client;
  }

  async generateJson<T>(parts: Part[], schema: ResponseSchema): Promise<T> {
    if (!this.client) throw new Error('GEMINI_API_KEY chưa cấu hình');
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(
          model.generateContent({ contents: [{ role: 'user', parts }] }),
        );
        return JSON.parse(result.response.text()) as T;
      } catch (err) {
        lastErr = err;
        if (attempt < this.maxRetries) {
          await sleep(500 * (attempt + 1)); // backoff
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Gemini lỗi');
  }

  private withTimeout<T>(p: Promise<T>): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), this.timeoutMs),
      ),
    ]);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
