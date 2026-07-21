// Source mappings and normalized data for Writing full-set seeds.
export interface WritingSeedSourceMap {
  testNumber: number;
  title: string;
  part1QuestionStart: number;
  part23TopicNumber: number;
  part4TopicNumber: number;
}

const WRITING_TOPICS = [
  'Book Club',
  'Art Club',
  'Food Club',
  'Social Club',
  'Beautiful Home Club',
  'Garden Club',
  'Sport Club',
  'Healthy Club',
  'Technology Club',
  'Business Club',
  'Home Living',
  'Television Club',
  'Car Club',
  'Language Club',
  'Travel Club',
  'Cinema Club',
  'Language Club 2',
  'Travel Club 2',
  'College Club',
  'Movie Club',
  'Walking Club',
  'Community Club',
  'Museum Club',
  'Writing Club',
  'Computer Club',
  'Music Club',
  'Fashion Club',
  'Cooking Club',
  'Nature Club',
  'English Club 2',
  'Debate Club',
  'Outdoor Club',
  'English Club 3',
  'English Club 4',
  'Photography Club',
  'Nature Club 2',
  'Film Club',
  'Reading Club',
  'Fitness Club',
  'Science Club',
];

// Part 4 uses a different order for the first seven topics. From topic 8
// onward, its numbering matches the Part 2-3 source document.
const PART4_TOPIC_NUMBERS = [7, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

export const WRITING_SEED_SOURCE_MAP: WritingSeedSourceMap[] =
  WRITING_TOPICS.map((title, index) => {
    const testNumber = index + 1;
    return {
      testNumber,
      title,
      // There are 12 unique groups of five Part 1 questions. For tests 13-40
      // they are reused cyclically, while Parts 2-4 remain unique.
      part1QuestionStart: (index % 12) * 5 + 1,
      part23TopicNumber: testNumber,
      part4TopicNumber: PART4_TOPIC_NUMBERS[index] ?? testNumber,
    };
  });

export const WRITING_SOURCE_NOTICES = [
  'Writing Part 1 Question 43: replaced the six-word sample answer "I want to be a pharmacist." with "A pharmacist.".',
  'Writing Part 3: sample answers above 40 words are shortened by removing filler words while preserving meaning.',
  'Writing Part 4: source sample emails are intentionally omitted because several are incomplete, duplicated, or outside the requested word range.',
  'Writing Part 4 topics 1-7 are matched to Part 2-3 by club name rather than document order.',
  'Writing Part 1: the 12 groups of five prompts are reused cyclically for tests 13-40.',
  'Writing Part 4 topic 14: replaced the unrelated formal-task scenario with a course-manager task that matches the shared English-course context.',
];
