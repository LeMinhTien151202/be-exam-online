import 'dotenv/config';
import { ExamType, Prisma, PrismaClient } from '@prisma/client';
import { PART_PRACTICE_CATALOG } from '../part-practice/catalog';
import { createSeedPrisma, requireSeedAdmin } from '../shared/database';

const SEED_MARKER = '[seed:mock-tests/v1]';
const MOCK_TEST_COUNT = 3;

const SOURCE_INCLUDE = Prisma.validator<Prisma.ExamSetInclude>()({
  sections: {
    include: {
      parts: {
        include: {
          questions: {
            orderBy: [{ orderIndex: 'asc' }, { questionId: 'asc' }],
          },
        },
      },
    },
  },
});

type SourceExam = Prisma.ExamSetGetPayload<{
  include: typeof SOURCE_INCLUDE;
}>;

interface MockPartPlan {
  partNumber: number;
  instruction: string | null;
  audioUrl: string | null;
  questions: { questionId: number; orderIndex: number }[];
}

interface MockSectionPlan {
  skillId: number;
  skillName: string;
  sourceTitle: string;
  durationMinutes: number;
  orderIndex: number;
  parts: MockPartPlan[];
}

interface MockTestPlan {
  testNumber: number;
  title: string;
  description: string;
  sections: MockSectionPlan[];
}

function mockTitle(testNumber: number) {
  return `Thi thử APTIS đầy đủ - Đề ${String(testNumber).padStart(2, '0')}`;
}

async function loadMockTestPlans(prisma: PrismaClient, adminId: number) {
  const sourcesBySkill = new Map<number, SourceExam[]>();

  for (const catalog of PART_PRACTICE_CATALOG) {
    if (catalog.sourceExamTitles.length < MOCK_TEST_COUNT) {
      throw new Error(
        `${catalog.skillName}: cần ít nhất ${MOCK_TEST_COUNT} full set để tạo đề thi thử.`,
      );
    }
    const selectedTitles = catalog.sourceExamTitles.slice(0, MOCK_TEST_COUNT);
    const rows = await prisma.examSet.findMany({
      where: {
        title: { in: selectedTitles },
        type: ExamType.SKILL_FULL_SET,
        skillId: catalog.skillId,
        createdBy: adminId,
        deletedAt: null,
      },
      include: SOURCE_INCLUDE,
    });
    const ordered = selectedTitles.map((title) => {
      const matches = rows.filter((row) => row.title === title);
      if (matches.length !== 1) {
        throw new Error(
          `${catalog.skillName}: cần đúng một full set "${title}", tìm thấy ${matches.length}.`,
        );
      }
      return matches[0];
    });
    sourcesBySkill.set(catalog.skillId, ordered);
  }

  return Array.from({ length: MOCK_TEST_COUNT }, (_, testIndex) => {
    const testNumber = testIndex + 1;
    const sections = PART_PRACTICE_CATALOG.map((catalog, skillIndex) => {
      const source = sourcesBySkill.get(catalog.skillId)?.[testIndex];
      if (!source) {
        throw new Error(
          `${catalog.skillName}: thiếu full set cho mock test ${testNumber}.`,
        );
      }
      const matchingSections = source.sections.filter(
        (section) => section.skillId === catalog.skillId,
      );
      if (matchingSections.length !== 1) {
        throw new Error(`${source.title}: cấu trúc section không hợp lệ.`);
      }
      const sourceSection = matchingSections[0];
      const parts = Array.from(
        { length: catalog.partCount },
        (_, partIndex) => {
          const partNumber = partIndex + 1;
          const matches = sourceSection.parts.filter(
            (part) => part.partNumber === partNumber,
          );
          if (matches.length !== 1 || matches[0].questions.length === 0) {
            throw new Error(
              `${source.title}: Part ${partNumber} thiếu hoặc không có câu hỏi.`,
            );
          }
          const sourcePart = matches[0];
          return {
            partNumber,
            instruction: sourcePart.instruction,
            audioUrl: sourcePart.audioUrl,
            questions: sourcePart.questions.map((question) => ({
              questionId: question.questionId,
              orderIndex: question.orderIndex,
            })),
          };
        },
      );
      return {
        skillId: catalog.skillId,
        skillName: catalog.skillName,
        sourceTitle: source.title,
        durationMinutes: sourceSection.durationMinutes,
        orderIndex: skillIndex,
        parts,
      };
    });
    return {
      testNumber,
      title: mockTitle(testNumber),
      description: [
        SEED_MARKER,
        'Đề thi thử gồm đủ 5 kỹ năng, sử dụng câu hỏi từ các full set tương ứng.',
        ...sections.map(
          (section) => `${section.skillName}: ${section.sourceTitle}`,
        ),
      ].join('\n'),
      sections,
    };
  });
}

function summarizePlans(plans: MockTestPlan[]) {
  return {
    examCount: plans.length,
    sectionCount: plans.reduce(
      (total, plan) => total + plan.sections.length,
      0,
    ),
    partCount: plans.reduce(
      (total, plan) =>
        total +
        plan.sections.reduce(
          (sectionTotal, section) => sectionTotal + section.parts.length,
          0,
        ),
      0,
    ),
    questionAssignmentCount: plans.reduce(
      (total, plan) =>
        total +
        plan.sections.reduce(
          (sectionTotal, section) =>
            sectionTotal +
            section.parts.reduce(
              (partTotal, part) => partTotal + part.questions.length,
              0,
            ),
          0,
        ),
      0,
    ),
    exams: plans.map((plan) => ({
      testNumber: plan.testNumber,
      title: plan.title,
      sources: Object.fromEntries(
        plan.sections.map((section) => [
          section.skillName,
          section.sourceTitle,
        ]),
      ),
      questionCount: plan.sections.reduce(
        (total, section) =>
          total +
          section.parts.reduce(
            (partTotal, part) => partTotal + part.questions.length,
            0,
          ),
        0,
      ),
    })),
  };
}

async function upsertMockTest(
  tx: Prisma.TransactionClient,
  plan: MockTestPlan,
  adminId: number,
) {
  const matches = await tx.examSet.findMany({
    where: {
      title: plan.title,
      type: ExamType.MOCK_TEST,
      createdBy: adminId,
    },
  });
  if (matches.length > 1) {
    throw new Error(`${plan.title}: có nhiều đề trùng tên.`);
  }
  let exam = matches[0];
  if (exam && !exam.description?.includes(SEED_MARKER)) {
    throw new Error(
      `${plan.title}: đã tồn tại nhưng không thuộc mock-test seed.`,
    );
  }
  exam = exam
    ? await tx.examSet.update({
        where: { id: exam.id },
        data: {
          description: plan.description,
          skillId: null,
          partNumber: null,
          isActive: true,
          deletedAt: null,
        },
      })
    : await tx.examSet.create({
        data: {
          title: plan.title,
          description: plan.description,
          type: ExamType.MOCK_TEST,
          skillId: null,
          partNumber: null,
          isActive: true,
          createdBy: adminId,
        },
      });

  await tx.examSection.deleteMany({ where: { examId: exam.id } });
  for (const section of plan.sections) {
    await tx.examSection.create({
      data: {
        examId: exam.id,
        skillId: section.skillId,
        durationMinutes: section.durationMinutes,
        orderIndex: section.orderIndex,
        parts: {
          create: section.parts.map((part) => ({
            partNumber: part.partNumber,
            instruction: part.instruction,
            audioUrl: part.audioUrl,
            questions: { createMany: { data: part.questions } },
          })),
        },
      },
    });
  }
  return exam.id;
}

async function seedMockTests(
  prisma: PrismaClient,
  plans: MockTestPlan[],
  adminId: number,
) {
  return prisma.$transaction(
    async (tx) => {
      const examIds: number[] = [];
      for (const plan of plans) {
        examIds.push(await upsertMockTest(tx, plan, adminId));
      }
      return examIds;
    },
    { timeout: 120_000 },
  );
}

async function verifyMockTests(
  prisma: PrismaClient,
  plans: MockTestPlan[],
  adminId: number,
) {
  const exams = await prisma.examSet.findMany({
    where: {
      type: ExamType.MOCK_TEST,
      createdBy: adminId,
      description: { contains: SEED_MARKER },
      deletedAt: null,
    },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          parts: {
            orderBy: { partNumber: 'asc' },
            include: {
              questions: {
                orderBy: [{ orderIndex: 'asc' }, { questionId: 'asc' }],
              },
            },
          },
        },
      },
    },
  });
  if (exams.length !== MOCK_TEST_COUNT) {
    throw new Error(
      `Database cần ${MOCK_TEST_COUNT} mock tests, có ${exams.length}.`,
    );
  }

  let assignmentCount = 0;
  for (const plan of plans) {
    const matches = exams.filter((exam) => exam.title === plan.title);
    if (matches.length !== 1) {
      throw new Error(`${plan.title}: thiếu hoặc trùng đề trong database.`);
    }
    const exam = matches[0];
    if (exam.skillId !== null || exam.partNumber !== null) {
      throw new Error(
        `${plan.title}: MOCK_TEST không được có skillId/partNumber.`,
      );
    }
    if (exam.sections.length !== plan.sections.length) {
      throw new Error(`${plan.title}: số section không khớp.`);
    }
    plan.sections.forEach((expectedSection, sectionIndex) => {
      const actualSection = exam.sections[sectionIndex];
      if (
        actualSection.skillId !== expectedSection.skillId ||
        actualSection.durationMinutes !== expectedSection.durationMinutes ||
        actualSection.orderIndex !== expectedSection.orderIndex ||
        actualSection.parts.length !== expectedSection.parts.length
      ) {
        throw new Error(
          `${plan.title}: section ${sectionIndex + 1} không khớp.`,
        );
      }
      expectedSection.parts.forEach((expectedPart, partIndex) => {
        const actualPart = actualSection.parts[partIndex];
        if (
          actualPart.partNumber !== expectedPart.partNumber ||
          actualPart.instruction !== expectedPart.instruction ||
          actualPart.audioUrl !== expectedPart.audioUrl ||
          actualPart.questions.length !== expectedPart.questions.length
        ) {
          throw new Error(
            `${plan.title}: skill ${expectedSection.skillId} Part ${expectedPart.partNumber} không khớp.`,
          );
        }
        expectedPart.questions.forEach((expectedQuestion, questionIndex) => {
          const actualQuestion = actualPart.questions[questionIndex];
          if (
            actualQuestion.questionId !== expectedQuestion.questionId ||
            actualQuestion.orderIndex !== expectedQuestion.orderIndex
          ) {
            throw new Error(
              `${plan.title}: skill ${expectedSection.skillId} Part ${expectedPart.partNumber}, câu ${questionIndex + 1} không khớp.`,
            );
          }
        });
        assignmentCount += actualPart.questions.length;
      });
    });
  }

  return {
    ...summarizePlans(plans),
    databaseExamCount: exams.length,
    databaseAssignmentCount: assignmentCount,
    examIds: exams.map((exam) => exam.id).sort((a, b) => a - b),
  };
}

async function main() {
  const prisma = createSeedPrisma();
  try {
    const admin = await requireSeedAdmin(prisma);
    const plans = await loadMockTestPlans(prisma, admin.id);
    if (process.argv.includes('--dry-run')) {
      console.log(JSON.stringify(summarizePlans(plans), null, 2));
      return;
    }
    if (process.argv.includes('--verify-only')) {
      console.log(
        JSON.stringify(await verifyMockTests(prisma, plans, admin.id), null, 2),
      );
      return;
    }
    const examIds = await seedMockTests(prisma, plans, admin.id);
    console.log(
      JSON.stringify(
        {
          ...summarizePlans(plans),
          seededExamCount: examIds.length,
          examIds: examIds.sort((a, b) => a - b),
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
      'Seed mock tests thất bại:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
