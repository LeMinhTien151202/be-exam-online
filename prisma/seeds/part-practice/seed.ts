import 'dotenv/config';
import { ExamType, Prisma, PrismaClient } from '@prisma/client';
import { createSeedPrisma, requireSeedAdmin } from '../shared/database';
import {
  EXPECTED_PART_PRACTICE_EXAM_COUNT,
  PART_PRACTICE_CATALOG,
  PartPracticeSkillCatalog,
} from './catalog';

const LEGACY_SEED_MARKER = '[seed:part-practice/v1]';
const SEED_MARKER = '[seed:part-practice/v2]';

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

interface PracticeAssignment {
  questionId: number;
  orderIndex: number;
}

interface PracticePlan {
  catalog: PartPracticeSkillCatalog;
  partNumber: number;
  title: string;
  description: string;
  durationMinutes: number;
  instruction: string | null;
  audioUrl: string | null;
  assignments: PracticeAssignment[];
  sourceAssignmentCount: number;
}

function expectedTitle(catalog: PartPracticeSkillCatalog, partNumber: number) {
  return `APTIS ${catalog.titleName} Part ${partNumber} - Practice`;
}

function expectedDescription(
  catalog: PartPracticeSkillCatalog,
  partNumber: number,
) {
  return [
    SEED_MARKER,
    `Practice pool for ${catalog.skillName} Part ${partNumber}, aggregated from ${catalog.sourceExamTitles.length} full sets.`,
  ].join('\n');
}

function getSkillSection(
  source: SourceExam,
  catalog: PartPracticeSkillCatalog,
) {
  const sections = source.sections.filter(
    (section) => section.skillId === catalog.skillId,
  );
  if (sections.length !== 1) {
    throw new Error(
      `${source.title}: expected exactly one section for skill ${catalog.skillId}.`,
    );
  }
  return sections[0];
}

async function loadPracticePlans(prisma: PrismaClient, adminId: number) {
  const plans: PracticePlan[] = [];

  for (const catalog of PART_PRACTICE_CATALOG) {
    const sourceRows = await prisma.examSet.findMany({
      where: {
        title: { in: catalog.sourceExamTitles },
        type: ExamType.SKILL_FULL_SET,
        skillId: catalog.skillId,
        createdBy: adminId,
        deletedAt: null,
      },
      include: SOURCE_INCLUDE,
    });

    const sources = catalog.sourceExamTitles.map((title) => {
      const matches = sourceRows.filter((source) => source.title === title);
      if (matches.length !== 1) {
        throw new Error(
          `${catalog.skillName}: expected one full set named "${title}", found ${matches.length}.`,
        );
      }
      return matches[0];
    });

    for (let partNumber = 1; partNumber <= catalog.partCount; partNumber++) {
      const sourceParts = sources.map((source) => {
        const section = getSkillSection(source, catalog);
        const parts = section.parts.filter(
          (part) => part.partNumber === partNumber,
        );
        if (parts.length !== 1 || parts[0].questions.length === 0) {
          throw new Error(
            `${source.title}: Part ${partNumber} must contain exactly one non-empty part.`,
          );
        }
        return { section, part: parts[0] };
      });

      const durations = new Set(
        sourceParts.map(({ section }) => section.durationMinutes),
      );
      if (durations.size !== 1) {
        throw new Error(
          `${catalog.skillName} Part ${partNumber}: source durations do not match.`,
        );
      }

      const instructions = [
        ...new Set(
          sourceParts
            .map(({ part }) => part.instruction)
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      if (instructions.length > 1) {
        throw new Error(
          `${catalog.skillName} Part ${partNumber}: source instructions do not match.`,
        );
      }

      const partAudioUrls = [
        ...new Set(
          sourceParts
            .map(({ part }) => part.audioUrl)
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      if (partAudioUrls.length > 1) {
        throw new Error(
          `${catalog.skillName} Part ${partNumber}: cannot aggregate multiple part-level audio URLs.`,
        );
      }

      const sourceAssignments = sourceParts.flatMap(({ part }) =>
        part.questions.map((assignment) => ({
          questionId: assignment.questionId,
        })),
      );
      const uniqueQuestionIds = [
        ...new Set(sourceAssignments.map(({ questionId }) => questionId)),
      ];
      const assignments = uniqueQuestionIds.map((questionId, orderIndex) => ({
        questionId,
        orderIndex,
      }));

      plans.push({
        catalog,
        partNumber,
        title: expectedTitle(catalog, partNumber),
        description: expectedDescription(catalog, partNumber),
        durationMinutes: [...durations][0],
        instruction: instructions[0] ?? null,
        audioUrl: partAudioUrls[0] ?? null,
        assignments,
        sourceAssignmentCount: sourceAssignments.length,
      });
    }
  }

  if (plans.length !== EXPECTED_PART_PRACTICE_EXAM_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_PART_PRACTICE_EXAM_COUNT} part-practice plans, found ${plans.length}.`,
    );
  }
  return plans;
}

function summarizePlans(plans: PracticePlan[]) {
  return {
    examCount: plans.length,
    uniqueQuestionAssignmentCount: plans.reduce(
      (total, plan) => total + plan.assignments.length,
      0,
    ),
    sourceQuestionAssignmentCount: plans.reduce(
      (total, plan) => total + plan.sourceAssignmentCount,
      0,
    ),
    skills: PART_PRACTICE_CATALOG.map((catalog) => ({
      skillId: catalog.skillId,
      skillName: catalog.skillName,
      sourceFullSetCount: catalog.sourceExamTitles.length,
      practiceExamCount: plans.filter(
        (plan) => plan.catalog.skillId === catalog.skillId,
      ).length,
      parts: plans
        .filter((plan) => plan.catalog.skillId === catalog.skillId)
        .map((plan) => ({
          partNumber: plan.partNumber,
          questionCount: plan.assignments.length,
          duplicateSourceAssignmentsSkipped:
            plan.sourceAssignmentCount - plan.assignments.length,
        })),
    })),
  };
}

async function upsertPracticeExam(
  tx: Prisma.TransactionClient,
  plan: PracticePlan,
  adminId: number,
) {
  const matches = await tx.examSet.findMany({
    where: {
      title: plan.title,
      type: ExamType.PART_PRACTICE,
      skillId: plan.catalog.skillId,
      partNumber: plan.partNumber,
      createdBy: adminId,
    },
  });
  if (matches.length > 1) {
    throw new Error(`${plan.title}: duplicate target exams found.`);
  }

  let exam = matches[0];
  if (
    exam &&
    !exam.description?.includes(SEED_MARKER) &&
    !exam.description?.includes(LEGACY_SEED_MARKER)
  ) {
    throw new Error(
      `${plan.title}: target exists but is not owned by this seed.`,
    );
  }

  exam = exam
    ? await tx.examSet.update({
        where: { id: exam.id },
        data: {
          description: plan.description,
          isActive: true,
          deletedAt: null,
        },
      })
    : await tx.examSet.create({
        data: {
          title: plan.title,
          description: plan.description,
          type: ExamType.PART_PRACTICE,
          skillId: plan.catalog.skillId,
          partNumber: plan.partNumber,
          isActive: true,
          createdBy: adminId,
        },
      });

  await tx.examSection.deleteMany({ where: { examId: exam.id } });
  await tx.examSection.create({
    data: {
      examId: exam.id,
      skillId: plan.catalog.skillId,
      durationMinutes: plan.durationMinutes,
      orderIndex: 0,
      parts: {
        create: {
          partNumber: plan.partNumber,
          instruction: plan.instruction,
          audioUrl: plan.audioUrl,
          questions: { createMany: { data: plan.assignments } },
        },
      },
    },
  });
  return exam.id;
}

async function seedPartPractice(
  prisma: PrismaClient,
  plans: PracticePlan[],
  adminId: number,
) {
  return prisma.$transaction(
    async (tx) => {
      const legacy = await tx.examSet.findMany({
        where: {
          type: ExamType.PART_PRACTICE,
          createdBy: adminId,
          description: { contains: LEGACY_SEED_MARKER },
        },
        select: { id: true },
      });
      if (legacy.length) {
        await tx.examSet.deleteMany({
          where: { id: { in: legacy.map(({ id }) => id) } },
        });
      }

      const examIds: number[] = [];
      for (const plan of plans) {
        examIds.push(await upsertPracticeExam(tx, plan, adminId));
      }
      return { examIds, removedLegacyExamCount: legacy.length };
    },
    { timeout: 120_000 },
  );
}

export async function verifyPartPractice(
  prisma: PrismaClient,
  plans: PracticePlan[],
  adminId: number,
) {
  const legacyCount = await prisma.examSet.count({
    where: {
      type: ExamType.PART_PRACTICE,
      createdBy: adminId,
      description: { contains: LEGACY_SEED_MARKER },
    },
  });
  if (legacyCount !== 0) {
    throw new Error(`Database still contains ${legacyCount} legacy exams.`);
  }

  const exams = await prisma.examSet.findMany({
    where: {
      type: ExamType.PART_PRACTICE,
      createdBy: adminId,
      description: { contains: SEED_MARKER },
      deletedAt: null,
    },
    include: {
      sections: {
        include: {
          parts: {
            include: {
              questions: { orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      },
    },
  });
  if (exams.length !== EXPECTED_PART_PRACTICE_EXAM_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_PART_PRACTICE_EXAM_COUNT} database exams, found ${exams.length}.`,
    );
  }

  let assignmentCount = 0;
  for (const plan of plans) {
    const matches = exams.filter(
      (exam) =>
        exam.title === plan.title &&
        exam.skillId === plan.catalog.skillId &&
        exam.partNumber === plan.partNumber,
    );
    if (matches.length !== 1) {
      throw new Error(`${plan.title}: target exam is missing or duplicated.`);
    }
    const exam = matches[0];
    if (exam.sections.length !== 1 || exam.sections[0].parts.length !== 1) {
      throw new Error(
        `${plan.title}: expected exactly one section and one part.`,
      );
    }
    const section = exam.sections[0];
    const part = section.parts[0];
    if (
      section.skillId !== plan.catalog.skillId ||
      section.durationMinutes !== plan.durationMinutes ||
      part.partNumber !== plan.partNumber ||
      part.instruction !== plan.instruction ||
      part.audioUrl !== plan.audioUrl
    ) {
      throw new Error(
        `${plan.title}: section or part metadata does not match.`,
      );
    }
    if (part.questions.length !== plan.assignments.length) {
      throw new Error(
        `${plan.title}: expected ${plan.assignments.length} questions, found ${part.questions.length}.`,
      );
    }
    part.questions.forEach((assignment, index) => {
      const expected = plan.assignments[index];
      if (
        assignment.questionId !== expected.questionId ||
        assignment.orderIndex !== expected.orderIndex
      ) {
        throw new Error(`${plan.title}: question ${index + 1} is out of sync.`);
      }
    });
    assignmentCount += part.questions.length;
  }

  return {
    ...summarizePlans(plans),
    databaseExamCount: exams.length,
    databaseAssignmentCount: assignmentCount,
    legacyExamCount: legacyCount,
    examIds: exams.map((exam) => exam.id).sort((a, b) => a - b),
  };
}

async function main() {
  const prisma = createSeedPrisma();
  try {
    const admin = await requireSeedAdmin(prisma);
    const plans = await loadPracticePlans(prisma, admin.id);
    if (process.argv.includes('--dry-run')) {
      console.log(JSON.stringify(summarizePlans(plans), null, 2));
      return;
    }
    if (process.argv.includes('--verify-only')) {
      console.log(
        JSON.stringify(
          await verifyPartPractice(prisma, plans, admin.id),
          null,
          2,
        ),
      );
      return;
    }

    const result = await seedPartPractice(prisma, plans, admin.id);
    console.log(
      JSON.stringify(
        {
          ...summarizePlans(plans),
          ...result,
          seededExamCount: result.examIds.length,
          examIds: result.examIds.sort((a, b) => a - b),
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
      'Part-practice seed failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
}
