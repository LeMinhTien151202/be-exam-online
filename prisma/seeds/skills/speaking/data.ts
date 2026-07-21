// Source mappings and normalized data for Speaking full-set seeds.
export interface SpeakingSeedPart {
  partNumber: 1 | 2 | 3 | 4;
  content: string;
  questions: string[];
  sourceImages: string[];
}

export interface SpeakingSeedSet {
  title: string;
  description: string;
  parts: SpeakingSeedPart[];
}

function part1(...questions: string[]): SpeakingSeedPart {
  return {
    partNumber: 1,
    content: 'Answer the question about yourself and your interests.',
    questions,
    sourceImages: [],
  };
}

function groupedPart(
  partNumber: 2 | 3 | 4,
  content: string,
  sourceImages: string[],
  questions: string[],
): SpeakingSeedPart {
  return { partNumber, content, sourceImages, questions };
}

const p2 = (image: string, questions: string[]) =>
  groupedPart(
    2,
    'Look at the picture and answer the questions.',
    [image],
    questions,
  );

const p3 = (images: [string, string], questions: string[]) =>
  groupedPart(
    3,
    'Look at the two pictures and answer the questions.',
    images,
    questions,
  );

const p4 = (image: string, topic: string, questions: string[]) =>
  groupedPart(4, topic, [image], questions);

export const SPEAKING_SEED_SETS: SpeakingSeedSet[] = [
  {
    title: 'Speaking Test 01',
    description:
      'Aptis Speaking full set 01 - friends, homes and material possessions.',
    parts: [
      part1(
        'Describe your journey here today.',
        'What is your favourite season, and why?',
        'What did you do last night?',
      ),
      p2('image1.png', [
        'Describe the picture.',
        'When was the last time you went somewhere with your friends?',
        'Why do people enjoy doing things together?',
      ]),
      p3(
        ['image2.png', 'image3.png'],
        [
          'Tell me what you see in the two pictures.',
          'Where would you rather live, and why?',
          'Why do people like to decorate their homes?',
        ],
      ),
      p4('image4.jpeg', 'Talk about material possessions.', [
        'Tell me about a time when you could not buy something you wanted.',
        'How did you feel at that time?',
        'Material possessions alone cannot make people happy. Do you agree or disagree?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 02',
    description:
      'Aptis Speaking full set 02 - childhood, animals and helping other people.',
    parts: [
      part1(
        'What are you wearing today?',
        'Tell me about your hometown.',
        'Who is your favourite person, and why?',
      ),
      p2('image5.png', [
        'Describe the picture.',
        'What kind of games did you play when you were a child?',
        "Some people say that active games improve children's thinking. What do you think?",
      ]),
      p3(
        ['image6.png', 'image7.png'],
        [
          'Compare the two pictures.',
          'How should people care for the animals shown in the pictures?',
          'Some people think wild animals should not be kept at home. What do you think?',
        ],
      ),
      p4('image8.jpeg', 'Talk about helping other people.', [
        'Tell me about a time when you helped someone.',
        'How did you feel?',
        'How can we encourage people to help others?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 03',
    description:
      'Aptis Speaking full set 03 - school, transport, places to live and choices.',
    parts: [
      part1(
        'Tell me about your first school.',
        'Describe the room you are in.',
        'What do you do in your free time?',
      ),
      p2('image9.jpeg', [
        'Describe the picture.',
        'What do you usually do after work or school?',
        'Do you use public transport to get around? Tell me about it.',
      ]),
      p3(
        ['image10.jpeg', 'image11.jpeg'],
        [
          'Compare the two pictures.',
          'Would you prefer to live in a city or in the suburbs? Why?',
          'What are the advantages of living in each place?',
        ],
      ),
      p4('image12.jpeg', 'Talk about making choices.', [
        'Tell me about a time when you faced an important choice.',
        'How did you feel?',
        'What should people prepare before making an important choice?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 04',
    description:
      'Aptis Speaking full set 04 - newspapers, preserving memories and generations.',
    parts: [
      part1(
        'What is your favourite season?',
        'What is a typical meal in your country?',
        'Describe the clothes you are wearing today.',
      ),
      p2('image13.jpeg', [
        'Describe the picture.',
        'Do you often read newspapers? When do you read them?',
        'Do you prefer reading news on paper or on an electronic device? Why?',
      ]),
      p3(
        ['image14.jpeg', 'image15.jpeg'],
        [
          'Compare the two pictures.',
          'Do you prefer taking photos or writing to preserve memories?',
          'Some people prefer writing to taking pictures when saving memories. What do you think?',
        ],
      ),
      p4('image16.jpeg', 'Talk about communication between generations.', [
        'Tell me about a time when you talked to someone much older or younger than you.',
        'How did you feel when you talked to them?',
        'What can people learn from talking to another generation?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 05',
    description:
      'Aptis Speaking full set 05 - friendship, food and the natural world.',
    parts: [
      part1(
        'What is the best way to travel around your country?',
        'What do you like to do with your friends?',
        'Describe a recent journey you made.',
      ),
      p2('image17.png', [
        'Describe the picture.',
        'Tell me about a time when you spent time with a friend.',
        'Why do some people have more friends than others?',
      ]),
      p3(
        ['image18.png', 'image19.png'],
        [
          'Tell me what you see in the two pictures.',
          'What are the attractions of each kind of food?',
          'Why is it important to know what you eat?',
        ],
      ),
      p4('image20.jpeg', 'Talk about nature.', [
        'Tell me about a time when you were surrounded by nature.',
        'How did you feel?',
        'What should people do to protect nature?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 06',
    description:
      'Aptis Speaking full set 06 - home decoration, eating together and receiving support.',
    parts: [
      part1(
        'What is your favourite food?',
        'Describe the meals people usually eat in your country.',
        'Tell me about your family.',
      ),
      p2('image21.png', [
        'Describe the picture.',
        'When was the last time you decorated your room?',
        'Why do people like to change the appearance of their homes?',
      ]),
      p3(
        ['image22.png', 'image23.png'],
        [
          'Compare the two pictures.',
          'What are the benefits of eating in each place?',
          'Some people say eating together is better than eating alone. What do you think?',
        ],
      ),
      p4('image25.jpeg', 'Talk about receiving support from other people.', [
        'Tell me about a time when you were supported by others.',
        'How did you feel?',
        'What are some ways to motivate people to cooperate?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 07',
    description:
      'Aptis Speaking full set 07 - places, sea travel, exercise and being in a hurry.',
    parts: [
      part1(
        'Tell me about a famous place in your country.',
        'Tell me about the last thing you watched on television.',
        'What is your favourite kind of music?',
      ),
      p2('image52.png', [
        'Describe the picture.',
        'Tell me about the last time you saw the sea.',
        'Why do some people dislike travelling by sea?',
      ]),
      p3(
        ['image53.png', 'image54.png'],
        [
          'Compare the two pictures.',
          'Which activity would you prefer, and why?',
          'Why is exercise important?',
        ],
      ),
      p4('image59.jpeg', 'Talk about being in a hurry.', [
        'Tell me about a time when you were in a hurry.',
        'How did you feel?',
        'Modern life makes people busier and more rushed. What do you think?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 08',
    description:
      'Aptis Speaking full set 08 - new places, public speaking, sport and busy lives.',
    parts: [
      part1(
        'Tell me about a new place you have visited.',
        'What kind of sport do you enjoy?',
        'Who do you usually travel with?',
      ),
      p2('image49.jpeg', [
        'Describe the picture.',
        'Tell me about the last time you spoke in public.',
        'Why do some people feel worried about public speaking?',
      ]),
      p3(
        ['image43.jpeg', 'image44.jpeg'],
        [
          'Compare the two pictures.',
          'Why do some people prefer team sports to individual sports?',
          'Which of these sports would you prefer to try, and why?',
        ],
      ),
      p4('image45.jpeg', 'Talk about being busy.', [
        'Tell me about a time when you were very busy.',
        'How do you feel when you are very busy?',
        'If people worked less, do you think their lives would be better?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 09',
    description:
      'Aptis Speaking full set 09 - handwriting, ways of working and expensive things.',
    parts: [
      part1(
        'Describe your hometown.',
        'What is the most convenient way to travel around your area?',
        'What is the weather like today?',
      ),
      p2('image26.png', [
        'Describe the picture.',
        'Tell me about a time when you wrote a handwritten letter.',
        'Do you think handwritten letters will be replaced in the future?',
      ]),
      p3(
        ['image27.png', 'image28.png'],
        [
          'Tell me what you see in the two pictures.',
          'What are the differences between the two places of work?',
          'Which way of working would you prefer, and why?',
        ],
      ),
      p4('image29.jpeg', 'Talk about expensive things.', [
        'Tell me about a time when you bought something expensive.',
        'How did you feel?',
        'Should people buy expensive things? Why or why not?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 10',
    description: 'Aptis Speaking full set 10 - films, places to eat and gifts.',
    parts: [
      part1(
        'How do you usually spend time with your family?',
        'What do you like to do at weekends?',
        'Describe a place in your hometown that you like.',
      ),
      p2('image30.jpeg', [
        'Describe the picture.',
        'What programme did you watch yesterday evening?',
        'What is your favourite film?',
      ]),
      p3(
        ['image31.png', 'image32.png'],
        [
          'Tell me what you see in the two pictures.',
          'Where would you prefer to eat, and why?',
          'Why do some people like to eat alone?',
        ],
      ),
      p4('image33.jpeg', 'Talk about gifts.', [
        'Tell me about a time when you received a gift.',
        'How did you feel about the gift?',
        'Do you prefer handmade gifts or gifts bought in a shop?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 11',
    description:
      'Aptis Speaking full set 11 - car journeys, holiday destinations and books.',
    parts: [
      part1(
        'Tell me about a typical meal in your country.',
        'What do people in your country like to read?',
        'What kind of weather do you prefer?',
      ),
      p2('image34.jpeg', [
        'Describe the picture.',
        'Tell me about the last time you travelled in a car.',
        'How can people pass the time on a long drive?',
      ]),
      p3(
        ['image47.jpeg', 'image48.jpeg'],
        [
          'Describe the two pictures.',
          'Which place would you prefer to visit, and why?',
          'Do you prefer spending holidays with your family or with your friends?',
        ],
      ),
      p4('image35.jpeg', 'Talk about reading a good book.', [
        'Tell me about a time when you read a good book.',
        'How did you feel?',
        'Many people prefer watching television to reading books. What do you think?',
      ]),
    ],
  },
  {
    title: 'Speaking Test 12',
    description:
      'Aptis Speaking full set 12 - shopping, transport and difficult tasks.',
    parts: [
      part1(
        'Do you prefer reading newspapers or watching the news?',
        'Do you prefer printed books or e-books?',
        'How has technology changed the way you read?',
      ),
      p2('image39.png', [
        'Describe the picture.',
        'Tell me about the last time you went shopping.',
        'Why do some people dislike busy places?',
      ]),
      p3(
        ['image40.png', 'image41.png'],
        [
          'Tell me what you see in the two pictures.',
          'What are the advantages of travelling by car and by train?',
          'Why do some people like travelling by train?',
        ],
      ),
      p4('image42.jpeg', 'Talk about doing a difficult or unwanted task.', [
        'Tell me about a time when you had to do something you did not want to do.',
        'How did you feel about it?',
        'What can help people face difficult tasks in daily life?',
      ]),
    ],
  },
];
