import { QuestionType } from '@prisma/client';

// Câu hỏi tối giản dùng để chấm.
export interface GradableQuestion {
  id: number;
  skillId: number;
  partNumber: number;
  questionType: QuestionType;
  extraConfig: Record<string, unknown> | null;
}

export interface GradeResult {
  questionId: number;
  questionType: QuestionType;
  earned: number; // số ý đúng
  total: number; // tổng số ý auto-chấm được
  autoGraded: boolean;
  needsAiGrading: boolean; // ESSAY / RECORD chờ Gemini (Phase 6)
}

const cfg = (q: GradableQuestion): Record<string, unknown> =>
  (q.extraConfig ?? {}) as Record<string, unknown>;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

/**
 * Chấm 1 câu hỏi theo question_type + extra_config.
 * `response` là đáp án học viên gửi (shape tuỳ dạng — xem EXAM_SUBMIT bên dưới).
 */
export function gradeQuestion(
  q: GradableQuestion,
  response: unknown,
): GradeResult {
  const base = { questionId: q.id, questionType: q.questionType };
  switch (q.questionType) {
    case QuestionType.ESSAY:
    case QuestionType.RECORD:
      return { ...base, earned: 0, total: 0, autoGraded: false, needsAiGrading: true };
    case QuestionType.MC:
      return { ...gradeMc(q, response), ...base, autoGraded: true, needsAiGrading: false };
    case QuestionType.ORDERING:
      return { ...gradeOrdering(q, response), ...base, autoGraded: true, needsAiGrading: false };
    case QuestionType.WORD_BANK:
      return { ...gradeWordBank(q, response), ...base, autoGraded: true, needsAiGrading: false };
    case QuestionType.HEADING_MATCH:
      return { ...gradeHeadingMatch(q, response), ...base, autoGraded: true, needsAiGrading: false };
    case QuestionType.SPEAKER_MATCH:
      return { ...gradeSpeakerMatch(q, response), ...base, autoGraded: true, needsAiGrading: false };
    default:
      return { ...base, earned: 0, total: 0, autoGraded: false, needsAiGrading: false };
  }
}

// MC có 3 biến thể: gap-fill (gaps) / agreement (choice_kind) / MC thường (options).
function gradeMc(q: GradableQuestion, response: unknown) {
  const e = cfg(q);

  // Reading P1 gap-fill: response = number[] (index đã chọn cho mỗi gap).
  if (Array.isArray(e.gaps)) {
    const gaps = arr(e.gaps);
    const ans = arr(response);
    let earned = 0;
    gaps.forEach((g, i) => {
      const gap = asObj(g);
      if (typeof ans[i] === 'number' && ans[i] === gap.correct_index) earned++;
    });
    return { earned, total: gaps.length };
  }

  // Listening P3 Man/Woman/Both: response = "MAN"|"WOMAN"|"BOTH".
  if (e.choice_kind === 'SPEAKER_AGREEMENT') {
    return { earned: response === e.correct ? 1 : 0, total: 1 };
  }

  // MC thường: response = index đáp án đã chọn (0-based).
  const options = arr(e.options).map(asObj);
  const correctIndex = options.findIndex((o) => o.is_correct === true);
  return { earned: response === correctIndex ? 1 : 0, total: 1 };
}

// ORDERING: response = number[] thứ tự. All-or-nothing.
function gradeOrdering(q: GradableQuestion, response: unknown) {
  const correct = arr(cfg(q).correct_order);
  const ans = arr(response);
  const ok =
    correct.length > 0 &&
    correct.length === ans.length &&
    correct.every((v, i) => v === ans[i]);
  return { earned: ok ? 1 : 0, total: 1 };
}

// WORD_BANK: response = { [slot_id]: "answer" }.
function gradeWordBank(q: GradableQuestion, response: unknown) {
  const slots = arr(cfg(q).slots).map(asObj);
  const ans = asObj(response);
  let earned = 0;
  slots.forEach((s) => {
    const id = String(s.slot_id);
    if (ans[id] !== undefined && ans[id] === s.correct_answer) earned++;
  });
  return { earned, total: slots.length };
}

// HEADING_MATCH: response = { [paragraph_label]: "heading" }.
function gradeHeadingMatch(q: GradableQuestion, response: unknown) {
  const answers = arr(cfg(q).answers).map(asObj);
  const ans = asObj(response);
  let earned = 0;
  answers.forEach((a) => {
    const label = String(a.paragraph_label);
    if (ans[label] !== undefined && ans[label] === a.correct_heading) earned++;
  });
  return { earned, total: answers.length };
}

// SPEAKER_MATCH: Listening (speakers -> correct_answer, response keyed speaker_index)
// hoặc Reading (questions -> correct_person, response = array theo index câu hỏi).
function gradeSpeakerMatch(q: GradableQuestion, response: unknown) {
  const e = cfg(q);

  if (Array.isArray(e.speakers)) {
    const speakers = arr(e.speakers).map(asObj);
    const ans = asObj(response);
    let earned = 0;
    speakers.forEach((s) => {
      const key = String(s.speaker_index);
      if (ans[key] !== undefined && ans[key] === s.correct_answer) earned++;
    });
    return { earned, total: speakers.length };
  }

  if (Array.isArray(e.questions)) {
    const questions = arr(e.questions).map(asObj);
    const ans = arr(response);
    let earned = 0;
    questions.forEach((qq, i) => {
      if (ans[i] !== undefined && ans[i] === qq.correct_person) earned++;
    });
    return { earned, total: questions.length };
  }

  return { earned: 0, total: 0 };
}

// Xoá mọi khoá đáp án khỏi extra_config trước khi trả đề cho học viên làm.
export function stripAnswers<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripAnswers(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Ẩn đáp án khỏi đề: is_correct, correct_*, và sample_answer (bài mẫu Writing).
      if (k === 'is_correct' || k === 'sample_answer' || k.startsWith('correct')) {
        continue;
      }
      out[k] = stripAnswers(v);
    }
    return out as unknown as T;
  }
  return value;
}
