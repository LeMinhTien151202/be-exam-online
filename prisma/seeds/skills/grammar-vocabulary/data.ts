// Source mappings and normalized data for Grammar & Vocabulary full-set seeds.
export type VocabularyTaskVariant =
  | 'DEFINITION'
  | 'COLLOCATION'
  | 'SENTENCE'
  | 'SYNONYM'
  | 'ANTONYM';

export interface VocabularySlotSource {
  prompt: string;
  correctAnswer: string;
}

export interface VocabularyTaskSource {
  variant: VocabularyTaskVariant;
  content: string;
  optionsPool: string[];
  slots: VocabularySlotSource[];
}

export interface GrammarVocabularySourceSet {
  version: number;
  documentName: string;
  grammarCorrectIndexes: number[];
  vocabularyTasks: VocabularyTaskSource[];
}

const SYNONYM_INSTRUCTION =
  'Select the word from the list that is most similar in meaning to each word on the left. Use each word once only. You will not need five of the words.';
const DEFINITION_INSTRUCTION =
  'Complete each definition using a word from the list. Use each word once only. You will not need five of the words.';
const SENTENCE_INSTRUCTION =
  'Finish each sentence using a word from the list. Use each word once only. You will not need five of the words.';
const COLLOCATION_INSTRUCTION =
  'Select the word from the list that is most often used with each word on the left. Use each word once only. You will not need five of the words.';

export const GRAMMAR_VOCABULARY_SOURCE_SETS: GrammarVocabularySourceSet[] = [
  {
    version: 1,
    documentName: 'GRAMMAR-APTIS-VER-1.docx',
    grammarCorrectIndexes: [
      1, 0, 2, 2, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 2, 1, 0, 2, 0, 1, 1, 1, 2, 0, 0,
    ],
    vocabularyTasks: [
      {
        variant: 'SYNONYM',
        content: SYNONYM_INSTRUCTION,
        // The source repeats "propose" at both A and G. G is corrected to
        // "respond" so the word bank remains unambiguous; no answer uses G.
        optionsPool: [
          'propose',
          'allow',
          'make',
          'function',
          'take',
          'tell',
          'respond',
          'believe',
          'debate',
          'worry',
        ],
        slots: [
          { prompt: 'operate', correctAnswer: 'function' },
          { prompt: 'inform', correctAnswer: 'tell' },
          { prompt: 'argue', correctAnswer: 'debate' },
          { prompt: 'grant', correctAnswer: 'allow' },
          { prompt: 'suggest', correctAnswer: 'propose' },
        ],
      },
      {
        variant: 'DEFINITION',
        content: DEFINITION_INSTRUCTION,
        optionsPool: [
          'concern',
          'challenge',
          'instruct',
          'appear',
          'worry',
          'obtain',
          'wish',
          'compensate',
          'assume',
          'approve',
        ],
        slots: [
          { prompt: 'To oppose someone is to', correctAnswer: 'challenge' },
          { prompt: 'To teach someone is to', correctAnswer: 'instruct' },
          { prompt: 'To accept something is to', correctAnswer: 'approve' },
          { prompt: 'To get something is to', correctAnswer: 'obtain' },
          { prompt: 'To pay someone is to', correctAnswer: 'compensate' },
        ],
      },
      {
        variant: 'DEFINITION',
        content: DEFINITION_INSTRUCTION,
        optionsPool: [
          'core',
          'brave',
          'crucial',
          'origin',
          'fierce',
          'lazy',
          'bargain',
          'peculiar',
          'penalty',
          'literature',
        ],
        slots: [
          {
            prompt: 'The starting point or beginning of something',
            correctAnswer: 'origin',
          },
          { prompt: 'The centre of something', correctAnswer: 'core' },
          {
            prompt: 'Items you bought at a good price',
            correctAnswer: 'bargain',
          },
          {
            prompt: 'What you receive as a disadvantage when you break the law',
            correctAnswer: 'penalty',
          },
          {
            prompt: 'A well-written work that lasts over time',
            correctAnswer: 'literature',
          },
        ],
      },
      {
        variant: 'SENTENCE',
        content: SENTENCE_INSTRUCTION,
        optionsPool: [
          'atmosphere',
          'canteen',
          'ceiling',
          'invite',
          'hire',
          'envelope',
          'rope',
          'hedge',
          'elbow',
          'piano',
        ],
        slots: [
          {
            prompt: 'We can _______ him, but we should ask his wife too.',
            correctAnswer: 'invite',
          },
          {
            prompt:
              'We cannot _______ him because he is too young for this job.',
            correctAnswer: 'hire',
          },
          {
            prompt: 'You need to press keys to play the _______.',
            correctAnswer: 'piano',
          },
          {
            prompt: 'You should bring _______ to climb mountains.',
            correctAnswer: 'rope',
          },
          {
            prompt: 'The _______ is in the middle of the arm.',
            correctAnswer: 'elbow',
          },
        ],
      },
      {
        variant: 'COLLOCATION',
        content: COLLOCATION_INSTRUCTION,
        optionsPool: [
          'clean',
          'energy',
          'customer',
          'food',
          'friends',
          'artist',
          'magazine',
          'speed',
          'status',
          'tasks',
        ],
        slots: [
          { prompt: 'solo', correctAnswer: 'artist' },
          { prompt: 'thermal', correctAnswer: 'energy' },
          { prompt: 'glossy', correctAnswer: 'magazine' },
          { prompt: 'furious', correctAnswer: 'customer' },
          { prompt: 'housework', correctAnswer: 'tasks' },
        ],
      },
    ],
  },
  {
    version: 2,
    documentName: 'Grammar-ver-2 (2).docx',
    grammarCorrectIndexes: [
      2, 1, 0, 1, 1, 0, 0, 0, 2, 1, 1, 0, 0, 1, 0, 2, 1, 2, 1, 0, 2, 1, 2, 0, 2,
    ],
    vocabularyTasks: [
      {
        variant: 'SYNONYM',
        content: SYNONYM_INSTRUCTION,
        optionsPool: [
          'area',
          'rule',
          'money',
          'base',
          'chance',
          'department',
          'plan',
          'approach',
          'business',
          'surprise',
        ],
        slots: [
          { prompt: 'design', correctAnswer: 'plan' },
          { prompt: 'policy', correctAnswer: 'approach' },
          { prompt: 'fortune', correctAnswer: 'money' },
          { prompt: 'wonder', correctAnswer: 'surprise' },
          { prompt: 'opportunity', correctAnswer: 'chance' },
        ],
      },
      {
        variant: 'DEFINITION',
        content: DEFINITION_INSTRUCTION,
        optionsPool: [
          'figure',
          'board',
          'cottage',
          'army',
          'desk',
          'crowd',
          'carpet',
          'character',
          'case',
          'example',
        ],
        slots: [
          {
            prompt: 'A group of people who protect a country is an',
            correctAnswer: 'army',
          },
          {
            prompt: 'A covering for floors is called a',
            correctAnswer: 'carpet',
          },
          {
            prompt: 'A type of house in the country is called a',
            correctAnswer: 'cottage',
          },
          {
            prompt: 'A large group of people together is called a',
            correctAnswer: 'crowd',
          },
          {
            prompt: 'A type of table used for work is called a',
            correctAnswer: 'desk',
          },
        ],
      },
      {
        variant: 'SENTENCE',
        content: SENTENCE_INSTRUCTION,
        optionsPool: [
          'sock',
          'hood',
          'light',
          'script',
          'witness',
          'error',
          'port',
          'call',
          'champion',
          'country',
        ],
        slots: [
          {
            prompt: 'Just one more _______ is enough to end the project.',
            correctAnswer: 'error',
          },
          {
            prompt: 'The jacket has a _______ to protect your head.',
            correctAnswer: 'hood',
          },
          {
            prompt: 'The ship sailed into the _______ on time.',
            correctAnswer: 'port',
          },
          {
            prompt: 'The actors read their lines from the _______.',
            correctAnswer: 'script',
          },
          {
            prompt: 'The cycling _______ broke the world record.',
            correctAnswer: 'champion',
          },
        ],
      },
      {
        variant: 'SENTENCE',
        content: SENTENCE_INSTRUCTION,
        optionsPool: [
          'fly',
          'involve',
          'approve',
          'benefit',
          'complicate',
          'compete',
          'focus',
          'presume',
          'borrow',
          'catch',
        ],
        slots: [
          {
            prompt: 'The board will _______ the plan tomorrow.',
            correctAnswer: 'approve',
          },
          {
            prompt: 'Can I _______ some money from you?',
            correctAnswer: 'borrow',
          },
          {
            prompt: 'This fact is going to _______ everything.',
            correctAnswer: 'complicate',
          },
          {
            prompt: 'Two teams are going to _______ in the race.',
            correctAnswer: 'compete',
          },
          {
            prompt: 'She could not _______ on the question.',
            correctAnswer: 'focus',
          },
        ],
      },
      {
        variant: 'COLLOCATION',
        content: COLLOCATION_INSTRUCTION,
        optionsPool: [
          'property',
          'hygiene',
          'mechanism',
          'effort',
          'agreement',
          'formula',
          'personnel',
          'profile',
          'effect',
          'origins',
        ],
        slots: [
          { prompt: 'adverse', correctAnswer: 'effect' },
          { prompt: 'vacant', correctAnswer: 'property' },
          { prompt: 'collaborative', correctAnswer: 'effort' },
          { prompt: 'unanimous', correctAnswer: 'agreement' },
          { prompt: 'humble', correctAnswer: 'origins' },
        ],
      },
    ],
  },
  {
    version: 3,
    documentName: 'Grammar-ver3 (1).docx',
    grammarCorrectIndexes: [
      0, 1, 1, 1, 0, 0, 1, 2, 1, 1, 2, 0, 2, 0, 1, 1, 0, 2, 1, 2, 1, 1, 0, 2, 1,
    ],
    vocabularyTasks: [
      {
        variant: 'SYNONYM',
        content: SYNONYM_INSTRUCTION,
        optionsPool: [
          'doubt',
          'tell',
          'accept',
          'join',
          'realise',
          'assume',
          'job',
          'finish',
          'disagree',
          'touch',
        ],
        slots: [
          { prompt: 'oppose', correctAnswer: 'disagree' },
          { prompt: 'unite', correctAnswer: 'join' },
          { prompt: 'complete', correctAnswer: 'finish' },
          { prompt: 'inform', correctAnswer: 'tell' },
          { prompt: 'occupation', correctAnswer: 'job' },
        ],
      },
      {
        variant: 'DEFINITION',
        content: DEFINITION_INSTRUCTION,
        optionsPool: [
          'instruct',
          'improve',
          'follow',
          'share',
          'cover',
          'refuse',
          'measure',
          'link',
          'observe',
          'estimate',
        ],
        slots: [
          { prompt: 'To say no is to', correctAnswer: 'refuse' },
          { prompt: 'To look at something is to', correctAnswer: 'observe' },
          { prompt: 'To wrap something is to', correctAnswer: 'cover' },
          { prompt: 'To give orders is to', correctAnswer: 'instruct' },
          { prompt: 'To guess something is to', correctAnswer: 'estimate' },
        ],
      },
      {
        variant: 'SYNONYM',
        content: SYNONYM_INSTRUCTION,
        optionsPool: [
          'catch',
          'dance',
          'chase',
          'hit',
          'step',
          'stand',
          'excite',
          'laugh',
          'mix',
          'fix',
        ],
        slots: [
          { prompt: 'whack', correctAnswer: 'hit' },
          { prompt: 'tread', correctAnswer: 'step' },
          { prompt: 'arrest', correctAnswer: 'catch' },
          { prompt: 'mend', correctAnswer: 'fix' },
          { prompt: 'thrill', correctAnswer: 'excite' },
        ],
      },
      {
        variant: 'COLLOCATION',
        content: COLLOCATION_INSTRUCTION,
        optionsPool: [
          'hunters',
          'subject',
          'employee',
          'programme',
          'shoppers',
          'joint',
          'proportions',
          'wipers',
          'size',
          'businessmen',
        ],
        slots: [
          { prompt: 'millionaire', correctAnswer: 'businessmen' },
          { prompt: 'epidemic', correctAnswer: 'proportions' },
          { prompt: 'diploma', correctAnswer: 'programme' },
          { prompt: 'windscreen', correctAnswer: 'wipers' },
          { prompt: 'bargain', correctAnswer: 'hunters' },
        ],
      },
      {
        variant: 'SENTENCE',
        content: SENTENCE_INSTRUCTION,
        optionsPool: [
          'catch',
          'vicious',
          'swift',
          'organic',
          'ripe',
          'extravagant',
          'secret',
          'furious',
          'vocal',
          'calm',
        ],
        slots: [
          {
            prompt:
              "I don't buy _______ food because it is expensive and I think it is a waste of money.",
            correctAnswer: 'organic',
          },
          {
            prompt:
              'He was an excitable man and was very _______ about being unhappy.',
            correctAnswer: 'vocal',
          },
          {
            prompt:
              'It was one of the ugliest things I have ever seen. It was absolutely _______.',
            correctAnswer: 'vicious',
          },
          {
            prompt:
              'They had spent a huge amount of money on the wedding. It was very _______.',
            correctAnswer: 'extravagant',
          },
          {
            prompt:
              'When the player found out he had lost the point, he was absolutely _______.',
            correctAnswer: 'furious',
          },
        ],
      },
    ],
  },
];

export const GRAMMAR_VOCABULARY_SOURCE_CORRECTIONS = [
  'Ver 1 Vocabulary Task 1: replaced the duplicated distractor at source option G (propose) with respond.',
  "Ver 2 Grammar Question 9: normalized the OCR option I’II to I'll.",
  'Ver 2 Grammar Question 19: corrected the local answer image from C (have felt) to B (be feeling), matching the British Council answer key and sentence grammar.',
  'Ver 2 Vocabulary Task 1, policy: corrected the local answer image from B (rule) to H (approach), matching the British Council answer key.',
];
