import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join, relative, resolve } from 'path';
import { inflateRawSync } from 'zlib';
import { ExamType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getPartConfig } from '../../../../src/question-bank/question-config';
import {
  GRAMMAR_VOCABULARY_SOURCE_CORRECTIONS,
  GRAMMAR_VOCABULARY_SOURCE_SETS,
  GrammarVocabularySourceSet,
} from './data';

type PartNumber = 1 | 2;

interface PreparedQuestion {
  seedKey: string;
  partNumber: PartNumber;
  content: string;
  extraConfig: Record<string, unknown>;
  orderIndex: number;
}

interface GrammarVocabularySeedSet {
  version: number;
  title: string;
  description: string;
  sourceDocument: string;
  questions: PreparedQuestion[];
}

const SKILL_ID = 1;
const DURATION_MINUTES = 25;
const SOURCE_ROOT = resolve(process.cwd(), 'grammar & vocal');
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';

const PART_INSTRUCTIONS: Record<PartNumber, string> = {
  1: 'Choose the correct answer (A, B, or C) for each grammar question.',
  2: 'Complete all five vocabulary tasks. Use each word once only within each task; five words are not needed.',
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
  if (eocdOffset < 0) {
    throw new Error('File Word không có ZIP directory hợp lệ.');
  }

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
  const stack: { parts: string[] }[] = [];
  const tokenPattern =
    /<w:p(?:\s[^>]*)?>|<\/w:p>|<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g;
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
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) paragraphs.push(text);
      continue;
    }
    if (!stack.length) continue;
    if (/^<w:tab\s*\/>$/.test(token)) {
      stack[stack.length - 1].parts.push(' _______ ');
    } else if (/^<w:br\s*\/>$/.test(token)) {
      stack[stack.length - 1].parts.push(' ');
    } else {
      const text = token.match(/^<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>$/)?.[1];
      if (text != null) stack[stack.length - 1].parts.push(decodeXml(text));
    }
  }
  return paragraphs;
}

function normalizePlaceholder(value: string) {
  return value
    .replace(/_{3,}/g, '_______')
    .replace(/\s+([,.?!;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripOptionLabel(value: string) {
  return normalizePlaceholder(value.replace(/^[ABC]\s*\.\s*/i, ''));
}

function relativeSource(path: string) {
  return relative(process.cwd(), path).replace(/\\/g, '/');
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function withProvenance(
  config: Record<string, unknown>,
  seedKey: string,
  sourceDocument: string,
) {
  return {
    ...config,
    seed_key: seedKey,
    seed_source_document: sourceDocument,
  };
}

function applyGrammarSourceCorrections(
  version: number,
  questionNumber: number,
  options: string[],
) {
  const corrected = [...options];
  if (version === 2 && questionNumber === 9) corrected[2] = "I'll";
  return corrected;
}

async function buildGrammarQuestions(
  source: GrammarVocabularySourceSet,
  sourceDocument: string,
) {
  const path = join(SOURCE_ROOT, source.documentName);
  const paragraphs = extractParagraphs(await readFile(path));
  const exampleIndex = paragraphs.findIndex((line) => /How old\b/i.test(line));
  const vocabularyIndex = paragraphs.findIndex((line) =>
    /^Vocabulary\b/i.test(line),
  );
  if (
    exampleIndex < 0 ||
    vocabularyIndex < 0 ||
    vocabularyIndex <= exampleIndex
  ) {
    const landmarks = {
      matches: paragraphs.filter((line) => /How old|Vocab/i.test(line)),
      first: paragraphs.slice(0, 30),
    };
    throw new Error(
      `Ver ${source.version}: không tìm thấy ranh giới Grammar/Vocabulary (${JSON.stringify(landmarks)}).`,
    );
  }

  const grammarLines = paragraphs
    .slice(exampleIndex + 4, vocabularyIndex)
    .filter(
      (line) =>
        !/britishcouncil\.org\/aptis/i.test(line) && !/^\d+$/.test(line),
    );
  if (grammarLines.length !== 100) {
    throw new Error(
      `Ver ${source.version}: Grammar cần 100 dòng (25 × 4), tìm thấy ${grammarLines.length}.`,
    );
  }

  return Array.from({ length: 25 }, (_, index): PreparedQuestion => {
    const questionNumber = index + 1;
    const offset = index * 4;
    const content = normalizePlaceholder(grammarLines[offset]);
    const options = applyGrammarSourceCorrections(
      source.version,
      questionNumber,
      grammarLines.slice(offset + 1, offset + 4).map(stripOptionLabel),
    );
    const correctIndex = source.grammarCorrectIndexes[index];
    const seedKey = `grammar-vocabulary-test-${String(source.version).padStart(2, '0')}-p1-q${String(questionNumber).padStart(2, '0')}`;
    return {
      seedKey,
      partNumber: 1,
      content,
      orderIndex: index,
      extraConfig: withProvenance(
        {
          options: options.map((option, optionIndex) => ({
            content: option,
            is_correct: optionIndex === correctIndex,
          })),
        },
        seedKey,
        sourceDocument,
      ),
    };
  });
}

function buildVocabularyQuestions(
  source: GrammarVocabularySourceSet,
  sourceDocument: string,
) {
  return source.vocabularyTasks.map((task, index): PreparedQuestion => {
    const taskNumber = index + 1;
    const seedKey = `grammar-vocabulary-test-${String(source.version).padStart(2, '0')}-p2-task${taskNumber}`;
    return {
      seedKey,
      partNumber: 2,
      content: task.content,
      orderIndex: index,
      extraConfig: withProvenance(
        {
          task_variant: task.variant,
          options_pool: task.optionsPool,
          slots: task.slots.map((slot, slotIndex) => ({
            slot_id: `s${slotIndex + 1}`,
            prompt: slot.prompt,
            correct_answer: slot.correctAnswer,
          })),
        },
        seedKey,
        sourceDocument,
      ),
    };
  });
}

async function buildSeedSet(
  source: GrammarVocabularySourceSet,
): Promise<GrammarVocabularySeedSet> {
  const sourcePath = join(SOURCE_ROOT, source.documentName);
  const sourceDocument = relativeSource(sourcePath);
  const grammarQuestions = await buildGrammarQuestions(source, sourceDocument);
  return {
    version: source.version,
    title: `APTIS Grammar & Vocabulary Test ${String(source.version).padStart(2, '0')}`,
    description: `APTIS Grammar & Vocabulary practice test ${source.version}: 25 Grammar multiple-choice questions and 5 Vocabulary word-bank tasks (25 slots).`,
    sourceDocument,
    questions: [
      ...grammarQuestions,
      ...buildVocabularyQuestions(source, sourceDocument),
    ],
  };
}

async function buildSeedSets() {
  return Promise.all(GRAMMAR_VOCABULARY_SOURCE_SETS.map(buildSeedSet));
}

function validateSets(sets: GrammarVocabularySeedSet[]) {
  if (sets.length !== 3) {
    throw new Error(
      `Cần đúng 3 đề Grammar & Vocabulary, tìm thấy ${sets.length}.`,
    );
  }
  const seedKeys = new Set<string>();
  const partCounts: Record<PartNumber, number> = { 1: 0, 2: 0 };
  let atomicItemCount = 0;

  for (const set of sets) {
    const grammar = set.questions.filter(
      (question) => question.partNumber === 1,
    );
    const vocabulary = set.questions.filter(
      (question) => question.partNumber === 2,
    );
    if (grammar.length !== 25 || vocabulary.length !== 5) {
      throw new Error(
        `${set.title}: cần 25 Grammar + 5 Vocabulary, tìm thấy ${grammar.length} + ${vocabulary.length}.`,
      );
    }

    for (const question of set.questions) {
      if (seedKeys.has(question.seedKey)) {
        throw new Error(`Trùng seed_key: ${question.seedKey}`);
      }
      seedKeys.add(question.seedKey);
      const placeholderCount = (question.content.match(/_______/g) || [])
        .length;
      if (question.partNumber === 1 && placeholderCount !== 1) {
        throw new Error(
          `${question.seedKey}: câu Grammar phải có đúng 1 chỗ trống, tìm thấy ${placeholderCount}.`,
        );
      }

      const config = getPartConfig(SKILL_ID, question.partNumber);
      config.validate({
        content: question.content,
        mediaUrl: null,
        extraConfig: question.extraConfig,
      });
      partCounts[question.partNumber]++;

      if (question.partNumber === 1) {
        const options = asObject(question.extraConfig)?.options;
        if (!Array.isArray(options) || options.length !== 3) {
          throw new Error(`${question.seedKey}: thiếu 3 lựa chọn Grammar.`);
        }
        const values = options.map((option) => asObject(option)?.content);
        if (new Set(values).size !== 3) {
          throw new Error(`${question.seedKey}: lựa chọn Grammar bị trùng.`);
        }
        atomicItemCount++;
      } else {
        const extra = asObject(question.extraConfig)!;
        const pool = extra.options_pool as unknown[];
        const slots = extra.slots as unknown[];
        if (new Set(pool).size !== 10) {
          throw new Error(`${question.seedKey}: options_pool bị trùng từ.`);
        }
        if (extra.task_variant === 'SENTENCE') {
          slots.forEach((slot, slotIndex) => {
            const prompt = asObject(slot)?.prompt;
            if (
              typeof prompt !== 'string' ||
              (prompt.match(/_______/g) || []).length !== 1
            ) {
              throw new Error(
                `${question.seedKey} slot ${slotIndex + 1}: SENTENCE phải có đúng 1 chỗ trống.`,
              );
            }
          });
        }
        atomicItemCount += slots.length;
      }
    }
  }

  if (partCounts[1] !== 75 || partCounts[2] !== 15 || atomicItemCount !== 150) {
    throw new Error(
      `Sai tổng dữ liệu: P1=${partCounts[1]}, P2=${partCounts[2]}, atomic=${atomicItemCount}.`,
    );
  }
  return { partCounts, atomicItemCount };
}

function taskVariantSummary(sets: GrammarVocabularySeedSet[]) {
  return Object.fromEntries(
    sets.map((set) => [
      `test${set.version}`,
      set.questions
        .filter((question) => question.partNumber === 2)
        .map((question) => asObject(question.extraConfig)?.task_variant),
    ]),
  );
}

async function dryRun() {
  const sets = await buildSeedSets();
  const { partCounts, atomicItemCount } = validateSets(sets);
  console.log(
    JSON.stringify(
      {
        examCount: sets.length,
        questionRecordCount: sets.reduce(
          (sum, set) => sum + set.questions.length,
          0,
        ),
        partCounts,
        atomicItemCount,
        taskVariants: taskVariantSummary(sets),
        sourceCorrections: GRAMMAR_VOCABULARY_SOURCE_CORRECTIONS,
        nearDuplicateNotice: [
          'Test 01 Grammar Q10 and Test 03 Grammar Q7 use the same future-business prompt with different contractions/options.',
        ],
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
    where: { skillId: SKILL_ID, createdBy: adminId },
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
  const config = getPartConfig(SKILL_ID, question.partNumber);
  config.validate({
    content: question.content,
    mediaUrl: null,
    extraConfig: question.extraConfig,
  });
  const data = {
    questionType: config.questionType,
    content: question.content,
    mediaUrl: null,
    extraConfig: question.extraConfig as Prisma.InputJsonValue,
    deletedAt: null,
  };
  const existingId = existingByKey.get(question.seedKey);
  if (existingId) {
    return tx.questionBank.update({ where: { id: existingId }, data });
  }
  const created = await tx.questionBank.create({
    data: {
      skillId: SKILL_ID,
      partNumber: question.partNumber,
      createdBy: adminId,
      ...data,
    },
  });
  existingByKey.set(question.seedKey, created.id);
  return created;
}

async function upsertSet(
  prisma: PrismaClient,
  set: GrammarVocabularySeedSet,
  adminId: number,
  existingByKey: Map<string, number>,
) {
  return prisma.$transaction(async (tx) => {
    let exam = await tx.examSet.findFirst({
      where: {
        title: set.title,
        type: ExamType.SKILL_FULL_SET,
        skillId: SKILL_ID,
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
          skillId: SKILL_ID,
          partNumber: null,
          isActive: true,
          createdBy: adminId,
        },
      });
    }

    let section = await tx.examSection.findFirst({
      where: { examId: exam.id, skillId: SKILL_ID },
    });
    if (section) {
      section = await tx.examSection.update({
        where: { id: section.id },
        data: { durationMinutes: DURATION_MINUTES, orderIndex: 0 },
      });
    } else {
      section = await tx.examSection.create({
        data: {
          examId: exam.id,
          skillId: SKILL_ID,
          durationMinutes: DURATION_MINUTES,
          orderIndex: 0,
        },
      });
    }

    let questionCount = 0;
    for (
      let partNumber = 1 as PartNumber;
      partNumber <= 2;
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
        const created = await upsertQuestion(
          tx,
          question,
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
      await tx.examPartQuestion.createMany({
        data: assignments.map((assignment) => ({
          examPartId: part.id,
          ...assignment,
        })),
      });
    }
    return { examId: exam.id, questionCount };
  });
}

async function verifyDatabase(
  prisma: PrismaClient,
  sets: GrammarVocabularySeedSet[],
  adminId: number,
) {
  const titles = sets.map((set) => set.title);
  const exams = await prisma.examSet.findMany({
    where: {
      title: { in: titles },
      type: ExamType.SKILL_FULL_SET,
      skillId: SKILL_ID,
      deletedAt: null,
    },
    include: {
      sections: {
        where: { skillId: SKILL_ID },
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
  if (exams.length !== 3) {
    throw new Error(`Database: cần 3 đề, tìm thấy ${exams.length}.`);
  }

  const assignedIds = new Set<number>();
  const assignedKeys = new Set<string>();
  const partCounts: Record<PartNumber, number> = { 1: 0, 2: 0 };
  let atomicItemCount = 0;

  for (const set of sets) {
    const matches = exams.filter((exam) => exam.title === set.title);
    if (matches.length !== 1 || matches[0].sections.length !== 1) {
      throw new Error(
        `Database: cấu trúc exam/section không hợp lệ: ${set.title}.`,
      );
    }
    const parts = matches[0].sections[0].parts;
    if (parts.length !== 2) {
      throw new Error(`Database: ${set.title} phải có đúng 2 part.`);
    }

    for (
      let partNumber = 1 as PartNumber;
      partNumber <= 2;
      partNumber++ as PartNumber
    ) {
      const matchingParts = parts.filter(
        (part) => part.partNumber === partNumber,
      );
      if (matchingParts.length !== 1) {
        throw new Error(`${set.title}: thiếu hoặc trùng Part ${partNumber}.`);
      }
      const expected = set.questions
        .filter((question) => question.partNumber === partNumber)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      const assignments = matchingParts[0].questions;
      if (assignments.length !== expected.length) {
        throw new Error(
          `${set.title} Part ${partNumber}: cần ${expected.length} bản ghi, tìm thấy ${assignments.length}.`,
        );
      }
      assignments.forEach((assignment, index) => {
        const seedKey = asObject(assignment.question.extraConfig)?.seed_key;
        if (
          seedKey !== expected[index].seedKey ||
          assignment.orderIndex !== expected[index].orderIndex ||
          assignment.question.partNumber !== partNumber
        ) {
          throw new Error(
            `${set.title} Part ${partNumber}: sai câu hoặc thứ tự tại vị trí ${index + 1}.`,
          );
        }
        assignedIds.add(assignment.questionId);
        assignedKeys.add(seedKey);
        partCounts[partNumber]++;
        if (partNumber === 1) atomicItemCount++;
        else {
          const slots = asObject(assignment.question.extraConfig)?.slots;
          if (!Array.isArray(slots) || slots.length !== 5) {
            throw new Error(`${seedKey}: database thiếu 5 slots.`);
          }
          atomicItemCount += slots.length;
        }
      });
    }
  }

  const seededQuestions = (
    await prisma.questionBank.findMany({
      where: { skillId: SKILL_ID, createdBy: adminId, deletedAt: null },
      select: { id: true, extraConfig: true },
    })
  ).filter((question) => {
    const key = asObject(question.extraConfig)?.seed_key;
    return (
      typeof key === 'string' &&
      /^grammar-vocabulary-test-\d{2}-p(?:1-q\d{2}|2-task\d)$/.test(key)
    );
  });
  if (
    seededQuestions.length !== 90 ||
    assignedIds.size !== 90 ||
    assignedKeys.size !== 90 ||
    atomicItemCount !== 150
  ) {
    throw new Error(
      `Database: sai tổng (bank=${seededQuestions.length}, assigned=${assignedIds.size}, keys=${assignedKeys.size}, atomic=${atomicItemCount}).`,
    );
  }

  return {
    examCount: exams.length,
    questionRecordCount: seededQuestions.length,
    partCounts,
    atomicItemCount,
    examIds: exams.map((exam) => exam.id).sort((a, b) => a - b),
    taskVariants: taskVariantSummary(sets),
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
    const [admin, skill] = await Promise.all([
      prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }),
      prisma.skill.findUnique({ where: { id: SKILL_ID } }),
    ]);
    if (!admin) {
      throw new Error(
        `Không tìm thấy ADMIN ${ADMIN_EMAIL}. Hãy chạy pnpm db:seed trước.`,
      );
    }
    if (!skill) {
      throw new Error(
        'Chưa có skill Grammar & Vocabulary (id=1). Hãy chạy pnpm db:seed trước.',
      );
    }

    if (process.argv.includes('--verify-only')) {
      console.log(
        JSON.stringify(await verifyDatabase(prisma, sets, admin.id), null, 2),
      );
      return;
    }

    const existingByKey = await loadExistingSeedQuestions(prisma, admin.id);
    const examIds: number[] = [];
    let questionRecordCount = 0;
    for (const set of sets) {
      const result = await upsertSet(prisma, set, admin.id, existingByKey);
      examIds.push(result.examId);
      questionRecordCount += result.questionCount;
      console.log(
        `${set.title}: examId=${result.examId}, records=${result.questionCount}`,
      );
    }
    console.log(
      JSON.stringify(
        {
          examCount: sets.length,
          questionRecordCount,
          atomicItemCount: 150,
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
      'Seed Grammar & Vocabulary thất bại:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}

export { buildSeedSets, validateSets, verifyDatabase };
