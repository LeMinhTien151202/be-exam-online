import 'dotenv/config';
import { readFile, readdir, stat, writeFile, rename } from 'fs/promises';
import { basename, join, relative, resolve } from 'path';
import { inflateRawSync } from 'zlib';
import { ExamType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getPartConfig } from '../../../../src/question-bank/question-config';

interface ApiEnvelope<T> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

interface LoginData {
  access_token: string;
}

interface UploadData {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

interface UploadManifestEntry extends UploadData {
  sourceSize: number;
  sourceMtimeMs: number;
}

type UploadManifest = Record<string, UploadManifestEntry>;
type PartNumber = 1 | 2 | 3 | 4;

interface QuestionMarker {
  index: number;
  number: number;
  remainder: string;
}

interface QuestionBlock {
  marker: QuestionMarker;
  lines: string[];
}

interface PreparedQuestion {
  seedKey: string;
  partNumber: PartNumber;
  content: string;
  sourceAudio: string;
  extraConfig: Record<string, unknown>;
  orderIndex: number;
}

interface ListeningSeedSet {
  testNumber: number;
  title: string;
  description: string;
  sourceDocument: string;
  questions: PreparedQuestion[];
}

const LISTENING_SKILL_ID = 2;
const LISTENING_DURATION_MINUTES = 30;
const LISTENING_ROOT = resolve(process.cwd(), 'Trong diem listening');
const AUDIO_ROOT = join(LISTENING_ROOT, 'audio');
const UPLOAD_MANIFEST_PATH = join(AUDIO_ROOT, 'upload-manifest.json');
const API_BASE_URL = (
  process.env.SEED_API_BASE_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '123456';

const PART_INSTRUCTIONS: Record<PartNumber, string> = {
  1: 'Listen to each short recording and choose the correct answer.',
  2: 'Listen to four speakers and match each speaker with the correct statement. Two statements are not needed.',
  3: 'Listen to the conversation and decide whether each opinion is expressed by the man, the woman, or both.',
  4: 'Listen to each monologue and answer the two multiple-choice questions.',
};

const PART_2_DISTRACTORS: Record<number, string[]> = {
  1: ['Swimming', 'Going to the gym'],
  2: ['Lose weight', 'Exercise as a hobby'],
  3: [
    'protects the environment by using public transport.',
    'protects the environment by recycling household waste.',
  ],
  4: ['Visiting art exhibitions.', 'Collecting paintings.'],
  5: ['It makes product comparison easier.', 'It avoids crowded shops.'],
  6: ['Prefer to study early in the morning.', 'Prefer to study with friends.'],
  7: ['Cycle to work.', 'Travel by train.'],
  8: ['it makes product comparison easier', 'it avoids crowded shops'],
  9: ['use less electricity', 'use less water'],
  10: ['in the park', 'in the countryside'],
  11: ['Early in the morning', 'With friends'],
  12: ['shop online', 'read the news'],
  13: ['While reading', 'While exercising'],
  14: ['Shop online', 'Read the news'],
  15: ['While reading', 'While exercising'],
};

function findZipEntry(archive: Buffer, entryName: string): Buffer {
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;
  const searchStart = Math.max(0, archive.length - 65_557);
  let eocdOffset = -1;

  for (let offset = archive.length - 22; offset >= searchStart; offset--) {
    if (archive.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0)
    throw new Error('File Word không có ZIP directory hợp lệ.');

  const entryCount = archive.readUInt16LE(eocdOffset + 10);
  let cursor = archive.readUInt32LE(eocdOffset + 16);
  for (let index = 0; index < entryCount; index++) {
    if (archive.readUInt32LE(cursor) !== centralSignature) {
      throw new Error('Central directory của file Word không hợp lệ.');
    }
    const compressionMethod = archive.readUInt16LE(cursor + 10);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const filenameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const filename = archive
      .subarray(cursor + 46, cursor + 46 + filenameLength)
      .toString('utf8');

    if (filename === entryName) {
      if (archive.readUInt32LE(localOffset) !== localSignature) {
        throw new Error(`Local ZIP header không hợp lệ: ${entryName}`);
      }
      const localFilenameLength = archive.readUInt16LE(localOffset + 26);
      const localExtraLength = archive.readUInt16LE(localOffset + 28);
      const dataStart =
        localOffset + 30 + localFilenameLength + localExtraLength;
      const compressed = archive.subarray(
        dataStart,
        dataStart + compressedSize,
      );
      if (compressionMethod === 0) return Buffer.from(compressed);
      if (compressionMethod === 8) return inflateRawSync(compressed);
      throw new Error(
        `Không hỗ trợ ZIP compression method ${compressionMethod}: ${entryName}`,
      );
    }
    cursor += 46 + filenameLength + extraLength + commentLength;
  }
  throw new Error(`Không tìm thấy ${entryName} trong file Word.`);
}

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractParagraphs(archive: Buffer) {
  const xml = findZipEntry(archive, 'word/document.xml').toString('utf8');
  const paragraphs: string[] = [];
  for (const paragraph of xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ||
    []) {
    const text = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((match) => decodeXml(match[1]))
      .join('')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

function parseMarker(line: string): Omit<QuestionMarker, 'index'> | null {
  const match = line.match(/^Questi+on\s+(\d+)\s*:\s*(.*)$/i);
  if (!match) return null;
  return { number: Number(match[1]), remainder: match[2].trim() };
}

function collectMarkers(paragraphs: string[]) {
  return paragraphs.flatMap((line, index) => {
    const marker = parseMarker(line);
    return marker ? [{ ...marker, index }] : [];
  });
}

function toBlocks(
  paragraphs: string[],
  markers: QuestionMarker[],
  finalEnd = paragraphs.length,
) {
  const blocks = new Map<number, QuestionBlock>();
  markers.forEach((marker, index) => {
    const end = markers[index + 1]?.index ?? finalEnd;
    blocks.set(marker.number, {
      marker,
      lines: paragraphs.slice(marker.index + 1, end),
    });
  });
  return blocks;
}

function isTimer(line: string) {
  return /^\d+:\d+\/\d+:\d+$/.test(line.trim());
}

function usefulLines(block: QuestionBlock) {
  return block.lines.filter(
    (line) =>
      !isTimer(line) &&
      !/^(II\.?\s*)?(ANSWER|ANSWERS|ĐÁP ÁN)$/i.test(line) &&
      !/^FILE NGHE\s*:/i.test(line),
  );
}

function blockContent(block: QuestionBlock) {
  if (block.marker.remainder) return block.marker.remainder;
  const content = usefulLines(block)[0];
  if (!content)
    throw new Error(`Question ${block.marker.number} không có nội dung.`);
  return content;
}

function stripOptionLabel(line: string) {
  const match = line.match(/^([ABC])\s*(?:\.\s*|\)\s*|-\s*|\s+)(.+)$/i);
  return match
    ? { label: match[1].toUpperCase(), content: match[2].trim() }
    : null;
}

function stripCorrectPrefix(line: string) {
  return line
    .replace(/^(Correct answer|Đáp án đúng|Right answer|Answer)\s*:\s*/i, '')
    .trim();
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function editDistance(left: string, right: string) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function canonicalAnswer(answer: string, options: string[], context: string) {
  const normalized = normalizeText(answer);
  const exact = options.find((option) => normalizeText(option) === normalized);
  if (exact) return exact;
  const fuzzy = options.find((option) => {
    const candidate = normalizeText(option);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });
  if (fuzzy) return fuzzy;
  const nearest = options
    .map((option) => ({
      option,
      distance: editDistance(normalized, normalizeText(option)),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (
    nearest &&
    nearest.distance <= Math.max(2, Math.floor(normalized.length * 0.08))
  ) {
    return nearest.option;
  }
  throw new Error(
    `${context}: đáp án "${answer}" không khớp [${options.join(' | ')}].`,
  );
}

function correctAnswers(block: QuestionBlock | undefined) {
  if (!block) return [];
  return usefulLines(block)
    .filter((line) =>
      /^(Correct answer|Đáp án đúng|Right answer|Answer)\s*:/i.test(line),
    )
    .map(stripCorrectPrefix);
}

function parsePart1(
  testNumber: number,
  questionNumber: number,
  initial: QuestionBlock,
  answer: QuestionBlock | undefined,
) {
  const lines = usefulLines(initial);
  const content = blockContent(initial);
  const optionLines = lines
    .slice(initial.marker.remainder ? 0 : 1)
    .map(stripOptionLabel)
    .filter(Boolean) as { label: string; content: string }[];
  const byLabel = new Map(
    optionLines.map((option) => [option.label, option.content]),
  );
  let options = ['A', 'B', 'C']
    .map((label) => byLabel.get(label))
    .filter(Boolean) as string[];
  if (options.length === 0) {
    const fallback = lines.slice(initial.marker.remainder ? 0 : 1);
    if (fallback.length === 3) options = fallback;
  }
  if (options.length !== 3) {
    throw new Error(
      `Test ${testNumber} Q${questionNumber}: cần 3 lựa chọn, thấy ${options.length}.`,
    );
  }

  let correct = correctAnswers(answer)[0];
  if (!correct && testNumber === 2 && questionNumber === 1)
    correct = 'The window';
  if (!correct)
    throw new Error(
      `Test ${testNumber} Q${questionNumber}: thiếu đáp án đúng.`,
    );
  const canonical = canonicalAnswer(
    correct,
    options,
    `Test ${testNumber} Q${questionNumber}`,
  );
  return {
    content,
    extraConfig: {
      options: options.map((option) => ({
        content: option,
        is_correct: option === canonical,
      })),
    },
  };
}

function cleanSpeakerAnswer(value: string) {
  return stripCorrectPrefix(value).replace(/_+$/g, '').trim();
}

function parsePart2(
  testNumber: number,
  initial: QuestionBlock,
  answer: QuestionBlock | undefined,
) {
  if (!answer) throw new Error(`Test ${testNumber} Q14: thiếu phần đáp án.`);
  const content = blockContent(initial);
  const initialLines = usefulLines(initial).slice(
    initial.marker.remainder ? 0 : 1,
  );
  const pool: string[] = [];
  for (const line of initialLines) {
    if (/^Topic\s*:/i.test(line)) continue;
    if (!pool.some((item) => normalizeText(item) === normalizeText(line)))
      pool.push(line);
  }

  const speakers: { speaker_index: number; correct_answer: string }[] = [];
  const answerLines = usefulLines(answer);
  for (let index = 0; index < answerLines.length; index++) {
    if (answerLines[index].includes(':')) continue;
    const match = answerLines[index].match(/^Speaker\s*([A-D])(?:\b|[._])/i);
    if (!match) continue;
    const raw = answerLines[index + 1];
    if (!raw)
      throw new Error(
        `Test ${testNumber} Q14: Speaker ${match[1]} thiếu đáp án.`,
      );
    const value = cleanSpeakerAnswer(raw);
    if (!pool.some((item) => normalizeText(item) === normalizeText(value)))
      pool.push(value);
    speakers.push({
      speaker_index: match[1].toUpperCase().charCodeAt(0) - 64,
      correct_answer: value,
    });
  }
  const uniqueSpeakers = new Map(
    speakers.map((speaker) => [speaker.speaker_index, speaker]),
  );
  if (uniqueSpeakers.size !== 4) {
    throw new Error(
      `Test ${testNumber} Q14: cần 4 speaker, thấy ${uniqueSpeakers.size}.`,
    );
  }

  for (const distractor of PART_2_DISTRACTORS[testNumber] || []) {
    if (pool.length >= 6) break;
    if (!pool.some((item) => normalizeText(item) === normalizeText(distractor)))
      pool.push(distractor);
  }
  if (pool.length !== 6) {
    throw new Error(
      `Test ${testNumber} Q14: options_pool phải có 6, thấy ${pool.length}.`,
    );
  }
  const canonicalSpeakers = [...uniqueSpeakers.values()]
    .sort((a, b) => a.speaker_index - b.speaker_index)
    .map((speaker) => ({
      ...speaker,
      correct_answer: canonicalAnswer(
        speaker.correct_answer,
        pool,
        `Test ${testNumber} Q14`,
      ),
    }));
  return {
    content,
    extraConfig: { options_pool: pool, speakers: canonicalSpeakers },
  };
}

function parsePart3(
  testNumber: number,
  initial: QuestionBlock,
  answer: QuestionBlock | undefined,
) {
  if (!answer) throw new Error(`Test ${testNumber} Q15: thiếu phần đáp án.`);
  const content = blockContent(initial);
  const lines = usefulLines(answer);
  const statements: { statement: string; correct: 'MAN' | 'WOMAN' | 'BOTH' }[] =
    [];
  for (let index = 1; index < lines.length; index++) {
    const value = lines[index].trim().toUpperCase();
    if (!['MAN', 'WOMAN', 'BOTH'].includes(value)) continue;
    const statement = lines[index - 1].replace(/_+$/g, '').trim();
    statements.push({ statement, correct: value as 'MAN' | 'WOMAN' | 'BOTH' });
  }
  if (statements.length !== 4) {
    throw new Error(
      `Test ${testNumber} Q15: cần 4 statement, thấy ${statements.length}.`,
    );
  }
  return {
    content,
    extraConfig: { choice_kind: 'SPEAKER_AGREEMENT', statements },
  };
}

function parsePart4Questions(testNumber: number, initial: QuestionBlock) {
  const content = blockContent(initial);
  const lines = usefulLines(initial).slice(initial.marker.remainder ? 0 : 1);
  const questions: { question: string; options: string[] }[] = [];
  for (let index = 0; index < lines.length - 2; index++) {
    const a = stripOptionLabel(lines[index]);
    const b = stripOptionLabel(lines[index + 1]);
    const c = stripOptionLabel(lines[index + 2]);
    if (a?.label !== 'A' || b?.label !== 'B' || c?.label !== 'C') continue;
    let questionIndex = index - 1;
    while (questionIndex >= 0 && stripOptionLabel(lines[questionIndex]))
      questionIndex--;
    const question = lines[questionIndex]?.trim();
    if (!question || question === content) {
      throw new Error(
        `Test ${testNumber} Q${initial.marker.number}: không tìm thấy câu MC trước lựa chọn A.`,
      );
    }
    questions.push({ question, options: [a.content, b.content, c.content] });
    index += 2;
  }
  if (questions.length !== 2) {
    throw new Error(
      `Test ${testNumber} Q${initial.marker.number}: cần 2 MC, thấy ${questions.length}.`,
    );
  }
  return { content, questions };
}

function parsePart4(
  testNumber: number,
  initial: QuestionBlock,
  answer: QuestionBlock | undefined,
) {
  const parsed = parsePart4Questions(testNumber, initial);
  const correct = correctAnswers(answer);
  if (correct.length !== 2) {
    throw new Error(
      `Test ${testNumber} Q${initial.marker.number}: cần 2 đáp án, thấy ${correct.length}.`,
    );
  }
  return {
    content: parsed.content,
    extraConfig: {
      questions: parsed.questions.map((question, index) => {
        const canonical = canonicalAnswer(
          correct[index],
          question.options,
          `Test ${testNumber} Q${initial.marker.number}.${index + 1}`,
        );
        return {
          question: question.question,
          options: question.options.map((option) => ({
            content: option,
            is_correct: option === canonical,
          })),
        };
      }),
    },
  };
}

function normalizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function questionNumberFromFilename(filename: string) {
  const match = normalizeFilename(filename).match(
    /cau[\s_-]*(\d+)(?:\.(\d+))?/,
  );
  return match
    ? { question: Number(match[1]), sub: match[2] ? Number(match[2]) : null }
    : null;
}

async function selectAudioSources(testNumber: number) {
  const folder = join(
    AUDIO_ROOT,
    `test-${String(testNumber).padStart(2, '0')}`,
  );
  const names = (await readdir(folder)).filter((name) =>
    name.toLowerCase().endsWith('.mp3'),
  );
  const selected = new Map<number, string>();
  for (let question = 1; question <= 17; question++) {
    const candidates = names.filter((name) => {
      const parsed = questionNumberFromFilename(name);
      if (!parsed || parsed.question !== question) return false;
      const normalized = normalizeFilename(name);
      if (question === 14) return normalized.includes('ghep_abcd');
      if (parsed.sub != null || normalized.includes('ghep_abcd')) return false;
      if (testNumber === 5 && question === 5 && normalized.includes('(2)'))
        return false;
      return true;
    });
    if (candidates.length !== 1) {
      throw new Error(
        `Test ${testNumber} Q${question}: cần đúng 1 audio, thấy ${candidates.length}: ${candidates.join(', ')}`,
      );
    }
    selected.set(question, join(folder, candidates[0]));
  }
  return selected;
}

function relativeSource(path: string) {
  return relative(process.cwd(), path).replace(/\\/g, '/');
}

function withProvenance(
  config: Record<string, unknown>,
  seedKey: string,
  sourceDocument: string,
  sourceAudio: string,
) {
  return {
    ...config,
    seed_key: seedKey,
    seed_source_document: sourceDocument,
    seed_source_audio: sourceAudio,
  };
}

async function buildSeedSet(testNumber: number): Promise<ListeningSeedSet> {
  const documentName = `LISTENING - TEST ${testNumber} - APTIS SV.docx`;
  const documentPath = join(LISTENING_ROOT, documentName);
  const [archive, audioSources] = await Promise.all([
    readFile(documentPath),
    selectAudioSources(testNumber),
  ]);
  const paragraphs = extractParagraphs(archive);
  const markers = collectMarkers(paragraphs);
  const initialMarkers = markers.slice(0, 17);
  const initialNumbers = initialMarkers
    .map((marker) => marker.number)
    .join(',');
  if (initialNumbers !== '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17') {
    throw new Error(
      `Test ${testNumber}: thứ tự câu đầu không hợp lệ: ${initialNumbers}`,
    );
  }
  const answerMarkers = markers.slice(17);
  const answerHeaderIndex = paragraphs.findIndex(
    (line, index) =>
      index > initialMarkers[16].index &&
      /^(II\.?\s*)?(ANSWER|ANSWERS|ĐÁP ÁN)$/i.test(line),
  );
  const initialEnd =
    answerHeaderIndex >= 0
      ? answerHeaderIndex
      : (answerMarkers[0]?.index ?? paragraphs.length);
  const initialBlocks = toBlocks(paragraphs, initialMarkers, initialEnd);
  const answerBlocks = toBlocks(paragraphs, answerMarkers);
  const questions: PreparedQuestion[] = [];
  const sourceDocument = relativeSource(documentPath);

  for (let questionNumber = 1; questionNumber <= 13; questionNumber++) {
    const initial = initialBlocks.get(questionNumber);
    if (!initial)
      throw new Error(`Test ${testNumber}: thiếu Question ${questionNumber}.`);
    const parsed = parsePart1(
      testNumber,
      questionNumber,
      initial,
      answerBlocks.get(questionNumber),
    );
    const seedKey = `listening-test-${String(testNumber).padStart(2, '0')}-p1-q${questionNumber}`;
    const sourceAudio = relativeSource(audioSources.get(questionNumber)!);
    questions.push({
      seedKey,
      partNumber: 1,
      content: parsed.content,
      sourceAudio,
      extraConfig: withProvenance(
        parsed.extraConfig,
        seedKey,
        sourceDocument,
        sourceAudio,
      ),
      orderIndex: questionNumber - 1,
    });
  }

  const part2 = parsePart2(
    testNumber,
    initialBlocks.get(14)!,
    answerBlocks.get(14),
  );
  const p2Key = `listening-test-${String(testNumber).padStart(2, '0')}-p2`;
  const p2Audio = relativeSource(audioSources.get(14)!);
  questions.push({
    seedKey: p2Key,
    partNumber: 2,
    content: part2.content,
    sourceAudio: p2Audio,
    extraConfig: withProvenance(
      part2.extraConfig,
      p2Key,
      sourceDocument,
      p2Audio,
    ),
    orderIndex: 0,
  });

  const part3 = parsePart3(
    testNumber,
    initialBlocks.get(15)!,
    answerBlocks.get(15),
  );
  const p3Key = `listening-test-${String(testNumber).padStart(2, '0')}-p3`;
  const p3Audio = relativeSource(audioSources.get(15)!);
  questions.push({
    seedKey: p3Key,
    partNumber: 3,
    content: part3.content,
    sourceAudio: p3Audio,
    extraConfig: withProvenance(
      part3.extraConfig,
      p3Key,
      sourceDocument,
      p3Audio,
    ),
    orderIndex: 0,
  });

  for (const questionNumber of [16, 17]) {
    const parsed = parsePart4(
      testNumber,
      initialBlocks.get(questionNumber)!,
      answerBlocks.get(questionNumber),
    );
    const seedKey = `listening-test-${String(testNumber).padStart(2, '0')}-p4-q${questionNumber}`;
    const sourceAudio = relativeSource(audioSources.get(questionNumber)!);
    questions.push({
      seedKey,
      partNumber: 4,
      content: parsed.content,
      sourceAudio,
      extraConfig: withProvenance(
        parsed.extraConfig,
        seedKey,
        sourceDocument,
        sourceAudio,
      ),
      orderIndex: questionNumber - 16,
    });
  }

  return {
    testNumber,
    title: `APTIS Listening Test ${String(testNumber).padStart(2, '0')}`,
    description: `Bộ đề Listening số ${testNumber}, gồm đầy đủ 4 part và audio tương ứng.`,
    sourceDocument,
    questions,
  };
}

async function buildSeedSets() {
  const sets: ListeningSeedSet[] = [];
  for (let testNumber = 1; testNumber <= 15; testNumber++) {
    sets.push(await buildSeedSet(testNumber));
  }
  return sets;
}

function validateSets(
  sets: ListeningSeedSet[],
  mediaUrls?: Map<string, string>,
) {
  const partCounts = new Map<number, number>();
  for (const set of sets) {
    if (set.questions.length !== 17) {
      throw new Error(
        `${set.title}: cần 17 bản ghi, thấy ${set.questions.length}.`,
      );
    }
    for (const question of set.questions) {
      const mediaUrl =
        mediaUrls?.get(question.sourceAudio) || 'https://seed.local/audio.mp3';
      getPartConfig(LISTENING_SKILL_ID, question.partNumber).validate({
        content: question.content,
        mediaUrl,
        extraConfig: question.extraConfig,
      });
      partCounts.set(
        question.partNumber,
        (partCounts.get(question.partNumber) || 0) + 1,
      );
    }
  }
  const expected = new Map([
    [1, 195],
    [2, 15],
    [3, 15],
    [4, 30],
  ]);
  for (const [part, count] of expected) {
    if (partCounts.get(part) !== count) {
      throw new Error(
        `Listening Part ${part}: cần ${count} bản ghi, thấy ${partCounts.get(part) || 0}.`,
      );
    }
  }
  return Object.fromEntries(partCounts);
}

async function readApiResponse<T>(response: globalThis.Response) {
  const raw: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${JSON.stringify(raw, null, 2)}`);
  }
  return raw as ApiEnvelope<T>;
}

async function login() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const result = await readApiResponse<LoginData>(response);
  return result.data.access_token;
}

async function uploadAudio(
  accessToken: string,
  question: PreparedQuestion,
  testNumber: number,
) {
  const absolutePath = resolve(process.cwd(), question.sourceAudio);
  const audio = await readFile(absolutePath);
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(audio)], { type: 'audio/mpeg' }),
    basename(absolutePath),
  );
  const prefix = `listening/test-${String(testNumber).padStart(2, '0')}/p${question.partNumber}`;
  const response = await fetch(
    `${API_BASE_URL}/files/upload?folder_type=audio&prefix=${encodeURIComponent(prefix)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );
  return (await readApiResponse<UploadData>(response)).data;
}

async function loadUploadManifest(): Promise<UploadManifest> {
  try {
    return JSON.parse(
      await readFile(UPLOAD_MANIFEST_PATH, 'utf8'),
    ) as UploadManifest;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

async function saveUploadManifest(manifest: UploadManifest) {
  const temporary = `${UPLOAD_MANIFEST_PATH}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(temporary, UPLOAD_MANIFEST_PATH);
}

function asObject(value: Prisma.JsonValue | null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function loadReusableAudioUrls(prisma: PrismaClient, adminId: number) {
  const result = new Map<string, string>();
  const existing = await prisma.questionBank.findMany({
    where: { skillId: LISTENING_SKILL_ID, createdBy: adminId, deletedAt: null },
    select: { mediaUrl: true, extraConfig: true },
  });
  for (const question of existing) {
    const source = asObject(question.extraConfig)?.seed_source_audio;
    if (typeof source === 'string' && question.mediaUrl)
      result.set(source, question.mediaUrl);
  }
  return result;
}

async function prepareAudioUrls(
  prisma: PrismaClient,
  adminId: number,
  sets: ListeningSeedSet[],
) {
  const manifest = await loadUploadManifest();
  const urls = await loadReusableAudioUrls(prisma, adminId);
  const required = sets.flatMap((set) =>
    set.questions.map((question) => ({ set, question })),
  );

  for (const { question } of required) {
    if (urls.has(question.sourceAudio)) continue;
    const entry = manifest[question.sourceAudio];
    if (!entry) continue;
    const sourceStat = await stat(resolve(process.cwd(), question.sourceAudio));
    if (
      entry.sourceSize === sourceStat.size &&
      entry.sourceMtimeMs === sourceStat.mtimeMs
    ) {
      urls.set(question.sourceAudio, entry.url);
    }
  }

  const missing = required.filter(
    ({ question }) => !urls.has(question.sourceAudio),
  );
  if (missing.length === 0) {
    console.log(
      'Tái sử dụng toàn bộ 255 URL audio Listening đã upload trước đó.',
    );
    return urls;
  }

  console.log(
    `Cần upload ${missing.length}/${required.length} audio qua ${API_BASE_URL}.`,
  );
  const accessToken = await login();
  for (const [index, { set, question }] of missing.entries()) {
    const uploaded = await uploadAudio(accessToken, question, set.testNumber);
    const sourceStat = await stat(resolve(process.cwd(), question.sourceAudio));
    manifest[question.sourceAudio] = {
      ...uploaded,
      sourceSize: sourceStat.size,
      sourceMtimeMs: sourceStat.mtimeMs,
    };
    urls.set(question.sourceAudio, uploaded.url);
    await saveUploadManifest(manifest);
    console.log(
      `[${index + 1}/${missing.length}] ${question.sourceAudio} -> ${uploaded.url}`,
    );
  }
  return urls;
}

async function loadExistingSeedQuestions(
  prisma: PrismaClient,
  adminId: number,
) {
  const result = new Map<string, number>();
  const questions = await prisma.questionBank.findMany({
    where: { skillId: LISTENING_SKILL_ID, createdBy: adminId },
    select: { id: true, extraConfig: true },
  });
  for (const question of questions) {
    const key = asObject(question.extraConfig)?.seed_key;
    if (typeof key === 'string') result.set(key, question.id);
  }
  return result;
}

async function upsertQuestion(
  tx: Prisma.TransactionClient,
  question: PreparedQuestion,
  mediaUrl: string,
  adminId: number,
  existingByKey: Map<string, number>,
) {
  const config = getPartConfig(LISTENING_SKILL_ID, question.partNumber);
  config.validate({
    content: question.content,
    mediaUrl,
    extraConfig: question.extraConfig,
  });
  const data = {
    questionType: config.questionType,
    content: question.content,
    mediaUrl,
    extraConfig: question.extraConfig as Prisma.InputJsonValue,
    deletedAt: null,
  };
  const existingId = existingByKey.get(question.seedKey);
  if (existingId)
    return tx.questionBank.update({ where: { id: existingId }, data });
  const created = await tx.questionBank.create({
    data: {
      skillId: LISTENING_SKILL_ID,
      partNumber: question.partNumber,
      createdBy: adminId,
      ...data,
    },
  });
  existingByKey.set(question.seedKey, created.id);
  return created;
}

async function upsertListeningSet(
  prisma: PrismaClient,
  set: ListeningSeedSet,
  adminId: number,
  audioUrls: Map<string, string>,
  existingByKey: Map<string, number>,
) {
  return prisma.$transaction(async (tx) => {
    let exam = await tx.examSet.findFirst({
      where: {
        title: set.title,
        type: ExamType.SKILL_FULL_SET,
        skillId: LISTENING_SKILL_ID,
      },
    });
    if (exam) {
      exam = await tx.examSet.update({
        where: { id: exam.id },
        data: { description: set.description, isActive: true, deletedAt: null },
      });
    } else {
      exam = await tx.examSet.create({
        data: {
          title: set.title,
          description: set.description,
          type: ExamType.SKILL_FULL_SET,
          skillId: LISTENING_SKILL_ID,
          partNumber: null,
          isActive: true,
          createdBy: adminId,
        },
      });
    }

    let section = await tx.examSection.findFirst({
      where: { examId: exam.id, skillId: LISTENING_SKILL_ID },
    });
    if (section) {
      section = await tx.examSection.update({
        where: { id: section.id },
        data: { durationMinutes: LISTENING_DURATION_MINUTES, orderIndex: 0 },
      });
    } else {
      section = await tx.examSection.create({
        data: {
          examId: exam.id,
          skillId: LISTENING_SKILL_ID,
          durationMinutes: LISTENING_DURATION_MINUTES,
          orderIndex: 0,
        },
      });
    }

    let questionCount = 0;
    for (
      let partNumber = 1 as PartNumber;
      partNumber <= 4;
      partNumber++ as PartNumber
    ) {
      let part = await tx.examPart.findFirst({
        where: { sectionId: section.id, partNumber },
      });
      if (part) {
        part = await tx.examPart.update({
          where: { id: part.id },
          data: { instruction: PART_INSTRUCTIONS[partNumber], audioUrl: null },
        });
      } else {
        part = await tx.examPart.create({
          data: {
            sectionId: section.id,
            partNumber,
            instruction: PART_INSTRUCTIONS[partNumber],
          },
        });
      }

      const seeds = set.questions.filter(
        (question) => question.partNumber === partNumber,
      );
      const assignments: { questionId: number; orderIndex: number }[] = [];
      for (const question of seeds) {
        const mediaUrl = audioUrls.get(question.sourceAudio);
        if (!mediaUrl)
          throw new Error(`Thiếu URL audio: ${question.sourceAudio}`);
        const created = await upsertQuestion(
          tx,
          question,
          mediaUrl,
          adminId,
          existingByKey,
        );
        assignments.push({
          questionId: created.id,
          orderIndex: question.orderIndex,
        });
        questionCount++;
      }
      await tx.examPartQuestion.deleteMany({ where: { examPartId: part.id } });
      if (assignments.length) {
        await tx.examPartQuestion.createMany({
          data: assignments.map((assignment) => ({
            examPartId: part.id,
            ...assignment,
          })),
        });
      }
    }
    return { examId: exam.id, questionCount };
  });
}

async function dryRun() {
  const sets = await buildSeedSets();
  const partCounts = validateSets(sets);
  const selectedBytes = (
    await Promise.all(
      sets.flatMap((set) =>
        set.questions.map((question) =>
          stat(resolve(process.cwd(), question.sourceAudio)),
        ),
      ),
    )
  ).reduce((sum, item) => sum + item.size, 0);
  console.log(
    JSON.stringify(
      {
        examCount: sets.length,
        questionCount: sets.reduce((sum, set) => sum + set.questions.length, 0),
        partCounts,
        selectedAudioCount: sets.flatMap((set) => set.questions).length,
        selectedAudioMiB: Number((selectedBytes / 1024 / 1024).toFixed(2)),
      },
      null,
      2,
    ),
  );
}

async function verifyDatabase(
  prisma: PrismaClient,
  sets: ListeningSeedSet[],
  adminId: number,
) {
  const expectedTitles = sets.map((set) => set.title);
  const exams = await prisma.examSet.findMany({
    where: {
      title: { in: expectedTitles },
      type: ExamType.SKILL_FULL_SET,
      skillId: LISTENING_SKILL_ID,
      deletedAt: null,
    },
    include: {
      sections: {
        where: { skillId: LISTENING_SKILL_ID },
        include: {
          parts: {
            include: {
              questions: {
                orderBy: { orderIndex: 'asc' },
                include: { question: true },
              },
            },
          },
        },
      },
    },
  });
  if (exams.length !== sets.length) {
    throw new Error(
      `Database: cần ${sets.length} đề Listening, tìm thấy ${exams.length}.`,
    );
  }

  const assignedQuestionIds = new Set<number>();
  const assignedSeedKeys = new Set<string>();
  const partCounts: Record<PartNumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const set of sets) {
    const matches = exams.filter((exam) => exam.title === set.title);
    if (matches.length !== 1) {
      throw new Error(
        `Database: ${set.title} phải có đúng 1 bản ghi, tìm thấy ${matches.length}.`,
      );
    }
    const exam = matches[0];
    if (exam.sections.length !== 1) {
      throw new Error(
        `Database: ${set.title} phải có đúng 1 section Listening.`,
      );
    }
    const parts = exam.sections[0].parts;
    if (parts.length !== 4) {
      throw new Error(`Database: ${set.title} phải có đủ 4 part.`);
    }

    for (
      let partNumber = 1 as PartNumber;
      partNumber <= 4;
      partNumber++ as PartNumber
    ) {
      const matchingParts = parts.filter(
        (part) => part.partNumber === partNumber,
      );
      if (matchingParts.length !== 1) {
        throw new Error(
          `Database: ${set.title} part ${partNumber} phải có đúng 1 bản ghi.`,
        );
      }
      const expectedQuestions = set.questions
        .filter((question) => question.partNumber === partNumber)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const assignments = matchingParts[0].questions;
      if (assignments.length !== expectedQuestions.length) {
        throw new Error(
          `Database: ${set.title} part ${partNumber} cần ${expectedQuestions.length} câu, tìm thấy ${assignments.length}.`,
        );
      }
      assignments.forEach((assignment, index) => {
        const seedKey = asObject(assignment.question.extraConfig)?.seed_key;
        const expected = expectedQuestions[index];
        if (
          seedKey !== expected.seedKey ||
          assignment.orderIndex !== expected.orderIndex
        ) {
          throw new Error(
            `Database: sai thứ tự câu tại ${set.title} part ${partNumber}, vị trí ${index + 1}.`,
          );
        }
        if (
          assignment.question.partNumber !== partNumber ||
          !assignment.question.mediaUrl?.startsWith('https://')
        ) {
          throw new Error(
            `Database: câu ${expected.seedKey} thiếu part hoặc URL audio hợp lệ.`,
          );
        }
        assignedQuestionIds.add(assignment.questionId);
        assignedSeedKeys.add(seedKey);
        partCounts[partNumber]++;
      });
    }
  }

  const seededQuestions = (
    await prisma.questionBank.findMany({
      where: {
        skillId: LISTENING_SKILL_ID,
        createdBy: adminId,
        deletedAt: null,
      },
      select: { id: true, mediaUrl: true, extraConfig: true },
    })
  ).filter((question) => {
    const key = asObject(question.extraConfig)?.seed_key;
    return (
      typeof key === 'string' &&
      /^listening-test-\d{2}-(?:p[14]-q\d+|p[23])$/.test(key)
    );
  });
  const expectedQuestionCount = sets.reduce(
    (sum, set) => sum + set.questions.length,
    0,
  );
  if (
    seededQuestions.length !== expectedQuestionCount ||
    assignedQuestionIds.size !== expectedQuestionCount ||
    assignedSeedKeys.size !== expectedQuestionCount
  ) {
    throw new Error(
      `Database: số câu Listening không khớp (bank=${seededQuestions.length}, assigned=${assignedQuestionIds.size}, keys=${assignedSeedKeys.size}).`,
    );
  }

  return {
    examCount: exams.length,
    questionCount: seededQuestions.length,
    uniqueAudioUrlCount: new Set(
      seededQuestions.map((question) => question.mediaUrl),
    ).size,
    partCounts,
    examIds: exams.map((exam) => exam.id).sort((a, b) => a - b),
  };
}

async function main() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const sets = await buildSeedSets();
  validateSets(sets);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const [admin, listeningSkill] = await Promise.all([
      prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }),
      prisma.skill.findUnique({ where: { id: LISTENING_SKILL_ID } }),
    ]);
    if (!admin)
      throw new Error(
        `Không tìm thấy ADMIN ${ADMIN_EMAIL}. Hãy chạy pnpm db:seed trước.`,
      );
    if (!listeningSkill)
      throw new Error(
        'Chưa có skill Listening (id=2). Hãy chạy pnpm db:seed trước.',
      );

    if (process.argv.includes('--verify-only')) {
      console.log(
        JSON.stringify(await verifyDatabase(prisma, sets, admin.id), null, 2),
      );
      return;
    }

    const audioUrls = await prepareAudioUrls(prisma, admin.id, sets);
    validateSets(sets, audioUrls);
    const existingByKey = await loadExistingSeedQuestions(prisma, admin.id);
    const examIds: number[] = [];
    let questionCount = 0;
    for (const set of sets) {
      const result = await upsertListeningSet(
        prisma,
        set,
        admin.id,
        audioUrls,
        existingByKey,
      );
      examIds.push(result.examId);
      questionCount += result.questionCount;
      console.log(
        `${set.title}: examId=${result.examId}, questions=${result.questionCount}`,
      );
    }
    console.log(
      JSON.stringify(
        { examCount: sets.length, questionCount, examIds },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      'Seed Listening thất bại:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}

export { buildSeedSets, validateSets, verifyDatabase };
