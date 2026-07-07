import { BadRequestException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';

/**
 * Cấu hình câu hỏi theo TỪNG (skill, part) của bài thi APTIS.
 * Mỗi part khóa cứng 1 question_type + có schema extra_config riêng.
 * Registry này vừa suy ra question_type từ (skillId, partNumber),
 * vừa validate extra_config/options tương ứng.
 *
 * Mapping (xem memory aptis-skill-parts):
 *  Skill 1 Grammar&Vocab:  P1 MC(grammar) · P2 WORD_BANK
 *  Skill 2 Listening:      P1 MC · P2 SPEAKER_MATCH · P3 MC(agreement) · P4 MC(monologue)
 *  Skill 3 Reading:        P1 MC(gap-fill) · P2 ORDERING · P3 ORDERING · P4 SPEAKER_MATCH · P5 HEADING_MATCH
 *  Skill 4 Writing:        P1..P4 ESSAY
 *  Skill 5 Speaking:       P1..P4 RECORD
 */

export interface QuestionPayload {
  content?: string | null;
  mediaUrl?: string | null;
  extraConfig?: Record<string, unknown> | null;
}

export interface PartConfig {
  questionType: QuestionType;
  label: string;
  validate: (p: QuestionPayload) => void;
}

// ───────────────────────── Helper assert ─────────────────────────
const bad = (msg: string): never => {
  throw new BadRequestException(msg);
};

function asString(v: unknown, name: string): string {
  if (typeof v !== 'string' || v.trim() === '') {
    bad(`${name} phải là chuỗi không rỗng`);
  }
  return v as string;
}

function asNumber(v: unknown, name: string): number {
  if (typeof v !== 'number' || Number.isNaN(v)) {
    bad(`${name} phải là số`);
  }
  return v as number;
}

function asArray(
  v: unknown,
  name: string,
  opts?: { min?: number; max?: number },
): unknown[] {
  if (!Array.isArray(v)) bad(`${name} phải là mảng`);
  const arr = v as unknown[];
  if (opts?.min != null && arr.length < opts.min) {
    bad(`${name} phải có ít nhất ${opts.min} phần tử`);
  }
  if (opts?.max != null && arr.length > opts.max) {
    bad(`${name} tối đa ${opts.max} phần tử`);
  }
  return arr;
}

function oneOf<T>(v: unknown, name: string, allowed: readonly T[]): T {
  if (!allowed.includes(v as T)) {
    bad(`${name} phải thuộc [${allowed.join(', ')}]`);
  }
  return v as T;
}

const ec = (p: QuestionPayload): Record<string, unknown> =>
  (p.extraConfig ?? {}) as Record<string, unknown>;
const obj = (v: unknown, name: string): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    bad(`${name} phải là object`);
  }
  return v as Record<string, unknown>;
};

// MC: đáp án nằm trong extra_config.options = [{ content, is_correct }].
// Đúng `count` đáp án, đúng 1 đáp án đúng.
function validateMcOptions(p: QuestionPayload, count = 3): void {
  const opts = asArray(ec(p).options, 'extra_config.options', {
    min: count,
    max: count,
  });
  let correct = 0;
  opts.forEach((o, i) => {
    const opt = obj(o, `options[${i}]`);
    asString(opt.content, `options[${i}].content`);
    if (typeof opt.is_correct !== 'boolean') {
      bad(`options[${i}].is_correct phải là boolean`);
    }
    if (opt.is_correct === true) correct++;
  });
  if (correct !== 1) bad('MC phải có đúng 1 đáp án đúng (is_correct = true)');
}

// ───────────────────────── Validators theo dạng ─────────────────────────

// Grammar P1 / Listening P1: MC 3 lựa chọn, có câu hỏi.
function validateMcPlain(mediaRequired: boolean) {
  return (p: QuestionPayload) => {
    asString(p.content, 'content (nội dung câu hỏi)');
    if (mediaRequired) asString(p.mediaUrl, 'mediaUrl (audio)');
    validateMcOptions(p, 3);
  };
}

// Grammar P2 Vocabulary: WORD_BANK 5 task_variant, pool 10, 5 slots.
function validateWordBank(p: QuestionPayload): void {
  const e = ec(p);
  oneOf(e.task_variant, 'extra_config.task_variant', [
    'DEFINITION',
    'COLLOCATION',
    'SENTENCE',
    'SYNONYM',
    'ANTONYM',
  ]);
  const pool = asArray(e.options_pool, 'extra_config.options_pool', {
    min: 10,
    max: 10,
  });
  pool.forEach((w, i) => asString(w, `options_pool[${i}]`));
  const slots = asArray(e.slots, 'extra_config.slots', { min: 5, max: 5 });
  slots.forEach((s, i) => {
    const slot = obj(s, `slots[${i}]`);
    asString(slot.slot_id, `slots[${i}].slot_id`);
    // prompt = đề của từng câu (định nghĩa / câu có chỗ trống / từ gốc để tìm đồng-trái nghĩa...)
    asString(slot.prompt, `slots[${i}].prompt`);
    const ans = asString(slot.correct_answer, `slots[${i}].correct_answer`);
    if (!pool.includes(ans)) {
      bad(`slots[${i}].correct_answer phải nằm trong options_pool`);
    }
  });
}

// Reading P2/P3: ORDERING 6 câu, câu đầu cố định.
function validateOrdering(p: QuestionPayload): void {
  const e = ec(p);
  if (e.fixed_first !== true) bad('extra_config.fixed_first phải = true');
  const pool = asArray(e.options_pool, 'extra_config.options_pool', {
    min: 6,
    max: 6,
  });
  pool.forEach((s, i) => asString(s, `options_pool[${i}]`));
  const order = asArray(e.correct_order, 'extra_config.correct_order', {
    min: 6,
    max: 6,
  });
  const seen = new Set<number>();
  order.forEach((n, i) => {
    const idx = asNumber(n, `correct_order[${i}]`);
    if (idx < 0 || idx > 5) bad(`correct_order[${i}] phải trong [0..5]`);
    if (seen.has(idx)) bad('correct_order không được trùng chỉ số');
    seen.add(idx);
  });
}

// Listening P2: SPEAKER_MATCH — 4 người nói ghép với 6 CÂU đáp án (thừa 2),
// mỗi đáp án dùng đúng 1 lần. Đáp án là câu văn trực tiếp (không nhãn A/B/C).
function validateListeningSpeakerMatch(p: QuestionPayload): void {
  const e = ec(p);
  const pool = asArray(e.options_pool, 'extra_config.options_pool', {
    min: 6,
    max: 6,
  });
  pool.forEach((s, i) => asString(s, `options_pool[${i}]`));
  const speakers = asArray(e.speakers, 'extra_config.speakers', {
    min: 4,
    max: 4,
  });
  const used = new Set<string>();
  speakers.forEach((s, i) => {
    const sp = obj(s, `speakers[${i}]`);
    asNumber(sp.speaker_index, `speakers[${i}].speaker_index`);
    const ans = asString(sp.correct_answer, `speakers[${i}].correct_answer`);
    if (!pool.includes(ans)) {
      bad(`speakers[${i}].correct_answer phải nằm trong options_pool`);
    }
    if (used.has(ans)) {
      bad('Mỗi đáp án chỉ được dùng 1 lần (speakers.correct_answer trùng nhau)');
    }
    used.add(ans);
  });
}

// Listening P3: MC dạng đồng ý — 1 hội thoại Man/Woman dùng chung 1 audio,
// GÓI cả cụm nhận định vào 1 DÒNG (không tách mỗi nhận định 1 bản ghi).
// Mỗi nhận định chọn MAN/WOMAN/BOTH. Audio chung ở media_url của câu.
function validateAgreement(p: QuestionPayload): void {
  const e = ec(p);
  oneOf(e.choice_kind, 'extra_config.choice_kind', ['SPEAKER_AGREEMENT']);
  const statements = asArray(e.statements, 'extra_config.statements', {
    min: 1,
  });
  statements.forEach((s, i) => {
    const st = obj(s, `statements[${i}]`);
    asString(st.statement, `statements[${i}].statement`);
    oneOf(st.correct, `statements[${i}].correct`, ['MAN', 'WOMAN', 'BOTH']);
  });
}

// Listening P4: MC monologue — MỖI BÀI NGHE = 1 DÒNG (audio riêng ở media_url),
// gói các câu MC của cùng bài nghe trong extra_config.questions.
function validateMonologueMc(p: QuestionPayload): void {
  asString(p.mediaUrl, 'mediaUrl (audio bài nghe)');
  const questions = asArray(ec(p).questions, 'extra_config.questions', {
    min: 1,
  });
  questions.forEach((q, i) => {
    const qq = obj(q, `questions[${i}]`);
    asString(qq.question, `questions[${i}].question`);
    const opts = asArray(qq.options, `questions[${i}].options`, {
      min: 3,
      max: 3,
    });
    let correct = 0;
    opts.forEach((o, j) => {
      const opt = obj(o, `questions[${i}].options[${j}]`);
      asString(opt.content, `questions[${i}].options[${j}].content`);
      if (typeof opt.is_correct !== 'boolean') {
        bad(`questions[${i}].options[${j}].is_correct phải là boolean`);
      }
      if (opt.is_correct === true) correct++;
    });
    if (correct !== 1) {
      bad(`questions[${i}] phải có đúng 1 đáp án đúng (is_correct = true)`);
    }
  });
}

// Reading P1: MC gap-fill — đoạn văn 5 chỗ trống, mỗi chỗ 3 đáp án riêng.
function validateGapFill(p: QuestionPayload): void {
  asString(p.content, 'content (đoạn văn có chỗ trống)');
  const gaps = asArray(ec(p).gaps, 'extra_config.gaps', { min: 5, max: 5 });
  gaps.forEach((g, i) => {
    const gap = obj(g, `gaps[${i}]`);
    asNumber(gap.gap_id, `gaps[${i}].gap_id`);
    const opts = asArray(gap.options, `gaps[${i}].options`, { min: 3, max: 3 });
    opts.forEach((o, j) => asString(o, `gaps[${i}].options[${j}]`));
    const ci = asNumber(gap.correct_index, `gaps[${i}].correct_index`);
    if (ci < 0 || ci > 2) bad(`gaps[${i}].correct_index phải trong [0..2]`);
  });
}

// Reading P4: SPEAKER_MATCH — 4 người + 7 câu hỏi (1 người chọn nhiều lần).
function validateReadingOpinionMatch(p: QuestionPayload): void {
  const e = ec(p);
  const people = asArray(e.people, 'extra_config.people', { min: 4, max: 4 });
  const keys = people.map((pp, i) => {
    const per = obj(pp, `people[${i}]`);
    asString(per.passage, `people[${i}].passage`);
    return asString(per.key, `people[${i}].key`);
  });
  const qs = asArray(e.questions, 'extra_config.questions', { min: 7, max: 7 });
  qs.forEach((q, i) => {
    const question = obj(q, `questions[${i}]`);
    asString(question.statement, `questions[${i}].statement`);
    const ans = asString(question.correct_person, `questions[${i}].correct_person`);
    if (!keys.includes(ans)) {
      bad(`questions[${i}].correct_person phải là key trong people`);
    }
  });
}

// Reading P5: HEADING_MATCH — 1 ví dụ mẫu (câu 0) + 7 đoạn cần trả lời,
// 8 tiêu đề trong pool (thừa 1). Đáp án là TIÊU ĐỀ (text), không phải nhãn A/B/C.
function validateHeadingMatch(p: QuestionPayload): void {
  const e = ec(p);
  // Câu 0 cho sẵn làm ví dụ (hiển thị đáp án mẫu cho thí sinh).
  const ex = obj(e.example, 'extra_config.example');
  asString(ex.paragraph_label, 'example.paragraph_label');
  asString(ex.paragraph_text, 'example.paragraph_text');
  asString(ex.correct_heading, 'example.correct_heading');

  const paras = asArray(e.paragraphs, 'extra_config.paragraphs', {
    min: 7,
    max: 7,
  });
  paras.forEach((pa, i) => {
    const par = obj(pa, `paragraphs[${i}]`);
    asString(par.label, `paragraphs[${i}].label`);
    asString(par.text, `paragraphs[${i}].text`);
  });
  const pool = asArray(e.headings_pool, 'extra_config.headings_pool', {
    min: 8,
    max: 8,
  });
  pool.forEach((h, i) => asString(h, `headings_pool[${i}]`));
  const answers = asArray(e.answers, 'extra_config.answers', { min: 7, max: 7 });
  answers.forEach((a, i) => {
    const ans = obj(a, `answers[${i}]`);
    asString(ans.paragraph_label, `answers[${i}].paragraph_label`);
    const heading = asString(ans.correct_heading, `answers[${i}].correct_heading`);
    if (!pool.includes(heading)) {
      bad(`answers[${i}].correct_heading phải nằm trong headings_pool`);
    }
  });
}

// WRITING — MỖI PART = 1 DÒNG, gói các câu con vào extra_config (không tách nhiều dòng).

function checkWordLimit(e: Record<string, unknown>, prefix = 'extra_config') {
  const min = asNumber(e.word_limit_min, `${prefix}.word_limit_min`);
  const max = asNumber(e.word_limit_max, `${prefix}.word_limit_max`);
  if (min > max) bad(`${prefix}: word_limit_min không được lớn hơn word_limit_max`);
}
// sample_answer = bài/đáp án mẫu (TUỲ CHỌN) nhập lúc tạo câu hỏi. Bị ẩn khỏi đề khi học viên làm.
function optSampleAnswer(o: Record<string, unknown>, name: string) {
  if (o.sample_answer != null) asString(o.sample_answer, name);
}

// Writing P1: form đăng ký — 5 ô điền ngắn. content = bối cảnh chung.
function validateWritingP1(p: QuestionPayload): void {
  asString(p.content, 'content (bối cảnh / form)');
  const e = ec(p);
  checkWordLimit(e);
  const prompts = asArray(e.prompts, 'extra_config.prompts', { min: 5, max: 5 });
  prompts.forEach((pr, i) => {
    const o = obj(pr, `prompts[${i}]`);
    asString(o.question, `prompts[${i}].question`);
    optSampleAnswer(o, `prompts[${i}].sample_answer`);
  });
}

// Writing P2: 1 đề, 20-30 từ (1 câu duy nhất).
function validateWritingP2(p: QuestionPayload): void {
  asString(p.content, 'content (đề bài)');
  const e = ec(p);
  checkWordLimit(e);
  optSampleAnswer(e, 'extra_config.sample_answer');
}

// Writing P3: chat room — 3 câu từ Member A/B/C, gói 3 prompt trong 1 dòng.
function validateWritingP3(p: QuestionPayload): void {
  asString(p.content, 'content (bối cảnh group chat)');
  const e = ec(p);
  checkWordLimit(e);
  const prompts = asArray(e.prompts, 'extra_config.prompts', { min: 3, max: 3 });
  prompts.forEach((pr, i) => {
    const o = obj(pr, `prompts[${i}]`);
    asString(o.speaker_name, `prompts[${i}].speaker_name`);
    asString(o.question, `prompts[${i}].question`);
    optSampleAnswer(o, `prompts[${i}].sample_answer`);
  });
}

// Writing P4: Formal & Informal — 2 task chung 1 tình huống, gói cả 2 trong 1 dòng.
function validateWritingP4(p: QuestionPayload): void {
  const e = ec(p);
  asString(e.context, 'extra_config.context (thông báo gốc)');
  const tasks = asArray(e.tasks, 'extra_config.tasks', { min: 2, max: 2 });
  tasks.forEach((t, i) => {
    const o = obj(t, `tasks[${i}]`);
    asString(o.task_label, `tasks[${i}].task_label`);
    asString(o.instruction, `tasks[${i}].instruction`);
    oneOf(o.register_type, `tasks[${i}].register_type`, ['FORMAL', 'INFORMAL']);
    const min = asNumber(o.word_limit_min, `tasks[${i}].word_limit_min`);
    const max = asNumber(o.word_limit_max, `tasks[${i}].word_limit_max`);
    if (min > max) bad(`tasks[${i}]: word_limit_min > word_limit_max`);
    optSampleAnswer(o, `tasks[${i}].sample_answer`);
  });
}

// Speaking P1..P4: RECORD. Ảnh lưu ở extra_config.image_urls (mảng),
// số lượng phải KHỚP image_count (P3 = 2 ảnh so sánh).
function validateRecord(p: QuestionPayload): void {
  asString(p.content, 'content (câu hỏi)');
  const e = ec(p);
  oneOf(e.response_time_seconds, 'extra_config.response_time_seconds', [
    30, 45, 120,
  ]);
  oneOf(e.prep_time_seconds, 'extra_config.prep_time_seconds', [0, 60]);
  const imageCount = oneOf(e.image_count, 'extra_config.image_count', [0, 1, 2]);

  if (imageCount > 0) {
    const imgs = asArray(e.image_urls, 'extra_config.image_urls', {
      min: imageCount,
      max: imageCount,
    });
    imgs.forEach((u, i) => asString(u, `image_urls[${i}]`));
  } else if (e.image_urls != null) {
    asArray(e.image_urls, 'extra_config.image_urls', { max: 0 });
  }
}

// ───────────────────────── Registry ─────────────────────────
const CONFIG: Record<string, PartConfig> = {
  // Grammar & Vocabulary
  '1-1': {
    questionType: QuestionType.MC,
    label: 'Grammar Part 1',
    validate: validateMcPlain(false),
  },
  '1-2': {
    questionType: QuestionType.WORD_BANK,
    label: 'Vocabulary Part 2',
    validate: validateWordBank,
  },
  // Listening
  '2-1': {
    questionType: QuestionType.MC,
    label: 'Listening Part 1',
    validate: validateMcPlain(true),
  },
  '2-2': {
    questionType: QuestionType.SPEAKER_MATCH,
    label: 'Listening Part 2',
    validate: validateListeningSpeakerMatch,
  },
  '2-3': {
    questionType: QuestionType.MC,
    label: 'Listening Part 3',
    validate: validateAgreement,
  },
  '2-4': {
    questionType: QuestionType.MC,
    label: 'Listening Part 4',
    validate: validateMonologueMc,
  },
  // Reading
  '3-1': {
    questionType: QuestionType.MC,
    label: 'Reading Part 1',
    validate: validateGapFill,
  },
  '3-2': {
    questionType: QuestionType.ORDERING,
    label: 'Reading Part 2',
    validate: validateOrdering,
  },
  '3-3': {
    questionType: QuestionType.ORDERING,
    label: 'Reading Part 3',
    validate: validateOrdering,
  },
  '3-4': {
    questionType: QuestionType.SPEAKER_MATCH,
    label: 'Reading Part 4',
    validate: validateReadingOpinionMatch,
  },
  '3-5': {
    questionType: QuestionType.HEADING_MATCH,
    label: 'Reading Part 5',
    validate: validateHeadingMatch,
  },
};

// Writing — MỖI PART 1 DÒNG (câu con gói trong extra_config).
CONFIG['4-1'] = {
  questionType: QuestionType.ESSAY,
  label: 'Writing Part 1 (5 ô điền)',
  validate: validateWritingP1,
};
CONFIG['4-2'] = {
  questionType: QuestionType.ESSAY,
  label: 'Writing Part 2 (đoạn ngắn)',
  validate: validateWritingP2,
};
CONFIG['4-3'] = {
  questionType: QuestionType.ESSAY,
  label: 'Writing Part 3 (chat 3 member)',
  validate: validateWritingP3,
};
CONFIG['4-4'] = {
  questionType: QuestionType.ESSAY,
  label: 'Writing Part 4 (Formal & Informal, 2 task)',
  validate: validateWritingP4,
};
// Speaking P1..P4 = RECORD
for (let pn = 1; pn <= 4; pn++) {
  CONFIG[`5-${pn}`] = {
    questionType: QuestionType.RECORD,
    label: `Speaking Part ${pn}`,
    validate: validateRecord,
  };
}

export function getPartConfig(skillId: number, partNumber: number): PartConfig {
  const cfg = CONFIG[`${skillId}-${partNumber}`];
  if (!cfg) {
    throw new BadRequestException(
      `Không hỗ trợ tạo câu hỏi cho kỹ năng ${skillId} - phần ${partNumber}`,
    );
  }
  return cfg;
}
