import { Injectable, Logger } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import {
  Part,
  ResponseSchema,
  SchemaType as GSchemaType,
} from '@google/generative-ai';
import { GeminiService } from './gemini.service';

export interface SubjectiveItem {
  questionId: number;
  questionType: QuestionType; // ESSAY | RECORD
  content?: string | null; // đề bài
  extraConfig?: Record<string, unknown> | null;
  response: unknown; // ESSAY: text; RECORD: url audio
}

export interface AiGradeResult {
  questionId: number;
  questionType: QuestionType;
  aiScore: number | null; // 0-100
  band: string | null; // A1..C
  feedback: string | null;
  needsManualReview: boolean;
}

interface GeminiGrade {
  score: number;
  band: string;
  feedback: string;
}

const gradeSchema: ResponseSchema = {
  type: GSchemaType.OBJECT,
  properties: {
    score: { type: GSchemaType.NUMBER, description: 'Điểm 0-100' },
    band: { type: GSchemaType.STRING, description: 'CEFR band: A1, A2, B1, B2, C' },
    feedback: { type: GSchemaType.STRING, description: 'Nhận xét ngắn gọn' },
  },
  required: ['score', 'band', 'feedback'],
};

@Injectable()
export class AiGradingService {
  private readonly logger = new Logger(AiGradingService.name);

  constructor(private readonly gemini: GeminiService) {}

  // Chấm nhiều câu tự luận SONG SONG. Câu lỗi -> needsManualReview, không làm hỏng cả bài.
  async gradeMany(items: SubjectiveItem[]): Promise<AiGradeResult[]> {
    return Promise.all(items.map((it) => this.gradeOne(it)));
  }

  private async gradeOne(item: SubjectiveItem): Promise<AiGradeResult> {
    if (!this.gemini.enabled) {
      return this.manual(item, 'Chưa cấu hình GEMINI_API_KEY');
    }
    try {
      if (item.questionType === QuestionType.ESSAY) {
        return await this.gradeEssay(item);
      }
      if (item.questionType === QuestionType.RECORD) {
        return await this.gradeSpeaking(item);
      }
      return this.manual(item, 'Dạng không hỗ trợ chấm AI');
    } catch (err) {
      this.logger.warn(
        `Chấm AI câu ${item.questionId} lỗi: ${(err as Error).message}`,
      );
      return this.manual(item, (err as Error).message);
    }
  }

  private async gradeEssay(item: SubjectiveItem): Promise<AiGradeResult> {
    const text = typeof item.response === 'string' ? item.response : '';
    if (!text.trim()) return this.manual(item, 'Bài viết rỗng');

    const cfg = (item.extraConfig ?? {}) as Record<string, unknown>;
    const prompt = [
      'Bạn là giám khảo APTIS Writing. Chấm bài viết theo thang CEFR (A1..C), điểm 0-100.',
      'Tiêu chí: hoàn thành yêu cầu, ngữ pháp, từ vựng, liên kết câu, và văn phong (register) nếu có.',
      `Đề bài: ${item.content ?? ''}`,
      cfg.register_type ? `Văn phong yêu cầu: ${cfg.register_type}` : '',
      cfg.word_limit_min && cfg.word_limit_max
        ? `Giới hạn từ: ${cfg.word_limit_min}-${cfg.word_limit_max}`
        : '',
      `Bài viết của thí sinh:\n"""${text}"""`,
      'Trả về JSON { score, band, feedback }.',
    ]
      .filter(Boolean)
      .join('\n');

    const grade = await this.gemini.generateJson<GeminiGrade>(
      [{ text: prompt }],
      gradeSchema,
    );
    return this.fromGrade(item, grade);
  }

  private async gradeSpeaking(item: SubjectiveItem): Promise<AiGradeResult> {
    const url = typeof item.response === 'string' ? item.response : '';
    if (!url.trim()) return this.manual(item, 'Thiếu URL audio');

    // Tải audio từ storage -> base64 để gửi Gemini multimodal.
    const res = await fetch(url);
    if (!res.ok) return this.manual(item, `Không tải được audio (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType = guessAudioMime(url);

    const cfg = (item.extraConfig ?? {}) as Record<string, unknown>;
    const promptText = [
      'Bạn là giám khảo APTIS Speaking. Nghe đoạn ghi âm và chấm theo thang CEFR (A1..C), điểm 0-100.',
      'Tiêu chí: nội dung liên quan, ngữ pháp, từ vựng, độ trôi chảy (fluency), phát âm (định tính).',
      `Câu hỏi: ${item.content ?? ''}`,
      cfg.response_time_seconds
        ? `Thời lượng nói cho phép: ${cfg.response_time_seconds}s`
        : '',
      'Trả về JSON { score, band, feedback }.',
    ]
      .filter(Boolean)
      .join('\n');

    const parts: Part[] = [
      { text: promptText },
      { inlineData: { mimeType, data: buffer.toString('base64') } },
    ];
    const grade = await this.gemini.generateJson<GeminiGrade>(parts, gradeSchema);
    return this.fromGrade(item, grade);
  }

  private fromGrade(item: SubjectiveItem, grade: GeminiGrade): AiGradeResult {
    const score = Math.max(0, Math.min(100, Math.round(grade.score)));
    return {
      questionId: item.questionId,
      questionType: item.questionType,
      aiScore: score,
      band: grade.band ?? null,
      feedback: grade.feedback ?? null,
      needsManualReview: false,
    };
  }

  private manual(item: SubjectiveItem, reason: string): AiGradeResult {
    return {
      questionId: item.questionId,
      questionType: item.questionType,
      aiScore: null,
      band: null,
      feedback: reason,
      needsManualReview: true,
    };
  }
}

function guessAudioMime(url: string): string {
  const u = url.toLowerCase();
  if (u.endsWith('.mp3')) return 'audio/mp3';
  if (u.endsWith('.wav')) return 'audio/wav';
  if (u.endsWith('.m4a')) return 'audio/mp4';
  if (u.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/mpeg';
}
