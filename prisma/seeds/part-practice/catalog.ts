import { READING_SEED_SETS } from '../skills/reading/data';
import { SPEAKING_SEED_SETS } from '../skills/speaking/data';
import { WRITING_SEED_SOURCE_MAP } from '../skills/writing/data';

export interface PartPracticeSkillCatalog {
  skillId: number;
  skillName: string;
  titleName: string;
  partCount: number;
  sourceExamTitles: string[];
}

function numberedTitles(prefix: string, count: number) {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`,
  );
}

export const PART_PRACTICE_CATALOG: PartPracticeSkillCatalog[] = [
  {
    skillId: 1,
    skillName: 'Grammar & Vocabulary',
    titleName: 'Grammar & Vocabulary',
    partCount: 2,
    sourceExamTitles: numberedTitles('APTIS Grammar & Vocabulary Test ', 3),
  },
  {
    skillId: 2,
    skillName: 'Listening',
    titleName: 'Listening',
    partCount: 4,
    sourceExamTitles: numberedTitles('APTIS Listening Test ', 15),
  },
  {
    skillId: 3,
    skillName: 'Reading',
    titleName: 'Reading',
    partCount: 5,
    sourceExamTitles: READING_SEED_SETS.map((set) => set.title),
  },
  {
    skillId: 4,
    skillName: 'Writing',
    titleName: 'Writing',
    partCount: 4,
    sourceExamTitles: WRITING_SEED_SOURCE_MAP.map(
      (mapping) =>
        `APTIS Writing Test ${String(mapping.testNumber).padStart(2, '0')} - ${mapping.title}`,
    ),
  },
  {
    skillId: 5,
    skillName: 'Speaking',
    titleName: 'Speaking',
    partCount: 4,
    sourceExamTitles: SPEAKING_SEED_SETS.map((set) => set.title),
  },
];

export const EXPECTED_PART_PRACTICE_EXAM_COUNT = PART_PRACTICE_CATALOG.reduce(
  (total, skill) => total + skill.partCount,
  0,
);
