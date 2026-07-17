import { QuestionType } from '@prisma/client';

export interface ReadingSeedQuestion {
  partNumber: number;
  questionType: QuestionType;
  content: string;
  extraConfig: Record<string, unknown>;
}

export interface ReadingSeedSet {
  title: string;
  description: string;
  questions: ReadingSeedQuestion[];
}

interface GapInput {
  options: string[];
  correctIndex: number;
}

interface OpinionQuestionInput {
  statement: string;
  correctPerson: 'A' | 'B' | 'C' | 'D';
}

interface HeadingParagraphInput {
  text: string;
  heading: string;
}

function gapFill(content: string, gaps: GapInput[]): ReadingSeedQuestion {
  return {
    partNumber: 1,
    questionType: QuestionType.MC,
    content,
    extraConfig: {
      gaps: gaps.map((gap, index) => ({
        gap_id: index + 1,
        options: gap.options,
        correct_index: gap.correctIndex,
      })),
    },
  };
}

function ordering(
  partNumber: 2 | 3,
  content: string,
  optionsPool: string[],
  correctOrder: number[],
): ReadingSeedQuestion {
  return {
    partNumber,
    questionType: QuestionType.ORDERING,
    content,
    extraConfig: {
      fixed_first: true,
      options_pool: optionsPool,
      correct_order: correctOrder,
    },
  };
}

function opinionMatch(
  content: string,
  people: { key: 'A' | 'B' | 'C' | 'D'; passage: string }[],
  questions: OpinionQuestionInput[],
): ReadingSeedQuestion {
  return {
    partNumber: 4,
    questionType: QuestionType.SPEAKER_MATCH,
    content,
    extraConfig: {
      people,
      questions: questions.map((question) => ({
        statement: question.statement,
        correct_person: question.correctPerson,
      })),
    },
  };
}

function headingMatch(
  content: string,
  example: { text: string; heading: string },
  paragraphs: HeadingParagraphInput[],
  distractor: string,
): ReadingSeedQuestion {
  const headings = paragraphs.map((paragraph) => paragraph.heading);
  return {
    partNumber: 5,
    questionType: QuestionType.HEADING_MATCH,
    content,
    extraConfig: {
      example: {
        paragraph_label: '0',
        paragraph_text: example.text,
        correct_heading: example.heading,
      },
      paragraphs: paragraphs.map((paragraph, index) => ({
        label: String(index + 1),
        text: paragraph.text,
      })),
      headings_pool: [...headings, distractor],
      answers: paragraphs.map((paragraph, index) => ({
        paragraph_label: String(index + 1),
        correct_heading: paragraph.heading,
      })),
    },
  };
}

export const READING_SEED_SETS: ReadingSeedSet[] = [
  {
    title: 'Reading Test 0 - Mountain Summits',
    description:
      'Bộ đề Reading được bóc tách từ TEST 0 - READING - MOUNTAIN SUMMITS.docx.',
    questions: [
      gapFill(
        'Take the bus to the main ___(1). The bus ___(2) are near my house. My house is ___(3) and you can easily recognize it by the color. I cook eggs for a quick ___(4). After dinner, we will watch ___(5) on TV.',
        [
          { options: ['station', 'run', 'walk'], correctIndex: 0 },
          { options: ['color', 'stops', 'driver'], correctIndex: 1 },
          { options: ['tall', 'fat', 'green'], correctIndex: 2 },
          { options: ['dinner', 'homework', 'sore'], correctIndex: 0 },
          { options: ['sing', 'movies', 'news'], correctIndex: 1 },
        ],
      ),
      ordering(
        2,
        'Films: Arrange the sentences into a complete paragraph.',
        [
          'The first film was shown in 1895 in Paris, France.',
          'Now things have changed, actors and filmmakers can earn millions of dollars from film production.',
          'Not only did these technological limitations exist, the movies were also low budget.',
          "That's because the movies were only in black and white, and sometimes without sound.",
          'Due to the lack of money, actors also had few opportunities to earn money through acting.',
          "Old movies were very different from today's movies.",
        ],
        [0, 5, 3, 2, 4, 1],
      ),
      ordering(
        3,
        'Weekend activities: Arrange the sentences into a complete paragraph.',
        [
          'The weather was great last week, there was family sports in town.',
          'There were 60 participants, in which Ms. Kamur kept the fastest speed and won.',
          'It was held on Saturday morning, there was a 10 mile race for adults.',
          "After she received the prize, the following time was for children's activities.",
          'After playing, the children were very hungry and ate with their parents.',
          'Activities included football, swimming, skipping rope, and the children played together very happily.',
        ],
        [0, 2, 1, 3, 5, 4],
      ),
      opinionMatch(
        'Childhood: Read the four opinions and match each statement to the correct person.',
        [
          {
            key: 'A',
            passage:
              'In the past, I really liked playing board games. Now, to limit the children from using computers, I often spend time playing with them, but I have struggled with the games. Games nowadays have more characters and rules, making us think a lot every time we play, but my children and I still like them and have a good time and laugh together.',
          },
          {
            key: 'B',
            passage:
              'When I was a child, I often played soccer with other children of the same age. We often played football in the school yard and sometimes in the open spaces of the neighborhood. We divided into small teams and chased the ball until we were all tired.',
          },
          {
            key: 'C',
            passage:
              "When I was a child, I didn't like going out to play, so I chose reading books as a form of entertainment. The stories described in the pages of books helped me discover my own world. Later, when I grew up, I liked playing modern games with eye-catching interfaces, which helped me relax and increase my creativity.",
          },
          {
            key: 'D',
            passage:
              'When I was a child, I really liked playing outdoor activities. I remember on bad weather days, I was always by the window, glued to it and looking outside, praying for the rain to stop. At those times, my mother often gave me paper and a box of crayons. I really liked drawing and often drew at home when the weather was not good.',
          },
        ],
        [
          { statement: 'Who likes to play with children?', correctPerson: 'A' },
          {
            statement: 'Who liked to play with friends of the same age?',
            correctPerson: 'B',
          },
          {
            statement: 'Who looked forward to going out to play?',
            correctPerson: 'D',
          },
          {
            statement: 'Who liked art when they were a child?',
            correctPerson: 'D',
          },
          {
            statement: 'Who likes modern games after growing up?',
            correctPerson: 'C',
          },
          {
            statement: 'Who finds games nowadays much more difficult?',
            correctPerson: 'A',
          },
          {
            statement: 'Who liked reading books when they were a child?',
            correctPerson: 'C',
          },
        ],
      ),
      headingMatch(
        'Mountain Summits: Match the headings to paragraphs 1-7. Paragraph 0 is an example. There is one heading you will not use.',
        {
          text: 'Mountains have inspired explorers, writers and communities for centuries, becoming powerful symbols in cultures around the world.',
          heading: 'Mountains as enduring symbols',
        },
        [
          {
            heading: 'Changing the perspective towards mountain',
            text: 'The term "mountain" has evolved over time, reflecting not only physical characteristics but also cultural significance. Before the 19th century, people were quite shy when it came to conquering mountains. Today, with the development of technology, reaching the highest peaks has become easier. In contemporary discussions, mountains may symbolize challenges to overcome or destinations for adventure, transcending their geographical attributes.',
          },
          {
            heading: 'Unique sense of achievement',
            text: "Climbing a mountain often leads to a profound sense of accomplishment. It represents not just reaching a physical summit but also conquering personal fears and pushing one's limits, creating memories that last a lifetime. Besides, mountain climbing also creates adrenaline, a hormone that creates a feeling of excitement like when playing other adventure sports.",
          },
          {
            heading: 'Publicising one’s achievements',
            text: "In today's digital age, sharing achievements has become prevalent. Even before social media, documenting climbs seemed like a given. Climbing a mountain is frequently documented on social media, turning personal milestones into public spectacles that inspire others while also raising questions about authenticity.",
          },
          {
            heading: 'The wrong priority',
            text: 'In recent years, some climbers have become more focused on taking photos for social media than respecting the mountains they visit. Long lines form near popular summits as people wait for the perfect picture, often ignoring weather warnings or safety advice. In some cases, this obsession with online fame has led to serious accidents. It shows how personal image is sometimes valued more than safety or responsibility.',
          },
          {
            heading: 'A disturbing revelation',
            text: 'Mount Everest, once a symbol of human courage, has now become a worrying example of how adventure can harm nature. Every climbing season, long lines of climbers crowd the narrow paths to the summit, leaving behind waste and pollution on the fragile slopes. What used to be a personal challenge has turned into a commercial race, where success is measured by photos and fame rather than respect for the mountain. This situation is disturbing because it shows how our desire to conquer the world’s highest peak has created serious environmental and moral concerns.',
          },
          {
            heading: 'A focus on sustainability',
            text: 'As the number of climbers on Mount Everest continues to rise, the need to focus on sustainability has become urgent. Local authorities and environmental groups are now introducing stricter waste management rules, encouraging climbers to bring back what they carry, and limiting the number of expeditions each season. Some teams have even started “clean-up climbs” to remove rubbish left behind on the slopes. These efforts remind us that protecting the mountain is just as important as reaching its peak. True success on Everest should mean leaving the mountain cleaner and safer for future generations.',
          },
          {
            heading: 'A more intimate relationship',
            text: 'Shared experiences in challenging environments, like mountains, can deepen intimacy in relationships. Couples or friends who navigate the challenges of climbing together often find their bonds strengthened through mutual support and understanding.',
          },
        ],
        'The commercial value of mountain tourism',
      ),
    ],
  },
  {
    title: 'Reading Test 1 - Early Australia',
    description:
      'Bộ đề Reading được bóc tách từ TEST 1 - READING - EARLY AUSTRALIA.docx.',
    questions: [
      gapFill(
        'I saw some shoes in the ___(1) of one store. I did not ___(2) them. I bought some food at the ___(3). I ate ___(4). I ___(5) a program on TV.',
        [
          { options: ['market', 'window', 'shoe'], correctIndex: 1 },
          { options: ['eat', 'drink', 'buy'], correctIndex: 2 },
          { options: ['classroom', 'park', 'market'], correctIndex: 2 },
          { options: ['watch', 'door', 'cake'], correctIndex: 2 },
          { options: ['ate', 'saw', 'watched'], correctIndex: 2 },
        ],
      ),
      ordering(
        2,
        'Homework next week: Arrange the sentences into a complete paragraph.',
        [
          'Our homework next week will be about places in town.',
          'This comparison will help you find common points between countries.',
          'You may not find all the above information but you will find places with similarities.',
          'Before writing, we need to find out some information about the place.',
          'That information can revolve around the aspects: people, culture and history.',
          'When collecting information about the above three aspects, you can compare with places in your country.',
        ],
        [0, 3, 4, 2, 5, 1],
      ),
      ordering(
        3,
        'Travel: Arrange the sentences into a complete paragraph.',
        [
          'In the early 1800s, traveling was quite difficult.',
          'Thanks to the invention of cars and trains, it became easier for people to travel.',
          'At that time, only the very wealthy could afford to travel.',
          'Thanks to the great development of means of transport, today people can travel to other parts of the world.',
          'Because flying is very fast, people can travel by this means to different locations for business or travel.',
          'Not only the above two means of transport, people later had the opportunity to travel by aeroplanes.',
        ],
        [0, 2, 1, 5, 4, 3],
      ),
      opinionMatch(
        'Extreme sports: Read the four opinions and match each statement to the correct person.',
        [
          {
            key: 'A',
            passage:
              'Before trying any extreme sport, I believe it is absolutely essential to train properly. These kinds of activities are exciting, but they can also be dangerous if you do not know what you are doing. I have seen people get hurt because they did not prepare well. That is why I always make sure to take a training course and understand the safety rules before I try anything new. With the right preparation, I think extreme sports can be a great experience.',
          },
          {
            key: 'B',
            passage:
              'I have always been more into traditional sports like swimming, running, or playing tennis. They are fun and easy to do regularly. But a few months ago, I went bungee jumping during a holiday, and it was an incredible experience. I did not expect to enjoy it so much. I still prefer regular sports for everyday fitness, but now I am definitely more open to trying extreme sports once in a while for the adventure.',
          },
          {
            key: 'C',
            passage:
              'What I love most about extreme sports is how they let me enjoy nature in a different way. Activities like rock climbing or mountain biking allow me to explore amazing places while challenging myself physically and mentally. It is a way to disconnect from daily life and feel completely alive. If I had more time and money, I would love to do these kinds of sports more often, especially in wild, remote areas.',
          },
          {
            key: 'D',
            passage:
              'I know some people find extreme sports exciting, but for me, they have never been important. I actually avoid them as much as possible. I do not like the idea of putting myself in danger just for fun. There are plenty of safer ways to stay active and enjoy life. I would rather go for a walk or do yoga than jump out of a plane or climb a mountain. It is just not my thing.',
          },
        ],
        [
          {
            statement: 'Who still likes extreme sports after trying one?',
            correctPerson: 'B',
          },
          { statement: 'Who enjoys nature?', correctPerson: 'C' },
          {
            statement: 'Who finds extreme sports unimportant?',
            correctPerson: 'D',
          },
          {
            statement: 'Who thinks training before participating is important?',
            correctPerson: 'A',
          },
          {
            statement: 'Who wants to do more extreme sports?',
            correctPerson: 'C',
          },
          {
            statement: 'Who likes traditional sports such as swimming?',
            correctPerson: 'B',
          },
          {
            statement: 'Who always avoids doing extreme sports?',
            correctPerson: 'D',
          },
        ],
      ),
      headingMatch(
        'Early Australia: Match the headings to paragraphs 1-7. Paragraph 0 is an example. There is one heading you will not use.',
        {
          text: 'Australia’s early human history continues to be revised as archaeology and modern science reveal new details about migration.',
          heading: 'Reconstructing Australia’s distant past',
        },
        [
          {
            heading: 'An alternative history of settlement',
            text: 'Scientists have found evidence that humans have lived in Australia for about 65,000 years. This is different from the previous thinking that the first people only arrived in Australia a few tens of thousands of years ago. The results from the analysis of archaeological relics have given rise to many different opinions about the origin of the first people in Australia. This discovery shows that the Australian aborigines have been present and lived here for a long time.',
          },
          {
            heading: 'Natural barrier to resettlement',
            text: 'Humans coming to Australia did not happen only once. In addition to the first group of people, scientists have also discovered traces of two other groups that also came here. This shows that many groups of people came to Australia in the past. However, in ancient times, it was very difficult to get to Australia because they had to cross a large ocean without modern technology like today.',
          },
          {
            heading: 'Technology helps uncover the ocean’s secret',
            text: 'Thanks to modern machinery, scientists have discovered a chain of small islands that form a route to Australia. Technology such as remote sensing and electronic maps helps them identify the islands and the movements of ancient people. Thanks to that, they have a better understanding of the path that their ancestors may have taken to reach Australia.',
          },
          {
            heading: 'A Journey made by stages',
            text: 'Ancient people may have reached Australia by passing through many small islands. Each island was a place where they stopped to rest and find food, then continued their journey. This way of moving shows that they knew how to adapt to difficult conditions to be able to live in Australia.',
          },
          {
            heading: 'A new evidence that leads to speculation',
            text: 'Currently, researchers cannot know for sure how many people participated in the journey to Australia. It could have been only a few dozen people, or it could have been up to thousands. Due to the lack of clear evidence, it is difficult to determine the exact number. However, future research may help find the answer.',
          },
          {
            heading: 'Lack of knowledge and skills',
            text: 'Some people think that ancient people were not smart enough or skilled enough to cross the sea to Australia. They think that without modern tools, ancient people could not navigate or cross the ocean. But history has proven that humans have always been smart and can overcome many difficulties.',
          },
          {
            heading: 'Determination of the explorers through the ages',
            text: 'From ancient times to the present, humans have always wanted to explore new places. Whether it was going to sea in ancient times or going to space today, we always find ways to overcome the limits. Ancient people may have crossed the sea because they wanted to find a better place to live. Thanks to their courage, we understand more about human history.',
          },
        ],
        'The disappearance of Australia’s first settlers',
      ),
    ],
  },
  {
    title: 'Reading Test 2 - The Arrival of the Four-Day Work Week',
    description:
      'Bộ đề Reading được bóc tách từ TEST 2 - READING - FOUR DAY WORK WEEK.docx.',
    questions: [
      gapFill(
        'I get up early in the ___(1) and I go running. My ___(2) come and exercise with me. I ___(3) my car at home and go for a walk. Exercise is ___(4) for my body. I usually drink a lot of water and eat healthy ___(5).',
        [
          { options: ['morning', 'sun', 'market'], correctIndex: 0 },
          { options: ['friends', 'dogs', 'schools'], correctIndex: 0 },
          { options: ['burn', 'leave', 'sell'], correctIndex: 1 },
          { options: ['always', 'dark', 'good'], correctIndex: 2 },
          { options: ['food', 'juice', 'energy'], correctIndex: 0 },
        ],
      ),
      ordering(
        2,
        'Music festivals: Arrange the sentences into a complete paragraph.',
        [
          'Last Saturday, a live music show was held in town park.',
          'Because it was free, more than 5,000 people attended.',
          'The staff were very busy but still closed the shop early to watch the singer.',
          'The local government planned, funded and paid for everything.',
          'The singer performed for two hours, everyone had great fun.',
          'People came early and sat in nearby shops waiting for the start time.',
        ],
        [0, 3, 1, 5, 2, 4],
      ),
      ordering(
        3,
        'End of term project: Arrange the sentences into a complete paragraph.',
        [
          'This semester we have studied several chapters about local history in the class.',
          'After this time, other students will have questions for you and you have to answer them.',
          'It will have relevant pictures, and your own writing on the topic.',
          'This talk will point out the key points, and should last about five minutes in total.',
          'The end of term project will focus on at least two of these chapters.',
          'You will then need to use these pictures and written work to create a presentation for the class.',
        ],
        [0, 4, 2, 5, 3, 1],
      ),
      opinionMatch(
        'Careers: Read the four opinions and match each statement to the correct person.',
        [
          {
            key: 'A',
            passage:
              'When I was a student, I decided to do an unpaid internship at organizations and companies. At first, my friends said it was a waste of time because I did not earn any money. However, I learned a lot of practical skills and gained real working experience. I also built good relationships with my colleagues, which later helped me find a full-time job more easily.',
          },
          {
            key: 'B',
            passage:
              'My dream job is becoming a teacher, and I have never thought about changing to another career. Teaching has always been my goal because I enjoy working with students and helping them learn new things. At the moment, I am studying hard to become a good teacher in the future. While I am still in training, I also work part-time at a school so that I can gain real teaching experience. I really enjoy working while studying because it helps me improve my skills and become more confident in the classroom. Even though it can be challenging sometimes, I believe this experience is very valuable, and I am happy to continue on this career path without changing my job plans.',
          },
          {
            key: 'C',
            passage:
              'When I was a child I worked with a plumber and helped her with fixing things. I love a career in mechanical engineering because I enjoy making and repairing things by hand. However, the training period was much longer than I expected, about two years. Sometimes I felt tired of studying theory for so many years before actually starting work. Still, I believe the skills I learned will be useful in the long run.',
          },
          {
            key: 'D',
            passage:
              'After graduating, it took me a long time to find my first job. Many companies required experience, which made the process quite stressful. Luckily, I finally found a position that suits me well in a gaming company. I now work in a flexible working environment where I can manage my own time and work from home, and this helps me balance my work and personal life better.',
          },
        ],
        [
          {
            statement: 'Who does not want to change to another job?',
            correctPerson: 'B',
          },
          {
            statement: 'Who thinks their training is too long?',
            correctPerson: 'C',
          },
          {
            statement: 'Who enjoys working while training?',
            correctPerson: 'B',
          },
          {
            statement: 'Who enjoys working in a flexible working environment?',
            correctPerson: 'D',
          },
          {
            statement: 'Who thinks it was difficult to get their first job?',
            correctPerson: 'D',
          },
          {
            statement: 'Who thinks they benefited from working for free?',
            correctPerson: 'A',
          },
          {
            statement: 'Who likes doing things with their hands?',
            correctPerson: 'C',
          },
        ],
      ),
      headingMatch(
        'The Arrival of the Four-Day Work Week: Match the headings to paragraphs 1-7. Paragraph 0 is an example. There is one heading you will not use.',
        {
          text: 'Experiments with shorter working weeks have encouraged employers and workers to reconsider how working time should be organised.',
          heading: 'Rethinking the traditional working week',
        },
        [
          {
            heading: 'A way of life now out of date',
            text: 'For many decades, working five or even six days a week was seen as the norm. About 100 years ago, Henry Ford, founder of Ford Motor Company, proposed giving workers Saturday and Sunday off with full pay. However, with modern technology, changing values, and a greater focus on work-life balance, that lifestyle is becoming less relevant. Employees and companies alike are beginning to question whether spending most of one’s week at work is still necessary or productive.',
          },
          {
            heading: 'Benefits for employees',
            text: 'Supporters of the four-day workweek argue that this model brings many obvious benefits to employees. They feel more satisfied with their jobs, more relaxed and more motivated to contribute. Having an extra day off helps them balance work and personal life, giving them the opportunity to care for their family, relax or pursue personal interests. This not only improves mental health but also contributes to increased productivity when they return to work.',
          },
          {
            heading: 'Undesirable financial consequences',
            text: 'Despite its positive potential, the adoption of a four-day workweek also comes with its fair share of concerns, particularly financial ones. In Japan in 1988, when several technology firms experimented with shorter work schedules, they reported a slight drop in productivity during the initial months and a noticeable rise in operational expenses. Businesses in the service or retail sectors may struggle to maintain continuous operations with reduced staffing. To compensate, they may have to hire more people, leading to increased costs in salaries, training and management. For smaller companies, this can easily become a major challenge in terms of budgets and ability to maintain operations.',
          },
          {
            heading: 'Unforeseen challenges for employees',
            text: 'A shortened workweek does not always bring a sense of relief. In fact, many employees worry that the workload will be compressed, making the four-day workday more stressful than usual. The compressed schedule can increase psychological and physical pressure, causing work efficiency to decline rather than improve. Concerns that compressing work into shorter hours may be counterproductive to the original goal.',
          },
          {
            heading: 'Difficult to change old habits',
            text: 'One of the biggest barriers to changing working patterns is the stability of long-standing habits. The five-day workday structure affects not only office workers but is also closely linked to the education system, public services and many other social activities. From schools and government agencies to shopping or entertainment centers, all are operating on this time frame. Adjusting the entire system like this will not be easy and is likely to face opposition from many sides. In France in 2000, when the government introduced a nationwide reduction of working hours, numerous companies discovered that employees continued to follow their old patterns, such as staying late or taking work home.',
          },
          {
            heading: 'Unfair for employees',
            text: 'Another issue raised is fairness between labor groups. While office workers may benefit from the new work schedule, professions that require physical presence such as police, fire or emergency services have few options. They cannot simply reduce the working day without ensuring continuity in work. This is also true for teachers, as the number of students and teaching hours does not decrease. This could widen the gap between occupational classes and create divisions in society.',
          },
          {
            heading: 'Alternative solutions worth considering',
            text: 'Given the potential difficulties, some experts suggest more flexible approaches instead of shortening the work week. Models such as remote working, job sharing or flexible working hours are considered more suitable in some cases. These solutions give employees more control over their time without putting pressure on businesses to change the entire operating structure. Thereby, the goal of work-life balance can still be achieved without creating many barriers.',
          },
        ],
        'A universal rise in company profits',
      ),
    ],
  },
  {
    title: 'Reading Test 3 - Frozen Land',
    description:
      'Bộ đề Reading được bóc tách từ TEST 3 - READING - FROZEN LAND.docx.',
    questions: [
      gapFill(
        'Hi Patty, just to let you know our family are having a vacation. Yesterday we went to a ___(1) village. We ___(2) in a small house in the village. There is a beautiful ___(3) in the house. There are a lot of green ___(4) in the garden. Today, we plan to visit ___(5) buildings in the village. We want to discover their history. Love, Amina.',
        [
          { options: ['small', 'smart', 'harmful'], correctIndex: 0 },
          { options: ['fly', 'stay', 'swim'], correctIndex: 1 },
          { options: ['mountain', 'garden', 'ocean'], correctIndex: 1 },
          { options: ['animals', 'rivers', 'trees'], correctIndex: 2 },
          { options: ['old', 'tall', 'furious'], correctIndex: 0 },
        ],
      ),
      ordering(
        2,
        'College Welcome Day: Arrange the sentences into a complete paragraph.',
        [
          'College Welcome Day will help new students get to know the college.',
          'At the end of the talk, you will meet the head of department and teachers.',
          'It starts at 10am, there is a small presentation in the main hall.',
          'This meal is on the second floor of the building.',
          'These staff members give you a guided tour of the building.',
          'You have to stay with other students until lunch break.',
        ],
        [0, 2, 1, 4, 5, 3],
      ),
      ordering(
        3,
        'African American woman in space: Arrange the sentences into a complete paragraph.',
        [
          'Mae Jemison’s father is a skilled worker, her mother is a teacher.',
          'Some of those include growing plants and animals in a spaceship.',
          'This was about science, she was later a member of the research team.',
          'With the support of her parents, she went to university and studied science.',
          'Being a part of this group, she traveled to space frequently, and conducted many experiments in space.',
          'Her degree in the subject enabled her to take a training course in the USA.',
        ],
        [0, 3, 5, 2, 4, 1],
      ),
      opinionMatch(
        'Volunteering: Read the four opinions and match each statement to the correct person.',
        [
          {
            key: 'A',
            passage:
              'Some people enjoy volunteering abroad, but honestly, I feel most people are more interested in travelling. I believe we should use our time more meaningfully. Each town has many people in need. Their situations are difficult, and they do not have the means to improve their quality of life. They are individuals who have contributed a lot to the country. Sharing stories with them helps us understand the differences between generations. We can also broaden our knowledge about local history, traditions, and culture through their experiences.',
          },
          {
            key: 'B',
            passage:
              'My mother told me to do local volunteering because she is part of that organisation, but I am not into it. I prefer volunteering abroad because I can develop soft skills, something that will benefit my future career. Also, meeting new people helps me expand my network and create valuable connections I can use later in my professional life.',
          },
          {
            key: 'C',
            passage:
              'I am too busy and rarely have any free time to do anything, so spending even a few hours volunteering is difficult. I would have to take half a day off work. I see many people in need and they genuinely require some extra financial support. That is something I can help with because I earn a good salary. Making monthly donations is not a problem for me; it is how I show my support and contribution.',
          },
          {
            key: 'D',
            passage:
              'I believe there are many ways we can show kindness through volunteering. I am retired now, and I currently help build houses for people in need. I work with a volunteering organisation that already has clear plans in place. Through this work, I have had the chance to experience different foreign cultures. We are often sent to various countries to carry out these projects, so it is also a great way to travel while doing something meaningful. The job involves manual labour, so we are able to improve our physical health.',
          },
        ],
        [
          {
            statement: 'Who wants to enhance their future career?',
            correctPerson: 'B',
          },
          {
            statement: 'Who supports charity work with money?',
            correctPerson: 'C',
          },
          {
            statement:
              'Who thinks volunteering should help the local community?',
            correctPerson: 'A',
          },
          {
            statement: 'Who thinks volunteering helps improve physical health?',
            correctPerson: 'D',
          },
          {
            statement:
              'Who thinks volunteering can improve knowledge about culture?',
            correctPerson: 'A',
          },
          {
            statement: 'Who thinks volunteering is a way to travel?',
            correctPerson: 'D',
          },
          { statement: 'Who wants to make new friends?', correctPerson: 'B' },
        ],
      ),
      headingMatch(
        'Frozen Land: Match the headings to paragraphs 1-7. Paragraph 0 is an example. There is one heading you will not use.',
        {
          text: 'Antarctica remains a place of international scientific interest because its extreme environment preserves unique evidence about the Earth.',
          heading: 'A continent devoted to discovery',
        },
        [
          {
            heading: 'Who is in charge?',
            text: 'Although Antarctica is not claimed as a country, several nations have laid territorial claims over parts of the continent. However, under the Antarctic Treaty System signed in 1959, no single country has full ownership. Instead, the region is governed collectively by over 50 countries that have agreed to preserve it for peaceful and scientific purposes. No military activity is allowed, and scientific cooperation is encouraged. This unique model of international governance helps protect the fragile environment of the frozen land and ensures that its resources are not exploited for commercial gain.',
          },
          {
            heading: 'First step on the ice',
            text: 'The first known landing on Antarctica took place in the early 19th century when a group of seal hunters unintentionally arrived at the icy coastline. Later, exploratory missions were organized specifically to set foot on the continent. In 1895, a Norwegian expedition became the first officially recognized landing. These early steps were dangerous and uncertain, with little knowledge of the terrain or weather. Still, the achievement marked a turning point in human exploration, showing that even the most remote and inhospitable places on Earth could be reached with courage and persistence.',
          },
          {
            heading: 'Where is the end of the Earth?',
            text: 'Antarctica has often been described as the end of the Earth. Located at the southernmost point of the planet, it remains one of the most mysterious and least accessible places for humans. It is surrounded by the Southern Ocean and sits opposite the Arctic in global geography. For centuries, explorers speculated whether such a place existed at all. Today, while satellite images and scientific missions provide more data, the continent still retains an aura of the unknown, attracting adventurers and scientists who want to experience the planet’s final frontier.',
          },
          {
            heading: 'Hidden geography',
            text: 'Despite being covered in thick sheets of ice, Antarctica has a surprisingly diverse and dramatic landscape hidden beneath its surface. Using ground-penetrating radar and satellite imaging, scientists have discovered vast mountain ranges, deep valleys, and even ancient lakes buried under kilometers of ice. These findings suggest that Antarctica was once a very different environment. Studying this hidden geography helps researchers understand the Earth’s geological past, as well as how changes in climate may affect the region’s ice coverage in the future.',
          },
          {
            heading: 'Race to the pole',
            text: 'The early 20th century saw a dramatic competition between nations to reach the South Pole. Most famously, British explorer Robert Falcon Scott and Norwegian Roald Amundsen led rival expeditions. Amundsen reached the Pole first in 1911, using dog sleds and careful planning. Scott arrived weeks later, only to perish on the return journey with his team. The race to the pole was one of the most extreme tests of human endurance and remains one of the most iconic chapters in the history of polar exploration.',
          },
          {
            heading: 'Less effort needed',
            text: 'Travel across Antarctica remains one of the most difficult journeys on Earth. However, modern technology has significantly reduced the physical effort required. In the past, explorers dragged heavy sleds by hand or used animals, often in dangerous and freezing conditions. Today, snowmobiles, tracked vehicles, and even aircraft allow researchers to move equipment and people more easily. While the environment is still harsh, advances in transportation and survival gear make scientific missions more efficient and less life-threatening than those of early explorers.',
          },
          {
            heading: 'Why is it so cold?',
            text: 'Antarctica is the coldest place on Earth, with temperatures regularly dropping below –60°C in winter. The continent’s high altitude, its position near the South Pole, and the fact that sunlight is absent for months all contribute to its extreme chill. Its white ice surface also reflects most of the sun’s heat back into the atmosphere. These unique features make it difficult for heat to accumulate, and as a result, the region remains frozen even in summer. Understanding these conditions helps scientists study global weather patterns and climate change.',
          },
        ],
        'Tourism in a tropical climate',
      ),
    ],
  },
  {
    title: 'Reading Test 4 - Women Mathematicians',
    description:
      'Bộ đề Reading được bóc tách từ TEST 4 - READING - WOMEN MATHEMATICIANS.docx.',
    questions: [
      gapFill(
        'The water is ___(1). The ___(2) is out. I have an ___(3) holiday. After ___(4) so hard, I hope to ___(5) your letter.',
        [
          { options: ['sour', 'clear', 'see'], correctIndex: 1 },
          { options: ['wind', 'dust', 'sun'], correctIndex: 2 },
          { options: ['tired', 'enjoyable', 'good'], correctIndex: 1 },
          { options: ['working', 'sleeping', 'eating'], correctIndex: 0 },
          { options: ['tell', 'read', 'forward'], correctIndex: 1 },
        ],
      ),
      ordering(
        2,
        'A new café: Arrange the sentences into a complete paragraph.',
        [
          'Yesterday I went to a newly opened café named Corner Cafe on High Street.',
          'Although it was busy, the staff still arranged a table for me.',
          'I looked at all of those and chose the most expensive sandwich.',
          'When I was there it was very crowded and the staff were very busy on the first day.',
          'It tasted quite good with cheese toppings and I will definitely go back to this place.',
          'They gave me the menu and when I looked at it I felt disappointed because I saw quite a few dishes.',
        ],
        [0, 3, 1, 5, 2, 4],
      ),
      ordering(
        3,
        'Famous singer: Arrange the sentences into a complete paragraph.',
        [
          'Jaden Nobelton is only 18 years old and he is a famous singer.',
          'Many people follow him on social media and he becomes a famous singer.',
          'Before becoming famous at his age, he studied art and music in high school.',
          'During his studies, he studied creativity and singing on stage.',
          'In these performances, he often wears bright clothes and paints his face.',
          'The uniqueness in his way of dressing and his songs makes him attract attention.',
        ],
        [0, 2, 3, 4, 5, 1],
      ),
      opinionMatch(
        'Music Festival: Read the four opinions and match each statement to the correct person.',
        [
          {
            key: 'A',
            passage:
              'This was my first time attending the Music Festival, and to be honest, the weather really did not cooperate. It rained heavily on the first two days, which made it difficult to enjoy the outdoor activities. I still got wet in the tent. But I did not let that ruin the experience. On the final day, the skies cleared up and the performances were truly amazing, especially the final act in the evening. That last day made it all worthwhile, and I left with some great memories despite the poor weather.',
          },
          {
            key: 'B',
            passage:
              'I have been to this festival a couple of times in the past. The quality was good the last times I came, but this time was completely different. The sound quality was not great, and the whole event just felt disorganised. There were not enough facilities, and the staff did not seem prepared to handle the crowd. I could not even interact with the band. I do not think I will be coming back next year. It is simply not worth the money or the time anymore.',
          },
          {
            key: 'C',
            passage:
              'I really enjoyed the music of this festival and I danced to the music. I felt every second of the festival was worth it. I absolutely loved the energy of the performances, and the music was spot on throughout the weekend. However, I have to say the ticket prices were far too high, especially for students. I paid almost double what I did two years ago, and although I enjoyed the music, I am not sure it offered good value for money. If they do not lower the prices next year, a lot of people might skip it.',
          },
          {
            key: 'D',
            passage:
              'We were playing in a band and we finished our performance in the morning. However, I stayed at the festival to meet up with some old band mates. We talked a lot. However, I did not like the venue. It was too crowded and not well organised. The road to the tent village was also congested. I think they should choose a better location next year.',
          },
        ],
        [
          {
            statement: 'Who was disappointed with the festival?',
            correctPerson: 'B',
          },
          { statement: 'Who did not like the venue?', correctPerson: 'D' },
          {
            statement: 'Who found the ticket prices expensive?',
            correctPerson: 'C',
          },
          { statement: 'Who enjoyed the last day?', correctPerson: 'A' },
          { statement: 'Who liked meeting old friends?', correctPerson: 'D' },
          { statement: 'Who disliked the bad weather?', correctPerson: 'A' },
          {
            statement: 'Who enjoyed the music at the event?',
            correctPerson: 'C',
          },
        ],
      ),
      headingMatch(
        'Women Mathematicians: Match the headings to paragraphs 1-7. Paragraph 0 is an example. There is one heading you will not use.',
        {
          text: 'Women have contributed to mathematical discovery for centuries, even when institutions denied them equal recognition and opportunity.',
          heading: 'An overlooked history of mathematical talent',
        },
        [
          {
            heading: 'Gender obscure achievements',
            text: 'In 2014, Iranian mathematician Maryam Mirzakhani received the prestigious Fields Prize, the highest honor in mathematics, and the first time in its 70 years that a woman had won it. However, many newspapers at the time emphasised that the prize winner was a woman. For centuries, the achievements of women in mathematics were either omitted from historical records or attributed to male colleagues. Many of their contributions were later credited to male scholars. Such erasure has been a recurring theme in the history of women in this field.',
          },
          {
            heading: 'Acknowledging achievement of a pioneer',
            text: 'Maria Agnesi is widely recognised for her important contributions to mathematics. In 1748, she published a major mathematics textbook that was used throughout Europe, becoming the first woman to produce such a comprehensive work in this field. Her book helped explain complex mathematical ideas in a clear and systematic way. Later, in 1750, she was appointed professor of mathematics at a university, making her the first woman to hold this position. These achievements marked a significant moment in the history of mathematics and highlighted her lasting influence on future generations.',
          },
          {
            heading: 'Man unfairly credited',
            text: 'Sophie Germain made remarkable contributions to mathematics, particularly in number theory and elasticity. In 1816, she submitted work on number theory under a male pseudonym because women were not taken seriously in mathematics at that time. Later, in 1821, she won a prize from the Paris Academy of Sciences for her research on elasticity, but her achievements were often published or credited to male colleagues instead of her. Despite these challenges, her work was highly influential, and later generations recognised her contributions, proving that her talent had been overlooked for many years.',
          },
          {
            heading: 'A long career showing exceptional ability',
            text: 'Millicent Fawcett demonstrated remarkable intellectual ability from a young age. At just 19, she delivered a public lecture on Sir Isaac Newton at a time when women rarely spoke in academic settings. Although she did not pursue a professional career in mathematics, her early accomplishments in the subject reflected a sharp analytical mind. Over the decades, Fawcett dedicated herself to advocating for women’s education and suffrage, tirelessly working to open academic and political doors for future generations. Her lifelong commitment to intellectual and social progress stands as a testament to her exceptional capabilities and enduring influence.',
          },
          {
            heading: 'Labels can change perspective on people',
            text: 'When female mathematicians are described as “women geniuses” or “female prodigies,” the gender label, while well-intended, often implies that excellence is rare among women. Such terms, though celebratory, can unintentionally reinforce the idea that women’s success in mathematics is unusual, rather than simply the result of talent and hard work.',
          },
          {
            heading: 'Attempting to create a gender balance',
            text: 'To address the gender imbalance in mathematics, many universities and organizations now run outreach programs, offer scholarships specifically for women, and encourage female mentorship in STEM fields. Some universities are required to arrange places where female mathematicians can work and research. These efforts aim not to give unfair advantage, but to create equal opportunities in a domain where women have historically been underrepresented.',
          },
          {
            heading: 'Uniformity can be a disadvantage',
            text: 'In efforts to level the playing field, some institutions have implemented standardized criteria for admissions or research evaluation. However, such uniform methods can sometimes ignore the diverse paths and challenges faced by individuals, particularly women balancing academic and societal expectations. A one-size-fits-all approach may not always foster true equity.',
          },
        ],
        'Mathematics as a subject without practical value',
      ),
    ],
  },
];
