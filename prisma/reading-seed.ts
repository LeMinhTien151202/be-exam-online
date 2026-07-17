import { ExamType, Prisma, PrismaClient } from '@prisma/client';
import { getPartConfig } from '../src/question-bank/question-config';
import { READING_SEED_SETS, ReadingSeedQuestion } from './reading-seed-data';

const READING_SKILL_ID = 3;
const READING_DURATION_MINUTES = 30;

async function upsertQuestion(
  tx: Prisma.TransactionClient,
  question: ReadingSeedQuestion,
  adminId: number,
) {
  getPartConfig(READING_SKILL_ID, question.partNumber).validate({
    content: question.content,
    extraConfig: question.extraConfig,
  });

  const existing = await tx.questionBank.findFirst({
    where: {
      skillId: READING_SKILL_ID,
      partNumber: question.partNumber,
      content: question.content,
      createdBy: adminId,
    },
  });

  const data = {
    questionType: question.questionType,
    content: question.content,
    mediaUrl: null,
    extraConfig: question.extraConfig as Prisma.InputJsonValue,
    deletedAt: null,
  };

  if (existing) {
    return tx.questionBank.update({
      where: { id: existing.id },
      data,
    });
  }

  return tx.questionBank.create({
    data: {
      skillId: READING_SKILL_ID,
      partNumber: question.partNumber,
      createdBy: adminId,
      ...data,
    },
  });
}

export async function seedReadingSets(prisma: PrismaClient, adminId: number) {
  let questionCount = 0;
  let examCount = 0;

  for (const seedSet of READING_SEED_SETS) {
    await prisma.$transaction(async (tx) => {
      let exam = await tx.examSet.findFirst({
        where: {
          title: seedSet.title,
          type: ExamType.SKILL_FULL_SET,
          skillId: READING_SKILL_ID,
        },
      });

      if (exam) {
        exam = await tx.examSet.update({
          where: { id: exam.id },
          data: {
            description: seedSet.description,
            isActive: true,
            deletedAt: null,
          },
        });
      } else {
        exam = await tx.examSet.create({
          data: {
            title: seedSet.title,
            description: seedSet.description,
            type: ExamType.SKILL_FULL_SET,
            skillId: READING_SKILL_ID,
            partNumber: null,
            isActive: true,
            createdBy: adminId,
          },
        });
      }

      let section = await tx.examSection.findFirst({
        where: { examId: exam.id, skillId: READING_SKILL_ID },
      });
      if (!section) {
        section = await tx.examSection.create({
          data: {
            examId: exam.id,
            skillId: READING_SKILL_ID,
            durationMinutes: READING_DURATION_MINUTES,
            orderIndex: 0,
          },
        });
      } else if (section.durationMinutes !== READING_DURATION_MINUTES) {
        section = await tx.examSection.update({
          where: { id: section.id },
          data: { durationMinutes: READING_DURATION_MINUTES },
        });
      }

      const partIds = new Map<number, number>();
      for (let partNumber = 1; partNumber <= 5; partNumber++) {
        let part = await tx.examPart.findFirst({
          where: { sectionId: section.id, partNumber },
        });
        if (!part) {
          part = await tx.examPart.create({
            data: {
              sectionId: section.id,
              partNumber,
              instruction: `Reading Part ${partNumber}`,
            },
          });
        }
        partIds.set(partNumber, part.id);
      }

      for (const questionSeed of seedSet.questions) {
        const question = await upsertQuestion(tx, questionSeed, adminId);
        const examPartId = partIds.get(questionSeed.partNumber);
        if (!examPartId) {
          throw new Error(
            `Không tìm thấy Reading Part ${questionSeed.partNumber} của ${seedSet.title}`,
          );
        }

        await tx.examPartQuestion.upsert({
          where: {
            examPartId_questionId: {
              examPartId,
              questionId: question.id,
            },
          },
          update: { orderIndex: 0 },
          create: {
            examPartId,
            questionId: question.id,
            orderIndex: 0,
          },
        });
        questionCount++;
      }
      examCount++;
    });
  }

  return { examCount, questionCount };
}
