import 'dotenv/config';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { inflateRawSync } from 'zlib';
import { ExamType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getPartConfig } from '../../../../src/question-bank/question-config';
import { SPEAKING_SEED_SETS, SpeakingSeedSet } from './data';

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

interface PreparedQuestion {
  seedKey: string;
  partNumber: 1 | 2 | 3 | 4;
  content: string;
  extraConfig: Record<string, unknown>;
  orderIndex: number;
}

const SPEAKING_SKILL_ID = 5;
const SPEAKING_DURATION_MINUTES = 15;
const SOURCE_DOCUMENT = 'Speaking lamf laij copy 2.docx';
const DOCX_PATH = resolve(
  process.cwd(),
  process.env.SPEAKING_SEED_DOCX || SOURCE_DOCUMENT,
);
const API_BASE_URL = (
  process.env.SEED_API_BASE_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '123456';

const PART_INSTRUCTIONS: Record<number, string> = {
  1: 'Answer three questions about yourself and your interests. You have 30 seconds for each response.',
  2: 'Describe one picture and answer two follow-up questions. You have 45 seconds for each response.',
  3: 'Compare two pictures and answer two follow-up questions. You have 45 seconds for each response.',
  4: 'You have one minute to prepare, then two minutes to answer all three questions.',
};

function asObject(value: Prisma.JsonValue | null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function imageMimeType(filename: string) {
  const extension = filename.toLowerCase().split('.').pop();
  if (extension === 'png') return 'image/png';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

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

async function uploadImage(
  accessToken: string,
  archive: Buffer,
  filename: string,
  partNumber: number,
) {
  const image = findZipEntry(archive, `word/media/${filename}`);
  const mimeType = imageMimeType(filename);
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(image)], { type: mimeType }),
    filename,
  );

  const response = await fetch(
    `${API_BASE_URL}/files/upload?folder_type=images&prefix=speaking/p${partNumber}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );
  const result = await readApiResponse<UploadData>(response);
  return result.data.url;
}

function collectRequiredImages() {
  const required = new Map<string, number>();
  for (const set of SPEAKING_SEED_SETS) {
    for (const part of set.parts) {
      for (const filename of part.sourceImages) {
        if (!required.has(filename)) required.set(filename, part.partNumber);
      }
    }
  }
  return required;
}

async function loadReusableImageUrls(prisma: PrismaClient, adminId: number) {
  const imageUrls = new Map<string, string>();
  const existingQuestions = await prisma.questionBank.findMany({
    where: {
      skillId: SPEAKING_SKILL_ID,
      createdBy: adminId,
      deletedAt: null,
    },
    select: { extraConfig: true },
  });

  for (const question of existingQuestions) {
    const config = asObject(question.extraConfig);
    const sources = config?.seed_source_images;
    const urls = config?.image_urls;
    if (!Array.isArray(sources) || !Array.isArray(urls)) continue;
    sources.forEach((source, index) => {
      const url = urls[index];
      if (typeof source === 'string' && typeof url === 'string') {
        imageUrls.set(source, url);
      }
    });
  }
  return imageUrls;
}

async function prepareImageUrls(prisma: PrismaClient, adminId: number) {
  const required = collectRequiredImages();
  const imageUrls = await loadReusableImageUrls(prisma, adminId);
  const missing = [...required].filter(
    ([filename]) => !imageUrls.has(filename),
  );

  if (missing.length === 0) {
    console.log('Tái sử dụng toàn bộ URL ảnh Speaking đã upload trước đó.');
    return imageUrls;
  }

  console.log(
    `Cần upload ${missing.length}/${required.size} ảnh từ ${DOCX_PATH} qua API.`,
  );
  const [archive, accessToken] = await Promise.all([
    readFile(DOCX_PATH),
    login(),
  ]);

  for (const [index, [filename, partNumber]] of missing.entries()) {
    const url = await uploadImage(accessToken, archive, filename, partNumber);
    imageUrls.set(filename, url);
    console.log(`[${index + 1}/${missing.length}] ${filename} -> ${url}`);
  }

  return imageUrls;
}

function seedPrefix(set: SpeakingSeedSet) {
  const number = set.title.match(/(\d+)$/)?.[1] || set.title;
  return `speaking-test-${number}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function prepareQuestions(
  set: SpeakingSeedSet,
  imageUrls: Map<string, string>,
) {
  const prepared = new Map<number, PreparedQuestion[]>();
  const prefix = seedPrefix(set);

  for (const part of set.parts) {
    if (part.partNumber === 1) {
      prepared.set(
        1,
        part.questions.map((question, index) => ({
          seedKey: `${prefix}-p1-q${index + 1}`,
          partNumber: 1,
          content: question,
          orderIndex: index,
          extraConfig: {
            response_time_seconds: 30,
            prep_time_seconds: 0,
            image_count: 0,
            seed_key: `${prefix}-p1-q${index + 1}`,
            seed_source_document: SOURCE_DOCUMENT,
          },
        })),
      );
      continue;
    }

    const urls = part.sourceImages.map((filename) => {
      const url = imageUrls.get(filename);
      if (!url) throw new Error(`Thiếu URL đã upload của ${filename}.`);
      return url;
    });
    const seedKey = `${prefix}-p${part.partNumber}`;
    prepared.set(part.partNumber, [
      {
        seedKey,
        partNumber: part.partNumber,
        content: part.content,
        orderIndex: 0,
        extraConfig: {
          response_time_seconds: part.partNumber === 4 ? 120 : 45,
          prep_time_seconds: part.partNumber === 4 ? 60 : 0,
          image_count: part.sourceImages.length,
          image_urls: urls,
          questions: part.questions.map((question) => ({ question })),
          seed_key: seedKey,
          seed_source_document: SOURCE_DOCUMENT,
          seed_source_images: part.sourceImages,
        },
      },
    ]);
  }

  return prepared;
}

async function loadExistingSeedQuestions(
  prisma: PrismaClient,
  adminId: number,
) {
  const result = new Map<string, number>();
  const questions = await prisma.questionBank.findMany({
    where: { skillId: SPEAKING_SKILL_ID, createdBy: adminId },
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
  const config = getPartConfig(SPEAKING_SKILL_ID, question.partNumber);
  config.validate({
    content: question.content,
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
      skillId: SPEAKING_SKILL_ID,
      partNumber: question.partNumber,
      createdBy: adminId,
      ...data,
    },
  });
  existingByKey.set(question.seedKey, created.id);
  return created;
}

async function upsertSpeakingSet(
  prisma: PrismaClient,
  set: SpeakingSeedSet,
  adminId: number,
  imageUrls: Map<string, string>,
  existingByKey: Map<string, number>,
) {
  const prepared = prepareQuestions(set, imageUrls);

  return prisma.$transaction(async (tx) => {
    let exam = await tx.examSet.findFirst({
      where: {
        title: set.title,
        type: ExamType.SKILL_FULL_SET,
        skillId: SPEAKING_SKILL_ID,
      },
    });
    if (exam) {
      exam = await tx.examSet.update({
        where: { id: exam.id },
        data: {
          description: set.description,
          isActive: true,
          deletedAt: null,
        },
      });
    } else {
      exam = await tx.examSet.create({
        data: {
          title: set.title,
          description: set.description,
          type: ExamType.SKILL_FULL_SET,
          skillId: SPEAKING_SKILL_ID,
          partNumber: null,
          isActive: true,
          createdBy: adminId,
        },
      });
    }

    let section = await tx.examSection.findFirst({
      where: { examId: exam.id, skillId: SPEAKING_SKILL_ID },
    });
    if (section) {
      section = await tx.examSection.update({
        where: { id: section.id },
        data: { durationMinutes: SPEAKING_DURATION_MINUTES, orderIndex: 0 },
      });
    } else {
      section = await tx.examSection.create({
        data: {
          examId: exam.id,
          skillId: SPEAKING_SKILL_ID,
          durationMinutes: SPEAKING_DURATION_MINUTES,
          orderIndex: 0,
        },
      });
    }

    let questionCount = 0;
    for (let partNumber = 1; partNumber <= 4; partNumber++) {
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

      const questions = prepared.get(partNumber) || [];
      const assignments: { questionId: number; orderIndex: number }[] = [];
      for (const questionSeed of questions) {
        const question = await upsertQuestion(
          tx,
          questionSeed,
          adminId,
          existingByKey,
        );
        assignments.push({
          questionId: question.id,
          orderIndex: questionSeed.orderIndex,
        });
        questionCount++;
      }

      await tx.examPartQuestion.deleteMany({ where: { examPartId: part.id } });
      if (assignments.length > 0) {
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

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const [admin, speakingSkill] = await Promise.all([
      prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }),
      prisma.skill.findUnique({ where: { id: SPEAKING_SKILL_ID } }),
    ]);
    if (!admin) {
      throw new Error(
        `Không tìm thấy ADMIN ${ADMIN_EMAIL}. Hãy chạy pnpm db:seed trước.`,
      );
    }
    if (!speakingSkill) {
      throw new Error(
        'Chưa có skill Speaking (id=5). Hãy chạy pnpm db:seed trước.',
      );
    }

    const imageUrls = await prepareImageUrls(prisma, admin.id);
    const existingByKey = await loadExistingSeedQuestions(prisma, admin.id);
    let questionCount = 0;
    const examIds: number[] = [];

    for (const set of SPEAKING_SEED_SETS) {
      const result = await upsertSpeakingSet(
        prisma,
        set,
        admin.id,
        imageUrls,
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
        {
          examCount: SPEAKING_SEED_SETS.length,
          questionCount,
          uploadedImageCount: collectRequiredImages().size,
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
      'Seed Speaking thất bại:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
