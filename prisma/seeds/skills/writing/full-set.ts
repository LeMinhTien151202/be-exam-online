import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join, relative, resolve } from 'path';
import { inflateRawSync } from 'zlib';
import { ExamType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getPartConfig } from '../../../../src/question-bank/question-config';
import {
  WRITING_SEED_SOURCE_MAP,
  WRITING_SOURCE_NOTICES,
  WritingSeedSourceMap,
} from './data';

type PartNumber = 1 | 2 | 3 | 4;

interface PromptWithSample {
  question: string;
  sample_answer: string;
}

interface Part23Topic {
  number: number;
  title: string;
  part2: PromptWithSample;
  part3: PromptWithSample[];
}

interface Part4Topic {
  number: number;
  title: string;
  context: string;
  informalInstruction: string;
  formalInstruction: string;
}

interface PreparedQuestion {
  seedKey: string;
  partNumber: PartNumber;
  content: string;
  extraConfig: Record<string, unknown>;
  orderIndex: number;
}

interface WritingSeedSet {
  testNumber: number;
  title: string;
  description: string;
  questions: PreparedQuestion[];
}

const WRITING_SKILL_ID = 4;
const WRITING_DURATION_MINUTES = 30;
const EXPECTED_EXAM_COUNT = 40;
const EXPECTED_QUESTION_RECORD_COUNT = 160;
const EXPECTED_ATOMIC_ITEM_COUNT = 440;
const SOURCE_ROOT = resolve(process.cwd(), 'writing');
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';

const SOURCE_FILES = {
  part1: 'Writing Part 1.docx',
  part23: 'TỔNG HỢP FULL 40 ĐỀ APTIS WRITING part 2 va 3.docx',
  part4: 'Part 4.docx',
} as const;

const PART_INSTRUCTIONS: Record<PartNumber, string> = {
  1: 'Complete all five form fields. Write 1-5 words for each answer.',
  2: 'Write a short response of 20-30 words.',
  3: 'Reply to Member A, Member B, and Member C. Write 30-40 words for each response.',
  4: 'Read the notice, then write one informal email of 50-75 words and one formal email of 120-150 words.',
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
        `Không hỗ trợ ZIP compression method ${compressionMethod}.`,
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

function normalizeLine(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.?!;:])/g, '$1')
    .trim();
}

function extractParagraphs(archive: Buffer) {
  const xml = findZipEntry(archive, 'word/document.xml').toString('utf8');
  const paragraphs: string[] = [];
  const stack: { parts: string[] }[] = [];
  const tokenPattern =
    /<w:p(?:\s[^>]*)?>|<\/w:p>|<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:tab\s*\/>|<w:br(?:\s[^>]*)?\/>/g;

  for (const match of xml.matchAll(tokenPattern)) {
    const token = match[0];
    if (/^<w:p(?:\s[^>]*)?>$/.test(token)) {
      stack.push({ parts: [] });
      continue;
    }
    if (token === '</w:p>') {
      const paragraph = stack.pop();
      if (!paragraph) continue;
      const text = paragraph.parts
        .join('')
        .split('\n')
        .map(normalizeLine)
        .filter(Boolean)
        .join('\n');
      if (text) paragraphs.push(text);
      continue;
    }
    if (!stack.length) continue;
    if (/^<w:tab\s*\/>$/.test(token)) {
      stack[stack.length - 1].parts.push(' ');
    } else if (/^<w:br(?:\s[^>]*)?\/>$/.test(token)) {
      stack[stack.length - 1].parts.push('\n');
    } else {
      const text = token.match(/^<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>$/)?.[1];
      if (text != null) stack[stack.length - 1].parts.push(decodeXml(text));
    }
  }
  return paragraphs;
}

function relativeSource(filename: string) {
  return relative(process.cwd(), join(SOURCE_ROOT, filename)).replace(
    /\\/g,
    '/',
  );
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function wordCount(value: string) {
  return value.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)?.length ?? 0;
}

function shortenSample(value: string, maximum: number) {
  const tokens = value.split(/\s+/).filter(Boolean);
  const fillerWords = [
    'very',
    'really',
    'totally',
    'easily',
    'also',
    'small',
    'great',
    'hard',
  ];
  while (wordCount(tokens.join(' ')) > maximum) {
    const index = tokens.findIndex((token) =>
      fillerWords.includes(token.toLowerCase().replace(/[^a-z]/g, '')),
    );
    if (index < 0) {
      throw new Error(
        `Không thể rút sample answer xuống ${maximum} từ: ${value}`,
      );
    }
    tokens.splice(index, 1);
  }
  return tokens.join(' ');
}

function parsePromptAndSample(
  paragraph: string,
  pattern: RegExp,
  label: string,
): PromptWithSample {
  const lines = paragraph.split('\n').map(normalizeLine).filter(Boolean);
  const match = lines[0]?.match(pattern);
  if (!match?.[1] || lines.length < 2) {
    throw new Error(`${label}: không đọc được prompt/sample: ${paragraph}`);
  }
  const sample = normalizeLine(
    lines
      .slice(1)
      .join(' ')
      .replace(/\s*\(\d+\s+words\)\s*$/i, ''),
  );
  return { question: normalizeLine(match[1]), sample_answer: sample };
}

function parsePart1(paragraphs: string[]) {
  const result = new Map<number, PromptWithSample>();
  for (const paragraph of paragraphs) {
    const match = paragraph.match(/^\s*(\d+)\.\s*(.*?)\s+[–—-]\s+(.+)$/s);
    if (!match) continue;
    const number = Number(match[1]);
    const sample = number === 43 ? 'A pharmacist.' : normalizeLine(match[3]);
    result.set(number, {
      question: normalizeLine(match[2]),
      sample_answer: sample,
    });
  }
  if (result.size !== 60) {
    throw new Error(`Writing Part 1 cần 60 câu, tìm thấy ${result.size}.`);
  }
  return result;
}

function parsePart23(paragraphs: string[]) {
  const topics = new Map<number, Part23Topic>();
  let current: Part23Topic | null = null;

  for (const paragraph of paragraphs) {
    const heading = paragraph.match(
      /^\s*(\d+)\.\s*(.+?)(?:\s*\([^\n]+\))?\s*$/,
    );
    if (heading) {
      current = {
        number: Number(heading[1]),
        title: normalizeLine(heading[2]),
        part2: { question: '', sample_answer: '' },
        part3: [],
      };
      topics.set(current.number, current);
      continue;
    }
    if (!current) continue;
    if (/^Part 2:/i.test(paragraph)) {
      current.part2 = parsePromptAndSample(
        paragraph,
        /^Part 2:\s*(.+)$/i,
        `Topic ${current.number} Part 2`,
      );
    } else if (/^Part 3\s*-\s*Q\d+:/i.test(paragraph)) {
      const parsed = parsePromptAndSample(
        paragraph,
        /^Part 3\s*-\s*Q\d+:\s*(.+)$/i,
        `Topic ${current.number} Part 3`,
      );
      parsed.sample_answer = shortenSample(parsed.sample_answer, 40);
      current.part3.push(parsed);
    }
  }

  if (topics.size !== 40) {
    throw new Error(`Writing Part 2-3 cần 40 chủ đề, tìm thấy ${topics.size}.`);
  }
  for (const topic of topics.values()) {
    if (!topic.part2.question || topic.part3.length !== 3) {
      throw new Error(
        `Topic ${topic.number}: cần 1 câu Part 2 và 3 câu Part 3.`,
      );
    }
  }
  return topics;
}

function cleanTaskInstruction(value: string) {
  return normalizeLine(
    value
      .replace(/\s*\(about\s+\d+(?:\s*[-–]\s*\d+)?\s+words\)\.?/gi, '. ')
      .replace(/\s+/g, ' '),
  );
}

function findInstruction(section: string[], pattern: RegExp, label: string) {
  for (const paragraph of section) {
    const match = pattern.exec(paragraph);
    pattern.lastIndex = 0;
    if (match?.index != null) {
      return cleanTaskInstruction(paragraph.slice(match.index));
    }
  }
  throw new Error(`${label}: không tìm thấy instruction.`);
}

function parsePart4(paragraphs: string[]) {
  const headingIndexes = paragraphs
    .map((paragraph, index) => (/^Đề\s*\d+\s*:/i.test(paragraph) ? index : -1))
    .filter((index) => index >= 0);
  headingIndexes.push(paragraphs.length);
  const topics = new Map<number, Part4Topic>();

  for (let index = 0; index < headingIndexes.length - 1; index++) {
    const start = headingIndexes[index];
    const end = headingIndexes[index + 1];
    const heading = paragraphs[start].match(/^Đề\s*(\d+)\s*:\s*(.+)$/i);
    if (!heading) continue;
    const number = Number(heading[1]);
    const section = paragraphs.slice(start + 1, end);
    const firstSource = section[0] ?? '';
    const taskStart = firstSource.search(/Write (?:a short |an )?email/i);
    const context = normalizeLine(
      taskStart >= 0 ? firstSource.slice(0, taskStart) : firstSource,
    );
    if (!context) throw new Error(`Part 4 topic ${number}: thiếu context.`);

    topics.set(number, {
      number,
      title: normalizeLine(heading[2]),
      context,
      informalInstruction: findInstruction(
        section,
        /Write (?:a short |an )?email to your friend/i,
        `Part 4 topic ${number} informal`,
      ),
      formalInstruction: findInstruction(
        section,
        /Write an email[^\n]*(?:president|manager)/i,
        `Part 4 topic ${number} formal`,
      ),
    });
  }
  if (topics.size !== 40) {
    throw new Error(`Writing Part 4 cần 40 chủ đề, tìm thấy ${topics.size}.`);
  }
  return topics;
}

function withProvenance(
  config: Record<string, unknown>,
  seedKey: string,
  sourceDocuments: string[],
  sourceDetails: Record<string, unknown>,
) {
  return {
    ...config,
    seed_key: seedKey,
    seed_source_documents: sourceDocuments,
    seed_source_details: sourceDetails,
  };
}

function buildSet(
  mapping: WritingSeedSourceMap,
  part1: Map<number, PromptWithSample>,
  part23: Map<number, Part23Topic>,
  part4: Map<number, Part4Topic>,
): WritingSeedSet {
  const testLabel = String(mapping.testNumber).padStart(2, '0');
  const source23 = part23.get(mapping.part23TopicNumber);
  const source4 = part4.get(mapping.part4TopicNumber);
  if (!source23 || !source4) {
    throw new Error(`Test ${testLabel}: thiếu chủ đề nguồn.`);
  }

  const part1Prompts = Array.from({ length: 5 }, (_, offset) => {
    const number = mapping.part1QuestionStart + offset;
    const prompt = part1.get(number);
    if (!prompt)
      throw new Error(`Test ${testLabel}: thiếu Part 1 câu ${number}.`);
    return prompt;
  });
  const baseKey = `writing/test-${testLabel}`;
  const p1Source = relativeSource(SOURCE_FILES.part1);
  const p23Source = relativeSource(SOURCE_FILES.part23);
  const p4Source = relativeSource(SOURCE_FILES.part4);
  const formalInstruction =
    mapping.part4TopicNumber === 14
      ? 'Write an email to the course manager. Describe your experience with the English course and suggest how the course could be promoted or improved.'
      : source4.formalInstruction;

  const questions: PreparedQuestion[] = [
    {
      seedKey: `${baseKey}/p1`,
      partNumber: 1,
      orderIndex: 0,
      content: `Complete the ${mapping.title} registration form.`,
      extraConfig: withProvenance(
        {
          word_limit_min: 1,
          word_limit_max: 5,
          prompts: part1Prompts,
        },
        `${baseKey}/p1`,
        [p1Source],
        {
          question_numbers: Array.from(
            { length: 5 },
            (_, offset) => mapping.part1QuestionStart + offset,
          ),
        },
      ),
    },
    {
      seedKey: `${baseKey}/p2`,
      partNumber: 2,
      orderIndex: 0,
      content: source23.part2.question,
      extraConfig: withProvenance(
        {
          word_limit_min: 20,
          word_limit_max: 30,
          sample_answer: source23.part2.sample_answer,
        },
        `${baseKey}/p2`,
        [p23Source],
        { topic_number: mapping.part23TopicNumber, topic: source23.title },
      ),
    },
    {
      seedKey: `${baseKey}/p3`,
      partNumber: 3,
      orderIndex: 0,
      content: `You are participating in the ${mapping.title} chat room. Reply to each member.`,
      extraConfig: withProvenance(
        {
          word_limit_min: 30,
          word_limit_max: 40,
          prompts: source23.part3.map((prompt, index) => ({
            speaker_name: `Member ${String.fromCharCode(65 + index)}`,
            ...prompt,
          })),
        },
        `${baseKey}/p3`,
        [p23Source],
        { topic_number: mapping.part23TopicNumber, topic: source23.title },
      ),
    },
    {
      seedKey: `${baseKey}/p4`,
      partNumber: 4,
      orderIndex: 0,
      content: `Write two emails based on the ${mapping.title} notice.`,
      extraConfig: withProvenance(
        {
          context: source4.context,
          tasks: [
            {
              task_label: 'Task 1',
              instruction: source4.informalInstruction,
              register_type: 'INFORMAL',
              word_limit_min: 50,
              word_limit_max: 75,
            },
            {
              task_label: 'Task 2',
              instruction: formalInstruction,
              register_type: 'FORMAL',
              word_limit_min: 120,
              word_limit_max: 150,
            },
          ],
        },
        `${baseKey}/p4`,
        [p4Source],
        { topic_number: mapping.part4TopicNumber, topic: source4.title },
      ),
    },
  ];

  return {
    testNumber: mapping.testNumber,
    title: `APTIS Writing Test ${testLabel} - ${mapping.title}`,
    description: `APTIS Writing full set ${testLabel}: ${mapping.title}. Includes Parts 1-4 and 11 response fields.`,
    questions,
  };
}

export async function buildWritingSeedSets() {
  const [part1Archive, part23Archive, part4Archive] = await Promise.all([
    readFile(join(SOURCE_ROOT, SOURCE_FILES.part1)),
    readFile(join(SOURCE_ROOT, SOURCE_FILES.part23)),
    readFile(join(SOURCE_ROOT, SOURCE_FILES.part4)),
  ]);
  const part1 = parsePart1(extractParagraphs(part1Archive));
  const part23 = parsePart23(extractParagraphs(part23Archive));
  const part4 = parsePart4(extractParagraphs(part4Archive));
  return WRITING_SEED_SOURCE_MAP.map((mapping) =>
    buildSet(mapping, part1, part23, part4),
  );
}

export function validateWritingSeedSets(sets: WritingSeedSet[]) {
  if (sets.length !== EXPECTED_EXAM_COUNT) {
    throw new Error(
      `Cần ${EXPECTED_EXAM_COUNT} đề Writing, có ${sets.length}.`,
    );
  }
  const keys = new Set<string>();
  const partCounts: Record<PartNumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let atomicItemCount = 0;

  for (const set of sets) {
    if (set.questions.length !== 4) {
      throw new Error(`${set.title}: cần đúng 4 bản ghi.`);
    }
    for (const question of set.questions) {
      if (keys.has(question.seedKey))
        throw new Error(`Trùng ${question.seedKey}.`);
      keys.add(question.seedKey);
      getPartConfig(WRITING_SKILL_ID, question.partNumber).validate({
        content: question.content,
        mediaUrl: null,
        extraConfig: question.extraConfig,
      });
      partCounts[question.partNumber]++;
      const config = question.extraConfig;
      if (question.partNumber === 1) {
        const prompts = config.prompts as PromptWithSample[];
        for (const prompt of prompts) {
          const count = wordCount(prompt.sample_answer);
          if (count < 1 || count > 5) {
            throw new Error(`${question.seedKey}: P1 sample có ${count} từ.`);
          }
        }
        atomicItemCount += prompts.length;
      } else if (question.partNumber === 2) {
        const count = wordCount(String(config.sample_answer));
        if (count < 20 || count > 30) {
          throw new Error(`${question.seedKey}: P2 sample có ${count} từ.`);
        }
        atomicItemCount++;
      } else if (question.partNumber === 3) {
        const prompts = config.prompts as PromptWithSample[];
        for (const prompt of prompts) {
          const count = wordCount(prompt.sample_answer);
          if (count < 30 || count > 40) {
            throw new Error(`${question.seedKey}: P3 sample có ${count} từ.`);
          }
        }
        atomicItemCount += prompts.length;
      } else {
        atomicItemCount += (config.tasks as unknown[]).length;
      }
    }
  }
  if (
    Object.values(partCounts).some((count) => count !== EXPECTED_EXAM_COUNT) ||
    atomicItemCount !== EXPECTED_ATOMIC_ITEM_COUNT ||
    keys.size !== EXPECTED_QUESTION_RECORD_COUNT
  ) {
    throw new Error(
      `Sai tổng Writing: records=${keys.size}, atomic=${atomicItemCount}, parts=${JSON.stringify(partCounts)}.`,
    );
  }
  return { partCounts, atomicItemCount };
}

async function dryRun() {
  const sets = await buildWritingSeedSets();
  const validation = validateWritingSeedSets(sets);
  console.log(
    JSON.stringify(
      {
        examCount: sets.length,
        questionRecordCount: sets.reduce(
          (total, set) => total + set.questions.length,
          0,
        ),
        ...validation,
        topicMapping: WRITING_SEED_SOURCE_MAP.map((mapping) => ({
          test: mapping.testNumber,
          title: mapping.title,
          part23: mapping.part23TopicNumber,
          part4: mapping.part4TopicNumber,
          part1Questions: `${mapping.part1QuestionStart}-${mapping.part1QuestionStart + 4}`,
        })),
        sourceNotices: WRITING_SOURCE_NOTICES,
      },
      null,
      2,
    ),
  );
}

async function loadExistingSeedQuestions(
  prisma: PrismaClient,
  adminId: number,
) {
  const result = new Map<string, number>();
  const questions = await prisma.questionBank.findMany({
    where: { skillId: WRITING_SKILL_ID, createdBy: adminId },
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
  adminId: number,
  existingByKey: Map<string, number>,
) {
  const partConfig = getPartConfig(WRITING_SKILL_ID, question.partNumber);
  partConfig.validate({
    content: question.content,
    mediaUrl: null,
    extraConfig: question.extraConfig,
  });
  const data = {
    questionType: partConfig.questionType,
    content: question.content,
    mediaUrl: null,
    extraConfig: question.extraConfig as Prisma.InputJsonValue,
    deletedAt: null,
  };
  const existingId = existingByKey.get(question.seedKey);
  if (existingId)
    return tx.questionBank.update({ where: { id: existingId }, data });

  const created = await tx.questionBank.create({
    data: {
      skillId: WRITING_SKILL_ID,
      partNumber: question.partNumber,
      createdBy: adminId,
      ...data,
    },
  });
  existingByKey.set(question.seedKey, created.id);
  return created;
}

async function upsertWritingSet(
  prisma: PrismaClient,
  set: WritingSeedSet,
  adminId: number,
  existingByKey: Map<string, number>,
) {
  return prisma.$transaction(async (tx) => {
    let exam = await tx.examSet.findFirst({
      where: {
        title: set.title,
        type: ExamType.SKILL_FULL_SET,
        skillId: WRITING_SKILL_ID,
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
          skillId: WRITING_SKILL_ID,
          partNumber: null,
          isActive: true,
          createdBy: adminId,
        },
      });
    }

    let section = await tx.examSection.findFirst({
      where: { examId: exam.id, skillId: WRITING_SKILL_ID },
    });
    if (section) {
      section = await tx.examSection.update({
        where: { id: section.id },
        data: { durationMinutes: WRITING_DURATION_MINUTES, orderIndex: 0 },
      });
    } else {
      section = await tx.examSection.create({
        data: {
          examId: exam.id,
          skillId: WRITING_SKILL_ID,
          durationMinutes: WRITING_DURATION_MINUTES,
          orderIndex: 0,
        },
      });
    }

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

      const questionSeed = set.questions.find(
        (question) => question.partNumber === partNumber,
      );
      if (!questionSeed)
        throw new Error(`${set.title}: thiếu Part ${partNumber}.`);
      const question = await upsertQuestion(
        tx,
        questionSeed,
        adminId,
        existingByKey,
      );
      await tx.examPartQuestion.deleteMany({ where: { examPartId: part.id } });
      await tx.examPartQuestion.create({
        data: { examPartId: part.id, questionId: question.id, orderIndex: 0 },
      });
    }
    return { examId: exam.id, questionRecordCount: 4 };
  });
}

export async function verifyWritingDatabase(
  prisma: PrismaClient,
  sets: WritingSeedSet[],
  adminId: number,
) {
  const exams = await prisma.examSet.findMany({
    where: {
      title: { in: sets.map((set) => set.title) },
      type: ExamType.SKILL_FULL_SET,
      skillId: WRITING_SKILL_ID,
      deletedAt: null,
    },
    include: {
      sections: {
        where: { skillId: WRITING_SKILL_ID },
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
  if (exams.length !== EXPECTED_EXAM_COUNT) {
    throw new Error(
      `Database: cần ${EXPECTED_EXAM_COUNT} đề Writing, tìm thấy ${exams.length}.`,
    );
  }

  const assignedKeys = new Set<string>();
  const assignedIds = new Set<number>();
  const partCounts: Record<PartNumber, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let atomicItemCount = 0;

  for (const set of sets) {
    const exam = exams.find((candidate) => candidate.title === set.title);
    if (
      !exam ||
      exam.sections.length !== 1 ||
      exam.sections[0].parts.length !== 4
    ) {
      throw new Error(
        `Database: cấu trúc exam/section/part sai tại ${set.title}.`,
      );
    }
    for (const expected of set.questions) {
      const part = exam.sections[0].parts.find(
        (candidate) => candidate.partNumber === expected.partNumber,
      );
      if (!part || part.questions.length !== 1) {
        throw new Error(
          `${set.title} Part ${expected.partNumber}: cần 1 bản ghi.`,
        );
      }
      const assignment = part.questions[0];
      const config = asObject(assignment.question.extraConfig);
      const seedKey = config?.seed_key;
      if (
        seedKey !== expected.seedKey ||
        assignment.orderIndex !== 0 ||
        assignment.question.partNumber !== expected.partNumber
      ) {
        throw new Error(
          `${set.title} Part ${expected.partNumber}: sai seed hoặc thứ tự.`,
        );
      }
      assignedKeys.add(String(seedKey));
      assignedIds.add(assignment.questionId);
      partCounts[expected.partNumber]++;
      if (expected.partNumber === 1 || expected.partNumber === 3) {
        atomicItemCount += Array.isArray(config?.prompts)
          ? config.prompts.length
          : 0;
      } else if (expected.partNumber === 4) {
        atomicItemCount += Array.isArray(config?.tasks)
          ? config.tasks.length
          : 0;
      } else {
        atomicItemCount++;
      }
    }
  }

  const seededQuestions = (
    await prisma.questionBank.findMany({
      where: { skillId: WRITING_SKILL_ID, createdBy: adminId, deletedAt: null },
      select: { id: true, extraConfig: true },
    })
  ).filter((question) => {
    const key = asObject(question.extraConfig)?.seed_key;
    return typeof key === 'string' && /^writing\/test-\d{2}\/p[1-4]$/.test(key);
  });
  if (
    seededQuestions.length !== EXPECTED_QUESTION_RECORD_COUNT ||
    assignedIds.size !== EXPECTED_QUESTION_RECORD_COUNT ||
    assignedKeys.size !== EXPECTED_QUESTION_RECORD_COUNT ||
    atomicItemCount !== EXPECTED_ATOMIC_ITEM_COUNT
  ) {
    throw new Error(
      `Database: sai tổng Writing (bank=${seededQuestions.length}, assigned=${assignedIds.size}, keys=${assignedKeys.size}, atomic=${atomicItemCount}).`,
    );
  }
  return {
    examCount: exams.length,
    questionRecordCount: seededQuestions.length,
    partCounts,
    atomicItemCount,
    examIds: exams.map((exam) => exam.id).sort((a, b) => a - b),
  };
}

async function main() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const sets = await buildWritingSeedSets();
  validateWritingSeedSets(sets);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const [admin, writingSkill] = await Promise.all([
      prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }),
      prisma.skill.findUnique({ where: { id: WRITING_SKILL_ID } }),
    ]);
    if (!admin) {
      throw new Error(
        `Không tìm thấy ADMIN ${ADMIN_EMAIL}. Hãy chạy pnpm db:seed trước.`,
      );
    }
    if (!writingSkill) {
      throw new Error(
        'Chưa có skill Writing (id=4). Hãy chạy pnpm db:seed trước.',
      );
    }

    if (process.argv.includes('--verify-only')) {
      console.log(
        JSON.stringify(
          await verifyWritingDatabase(prisma, sets, admin.id),
          null,
          2,
        ),
      );
      return;
    }

    const existingByKey = await loadExistingSeedQuestions(prisma, admin.id);
    const examIds: number[] = [];
    let questionRecordCount = 0;
    for (const set of sets) {
      const result = await upsertWritingSet(
        prisma,
        set,
        admin.id,
        existingByKey,
      );
      examIds.push(result.examId);
      questionRecordCount += result.questionRecordCount;
      console.log(`${set.title}: examId=${result.examId}, records=4`);
    }
    console.log(
      JSON.stringify(
        {
          examCount: sets.length,
          questionRecordCount,
          atomicItemCount: EXPECTED_ATOMIC_ITEM_COUNT,
          examIds,
        },
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
      'Seed Writing thất bại:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
