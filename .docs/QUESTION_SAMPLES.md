# Mẫu tạo câu hỏi — `POST /api/v1/questions`

> Mỗi (kỹ năng, phần) một ví dụ **hợp lệ** (khớp validator trong `src/question-bank/question-config.ts`).
> Copy nguyên phần JSON vào body request.
>
> **Trước khi chạy:** đăng nhập lấy token (đã tắt check role nên tài khoản nào cũng tạo được), và đã `pnpm db:seed` để có 5 skills.
> `question_type` được backend **tự suy** từ `(skillId, partNumber)` — KHÔNG cần gửi.

---

## Kỹ năng 1 — Grammar & Vocabulary

### Part 1 — Grammar (MC, 3 đáp án, 1 đúng)
```json
{
  "skillId": 1,
  "partNumber": 1,
  "content": "She ___ to school every day.",
  "extraConfig": {
    "options": [
      { "content": "go", "is_correct": false },
      { "content": "goes", "is_correct": true },
      { "content": "going", "is_correct": false }
    ]
  }
}
```

### Part 2 — Vocabulary (WORD_BANK)

> Part 2 có **5 Task** → tạo **5 bản ghi riêng**, mỗi bản một `task_variant`.
> Mỗi bản: `options_pool` **10 từ** (thừa 5 gây nhiễu) + `slots` **5 câu**.
> Mỗi `slot` gồm `prompt` (đề của câu) + `correct_answer` (phải nằm trong `options_pool`).
> Khi dựng đề (Phase 4), gán cả 5 bản ghi này vào Part 2.
>
> **`content` = câu lệnh đề bài hiển thị cho học viên** (instruction chuẩn APTIS, xem mẫu dưới — FE sẽ dùng nguyên văn; nếu để trống, FE/mapper tự điền câu lệnh mặc định theo `task_variant`).
> **Riêng Task SENTENCE**: `prompt` phải chứa chỗ trống **`_______`** (7 dấu gạch dưới) để FE render dropdown **inline giữa câu** (VD: `After it rained, the path was all _______ and my trainers got dirty.`). Các task còn lại (DEFINITION/COLLOCATION/SYNONYM/ANTONYM) `prompt` là chữ bên trái, dropdown bên phải.

**Task 1 — DEFINITION (hoàn thành định nghĩa bằng từ trong list):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Complete each definition using a word from the list. Use each word once only. You will not need five of the words.",
  "extraConfig": {
    "task_variant": "DEFINITION",
    "options_pool": ["improve", "select", "earn", "assist", "employ", "reduce", "borrow", "deny", "refuse", "spend"],
    "slots": [
      { "slot_id": "s1", "prompt": "To get better at something is to", "correct_answer": "improve" },
      { "slot_id": "s2", "prompt": "To choose something is to", "correct_answer": "select" },
      { "slot_id": "s3", "prompt": "To get money from work is to", "correct_answer": "earn" },
      { "slot_id": "s4", "prompt": "To help someone is to", "correct_answer": "assist" },
      { "slot_id": "s5", "prompt": "To give someone a job is to", "correct_answer": "employ" }
    ]
  }
}
```

**Task 2 — COLLOCATION (từ bên trái → chọn từ hay đi kèm nhất):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Select a word from the list that is most often used with the word on the left. Use each word once only. You will not need five of the words.",
  "extraConfig": {
    "task_variant": "COLLOCATION",
    "options_pool": ["price", "value", "family", "rafting", "stone", "reaction", "memory", "journey", "moment", "river"],
    "slots": [
      { "slot_id": "s1", "prompt": "reduced", "correct_answer": "price" },
      { "slot_id": "s2", "prompt": "sentimental", "correct_answer": "value" },
      { "slot_id": "s3", "prompt": "immediate", "correct_answer": "family" },
      { "slot_id": "s4", "prompt": "white-water", "correct_answer": "rafting" },
      { "slot_id": "s5", "prompt": "semi-precious", "correct_answer": "stone" }
    ]
  }
}
```

**Task 3 — SENTENCE (điền từ vào câu — `prompt` PHẢI có chỗ trống `_______` để FE render dropdown inline):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Finish each sentence using a word from the list. Use each word once only. You will not need five of the words.",
  "extraConfig": {
    "task_variant": "SENTENCE",
    "options_pool": ["muddy", "brand", "extravagant", "feedback", "rewarding", "confident", "efficient", "punctual", "spacious", "reliable"],
    "slots": [
      { "slot_id": "s1", "prompt": "After it rained, the path was all _______ and my trainers got dirty.", "correct_answer": "muddy" },
      { "slot_id": "s2", "prompt": "It is important to create an eye-catching _______ when starting a business.", "correct_answer": "brand" },
      { "slot_id": "s3", "prompt": "My cousin spent a fortune on her wedding. It was incredibly _______.", "correct_answer": "extravagant" },
      { "slot_id": "s4", "prompt": "Teachers should always give _______ to their students so they know how to improve.", "correct_answer": "feedback" },
      { "slot_id": "s5", "prompt": "Doing voluntary work is really _______ because it makes you feel like you are making a difference.", "correct_answer": "rewarding" }
    ]
  }
}
```

**Task 4 — SYNONYM (từ bên trái → chọn từ đồng nghĩa nhất):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Select a word from the list that has the most similar meaning to the word on the left.",
  "extraConfig": {
    "task_variant": "SYNONYM",
    "options_pool": ["dispute", "exchange", "crumble", "possess", "happen", "run", "motivate", "observe", "use", "hide"],
    "slots": [
      { "slot_id": "s1", "prompt": "argue", "correct_answer": "dispute" },
      { "slot_id": "s2", "prompt": "swap", "correct_answer": "exchange" },
      { "slot_id": "s3", "prompt": "collapse", "correct_answer": "crumble" },
      { "slot_id": "s4", "prompt": "own", "correct_answer": "possess" },
      { "slot_id": "s5", "prompt": "occur", "correct_answer": "happen" }
    ]
  }
}
```

**Task 5 — ANTONYM (từ bên trái → chọn từ trái nghĩa):**
> Lưu ý: đề thi thật đôi khi dùng **2 task SYNONYM** thay vì có ANTONYM (như ảnh mẫu Q26 & Q29). Khi đó cứ tạo 2 bản ghi `task_variant: "SYNONYM"` khác nhau — FE hiển thị theo từng bản ghi nên không bị ảnh hưởng.
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Select a word from the list that has the opposite meaning to the word on the left.",
  "extraConfig": {
    "task_variant": "ANTONYM",
    "options_pool": ["natural", "innocent", "ancient", "expand", "reject", "cheap", "brighten", "increase", "strengthen", "arrive"],
    "slots": [
      { "slot_id": "s1", "prompt": "artificial", "correct_answer": "natural" },
      { "slot_id": "s2", "prompt": "guilty", "correct_answer": "innocent" },
      { "slot_id": "s3", "prompt": "modern", "correct_answer": "ancient" },
      { "slot_id": "s4", "prompt": "accept", "correct_answer": "reject" },
      { "slot_id": "s5", "prompt": "depart", "correct_answer": "arrive" }
    ]
  }
}
```

---

## Kỹ năng 2 — Listening

### Part 1 — Information Recognition (MC, có audio riêng)
```json
{
  "skillId": 2,
  "partNumber": 1,
  "content": "What time does the train leave?",
  "mediaUrl": "https://cdn.example.com/audio/listening-p1-q1.mp3",
  "extraConfig": {
    "options": [
      { "content": "7:15", "is_correct": false },
      { "content": "7:50", "is_correct": true },
      { "content": "8:15", "is_correct": false }
    ]
  }
}
```

### Part 2 — Information Matching (SPEAKER_MATCH, 4 người ghép 6 câu, thừa 2)

> Đáp án là **6 câu văn trực tiếp** (không nhãn A/B/C). 4 người chọn 4 câu, **mỗi câu dùng 1 lần**, thừa 2 câu gây nhiễu. `correct_answer` phải nằm trong `options_pool`.
```json
{
  "skillId": 2,
  "partNumber": 2,
  "content": "Four people are discussing their views on shopping. Complete the sentences. Use each answer only once. You will not need two of the reasons.",
  "mediaUrl": "https://cdn.example.com/audio/listening-p2.mp3",
  "extraConfig": {
    "options_pool": [
      "dislikes online shopping.",
      "thinks before purchasing.",
      "spends a lot of money.",
      "is an impulse buyer.",
      "only shops during certain periods.",
      "prefers to shop alone."
    ],
    "speakers": [
      { "speaker_index": 1, "correct_answer": "prefers to shop alone." },
      { "speaker_index": 2, "correct_answer": "dislikes online shopping." },
      { "speaker_index": 3, "correct_answer": "thinks before purchasing." },
      { "speaker_index": 4, "correct_answer": "spends a lot of money." }
    ]
  }
}
```

### Part 3 — Opinion Matching (MC Man/Woman/Both — GÓI CẢ PART TRONG 1 BẢN GHI)

> 1 hội thoại Man/Woman dùng **chung 1 audio** → toàn bộ các nhận định gói vào **1 bản ghi duy nhất** (không tách mỗi nhận định 1 dòng).
> Audio chung đặt ở `mediaUrl`. `extraConfig.statements` chứa danh sách nhận định, mỗi cái `correct` ∈ `MAN|WOMAN|BOTH`.
> FE: render lần lượt `statements[i].statement`, mỗi câu 3 nút Man/Woman/Both.
```json
{
  "skillId": 2,
  "partNumber": 3,
  "content": "Listen to the conversation. Who expresses each opinion?",
  "mediaUrl": "https://cdn.example.com/audio/listening-p3.mp3",
  "extraConfig": {
    "choice_kind": "SPEAKER_AGREEMENT",
    "statements": [
      { "statement": "The new policy will benefit young workers.", "correct": "BOTH" },
      { "statement": "Remote work reduces team productivity.", "correct": "MAN" },
      { "statement": "The office should stay open on weekends.", "correct": "WOMAN" },
      { "statement": "Training budgets should be increased.", "correct": "BOTH" }
    ]
  }
}
```

### Part 4 — Monologue (MC — MỖI BÀI NGHE = 1 BẢN GHI, gói các câu MC trong 1 dòng)

> P4 có 2 bài nghe (2 audio riêng), mỗi bài 2 câu MC → tạo **2 bản ghi**, mỗi bản = 1 bài nghe.
> `mediaUrl` = audio của bài nghe đó. `extraConfig.questions` gói các câu MC của bài (mỗi câu `question` + `options[3]`, đúng 1 `is_correct`).
> FE: 1 audio + render lần lượt `questions[i].question` kèm 3 lựa chọn.

**Bài nghe 1 (2 câu):**
```json
{
  "skillId": 2,
  "partNumber": 4,
  "content": "Listen to the lecture and answer the questions.",
  "mediaUrl": "https://cdn.example.com/audio/listening-p4-monologue1.mp3",
  "extraConfig": {
    "questions": [
      {
        "question": "What is the main purpose of the lecture?",
        "options": [
          { "content": "To warn about a risk", "is_correct": false },
          { "content": "To explain a discovery", "is_correct": true },
          { "content": "To advertise a product", "is_correct": false }
        ]
      },
      {
        "question": "What does the speaker suggest at the end?",
        "options": [
          { "content": "Further reading", "is_correct": true },
          { "content": "Buying a book", "is_correct": false },
          { "content": "Joining a club", "is_correct": false }
        ]
      }
    ]
  }
}
```

**Bài nghe 2 (2 câu):** tạo bản ghi thứ hai tương tự với `mediaUrl` = audio bài 2 (`.../listening-p4-monologue2.mp3`).

---

## Kỹ năng 3 — Reading

### Part 1 — Sentence Comprehension (MC gap-fill, 5 chỗ trống, mỗi chỗ 3 đáp án)

> **`content` = nguyên đoạn văn/email**, chèn 5 chỗ trống đánh số `___(1)…(5)` inline đúng vị trí.
> `extraConfig.gaps` cung cấp 3 lựa chọn cho từng chỗ; `gap_id` khớp **theo thứ tự** chỗ trống trong đoạn.
> FE (admin): nhập **1 ô đoạn văn (content)** + **5 bộ đáp án** ở bước "Thiết lập câu hỏi" — không nhập 5 câu rời.
```json
{
  "skillId": 3,
  "partNumber": 1,
  "content": "Hi Anna, thanks for your ___(1). I would ___(2) to join the trip. Please let me ___(3) the details. See ___(4) soon. Best ___(5), Tom.",
  "extraConfig": {
    "gaps": [
      { "gap_id": 1, "options": ["message", "messages", "messaging"], "correct_index": 0 },
      { "gap_id": 2, "options": ["like", "liked", "liking"], "correct_index": 0 },
      { "gap_id": 3, "options": ["know", "knew", "known"], "correct_index": 0 },
      { "gap_id": 4, "options": ["you", "your", "yours"], "correct_index": 0 },
      { "gap_id": 5, "options": ["wish", "wishing", "wishes"], "correct_index": 2 }
    ]
  }
}
```

### Part 2 — Text Cohesion (ORDERING, 6 câu, câu đầu cố định)
```json
{
  "skillId": 3,
  "partNumber": 2,
  "content": "Sắp xếp các câu thành đoạn văn hoàn chỉnh.",
  "extraConfig": {
    "fixed_first": true,
    "options_pool": [
      "Maria started her small bakery in 2015.",
      "At first, she only sold bread to neighbours.",
      "Two years later, she opened her first shop.",
      "Then she began offering cakes for parties.",
      "Recently, she launched an online store.",
      "Finally, her brand became known nationwide."
    ],
    "correct_order": [0, 1, 2, 3, 4, 5]
  }
}
```

### Part 3 — Text Cohesion (ORDERING, khó hơn)
```json
{
  "skillId": 3,
  "partNumber": 3,
  "content": "Sắp xếp các câu thành đoạn văn có lập luận.",
  "extraConfig": {
    "fixed_first": true,
    "options_pool": [
      "Renewable energy is growing quickly worldwide.",
      "However, its output depends on the weather.",
      "Therefore, storage technology becomes essential.",
      "Moreover, batteries are getting cheaper each year.",
      "As a result, more homes can store solar power.",
      "Consequently, reliance on fossil fuels is falling."
    ],
    "correct_order": [0, 1, 2, 3, 4, 5]
  }
}
```

### Part 4 — Opinion Matching (SPEAKER_MATCH, 4 người / 7 câu hỏi)

> 4 người (A–D) có đoạn văn. 7 câu hỏi là các đặc điểm; chọn **người** phù hợp.
> `key` = nhãn người hiển thị (Person A–D). **Một người được chọn nhiều lần** (không cần dùng hết/duy nhất). `correct_person` phải là key trong `people`.
```json
{
  "skillId": 3,
  "partNumber": 4,
  "content": "How do you spend your free time? Read the four opinions on a travel forum, then answer the questions.",
  "extraConfig": {
    "people": [
      { "key": "A", "passage": "When I go on vacation, I like tropical beaches and exotic places. On my last holiday to Dubai, I rented a yacht and had a lobster dinner nearly every night. It was so luxurious!" },
      { "key": "B", "passage": "We have gone on a family holiday to Greece every June. Each village has its own culture, and I have been studying Greek to know more about the islanders. It helps when you have your own boat, which my family does." },
      { "key": "C", "passage": "Iceland is on my bucket list. Last summer, trekking in the Rocky Mountains of Canada, I took incredible photos of the breathtaking views. I packed a tent and camped in the wilderness to save money." },
      { "key": "D", "passage": "I am a history major, so I love museums and famous historical sites. I don't care for hot weather; I travel off-season to avoid it. I hate crowds, and I usually get cheaper flights that way." }
    ],
    "questions": [
      { "statement": "spends a lot of money on holiday?", "correct_person": "A" },
      { "statement": "enjoys outdoor activities?", "correct_person": "C" },
      { "statement": "participates in tradition?", "correct_person": "B" },
      { "statement": "enjoys landscapes?", "correct_person": "C" },
      { "statement": "dislikes busy places?", "correct_person": "D" },
      { "statement": "prefers hot destinations?", "correct_person": "A" },
      { "statement": "is learning a new skill?", "correct_person": "B" }
    ]
  }
}
```

### Part 5 — Heading Matching (HEADING_MATCH, có ví dụ câu 0 + 7 đoạn / 8 tiêu đề thừa 1)

> `example` = câu 0 cho sẵn (hiển thị đáp án mẫu). `paragraphs` = 7 đoạn cần trả lời.
> `headings_pool` = 8 tiêu đề (cho 7 đoạn, **thừa 1**). Đáp án là **tiêu đề (text)**, không phải nhãn A/B/C.
> Tiêu đề của ví dụ (`example.correct_heading`) tách riêng, không nằm trong pool.
```json
{
  "skillId": 3,
  "partNumber": 5,
  "content": "The FIFA World Cup. Read the text. Match the headings to the paragraphs. The answer to question 0 is an example. There is one heading you will not use.",
  "extraConfig": {
    "example": {
      "paragraph_label": "0",
      "paragraph_text": "The FIFA World Cup is a highly-anticipated international sporting event that happens every four years. Even citizens who are not the biggest sports fans proudly wear their national colours.",
      "correct_heading": "Overall enthusiasm"
    },
    "paragraphs": [
      { "label": "1", "text": "The inaugural competition was held in Uruguay in 1930. Only thirteen teams participated, most from South America, and Uruguay became the first champion." },
      { "label": "2", "text": "The World Cup looks quite different today, expanding to thirty-two teams. During Russia 2018, the final between France and Croatia drew over a billion viewers." },
      { "label": "3", "text": "The tourney has seen participants from every corner of the globe, hosted in 17 different countries on four continents, with joint hosts in 2002 and 2026." },
      { "label": "4", "text": "Brazil is the current title holder with a grand total of 5 wins, and the only country to have participated in every single tournament." },
      { "label": "5", "text": "Some tournaments have been marred by disputes over refereeing decisions and host-selection scandals that divided fans and officials." },
      { "label": "6", "text": "Hosting the event requires enormous spending on stadiums and infrastructure, and some host nations struggle with the costs afterwards." },
      { "label": "7", "text": "Looking ahead, organisers are considering new formats and more host nations, though the shape of future tournaments remains open to debate." }
    ],
    "headings_pool": [
      "Humble Beginnings",
      "The Tournament in Modern Day",
      "Inclusivity of Nations",
      "Record Holders",
      "Controversial Issues",
      "Economic Strain",
      "The Future of The World Cup",
      "An Uncertain Situation"
    ],
    "answers": [
      { "paragraph_label": "1", "correct_heading": "Humble Beginnings" },
      { "paragraph_label": "2", "correct_heading": "The Tournament in Modern Day" },
      { "paragraph_label": "3", "correct_heading": "Inclusivity of Nations" },
      { "paragraph_label": "4", "correct_heading": "Record Holders" },
      { "paragraph_label": "5", "correct_heading": "Controversial Issues" },
      { "paragraph_label": "6", "correct_heading": "Economic Strain" },
      { "paragraph_label": "7", "correct_heading": "The Future of The World Cup" }
    ]
  }
}
```

---

## Kỹ năng 4 — Writing (MỖI PART = 1 BẢN GHI, gói câu con trong extra_config)

> Khác các kỹ năng khác: mỗi part Writing tạo **1 bản ghi duy nhất**, các câu con nằm trong `extra_config.prompts` (P1/P3) hoặc `extra_config.tasks` (P4). Không tách thành nhiều dòng.
> **`sample_answer`** (TUỲ CHỌN): đáp án/bài mẫu nhập ngay khi tạo câu hỏi — dùng làm chuẩn tham khảo cho AI chấm và có thể hiển thị sau khi học viên nộp. Bị **ẩn** khỏi đề khi học viên đang làm (`/take`).

### Part 1 — Word-level (5 ô điền ngắn 1-5 từ) → 1 bản ghi, `prompts[5]`
```json
{
  "skillId": 4,
  "partNumber": 1,
  "content": "Bạn vừa tham gia câu lạc bộ Du lịch. Điền form thông tin cá nhân.",
  "extraConfig": {
    "word_limit_min": 1,
    "word_limit_max": 5,
    "prompts": [
      { "question": "What is your favourite time of the year?", "sample_answer": "autumn" },
      { "question": "What do you do in your free time?", "sample_answer": "reading books" },
      { "question": "How do you usually travel?", "sample_answer": "by train" },
      { "question": "What is your favourite destination?", "sample_answer": "Da Nang" },
      { "question": "Who do you travel with?", "sample_answer": "my family" }
    ]
  }
}
```

### Part 2 — Short Text (1 đề, 20-30 từ) → 1 bản ghi
```json
{
  "skillId": 4,
  "partNumber": 2,
  "content": "Please write about your interests and why you want to join our Travel Club.",
  "extraConfig": {
    "word_limit_min": 20,
    "word_limit_max": 30,
    "sample_answer": "I love travelling and photography, so I want to join the Travel Club to meet new friends and explore beautiful places together."
  }
}
```

### Part 3 — Chat Room (3 Member A/B/C, 30-40 từ) → 1 bản ghi, `prompts[3]`
```json
{
  "skillId": 4,
  "partNumber": 3,
  "content": "Bạn tham gia group chat của câu lạc bộ Du lịch, trả lời từng thành viên.",
  "extraConfig": {
    "word_limit_min": 30,
    "word_limit_max": 40,
    "prompts": [
      { "speaker_name": "Member A", "question": "Who do you usually travel with?", "sample_answer": "I usually travel with my family. We enjoy road trips to the countryside every summer and always have a great time together." },
      { "speaker_name": "Member B", "question": "I think self-guided tours are more fun than group tours. What do you think?", "sample_answer": "I agree that self-guided tours are more flexible, but group tours are safer and you can easily make new friends along the way." },
      { "speaker_name": "Member C", "question": "If you could travel anywhere tomorrow, where would you go?", "sample_answer": "If I could travel anywhere tomorrow, I would go to Japan to see the cherry blossoms and enjoy the delicious local food." }
    ]
  }
}
```

### Part 4 — Formal & Informal (2 task, cùng 1 Notice) → 1 bản ghi, `tasks[2]`
```json
{
  "skillId": 4,
  "partNumber": 4,
  "content": "Formal & Informal writing dựa trên thông báo của câu lạc bộ.",
  "extraConfig": {
    "context": "NOTICE: Due to budget cuts, the club's annual picnic trip next month has been cancelled.",
    "tasks": [
      {
        "task_label": "Task 1",
        "instruction": "Write an email to your friend (also a club member) to share your feelings and discuss the notice.",
        "register_type": "INFORMAL",
        "word_limit_min": 50,
        "word_limit_max": 75,
        "sample_answer": "Hey Minh! Did you see the notice? I'm gutted the picnic got cancelled — we were so looking forward to it. Maybe we could organise something ourselves instead? Let me know what you think!"
      },
      {
        "task_label": "Task 2",
        "instruction": "Write an email to the club manager expressing your dissatisfaction and proposing a solution.",
        "register_type": "FORMAL",
        "word_limit_min": 120,
        "word_limit_max": 150,
        "sample_answer": "Dear Sir/Madam, I am writing to express my dissatisfaction regarding the cancellation of the annual picnic. Many members had already made arrangements and were greatly looking forward to the event. I would like to propose that the club seek sponsorship or reschedule the trip to a later date so that it can still take place. I look forward to your response. Yours faithfully, An."
      }
    ]
  }
}
```

---

## Kỹ năng 5 — Speaking (tất cả RECORD)

> **P1 tách lẻ (mỗi câu 1 bản ghi); P2/P3/P4 GÓI toàn bộ câu hỏi vào 1 bản ghi** qua `extra_config.questions[]`.
> `sample_answer` trong mỗi câu là TUỲ CHỌN (làm chuẩn cho AI chấm), bị ẩn khỏi đề khi học viên làm.

### Part 1 — Personal Info (3 câu ĐỘC LẬP, mỗi câu 1 bản ghi, 30s, không chuẩn bị)
```json
{
  "skillId": 5,
  "partNumber": 1,
  "content": "What's your favourite season and why?",
  "extraConfig": { "response_time_seconds": 30, "prep_time_seconds": 0, "image_count": 0 }
}
```

### Part 2 — Describe a picture (1 ảnh, 45s) → GÓI câu hỏi vào 1 bản ghi
> Ảnh lưu ở `extra_config.image_urls` (số phần tử = `image_count`). Các câu con trong `questions[]`.
```json
{
  "skillId": 5,
  "partNumber": 2,
  "content": "Look at the picture and answer the questions.",
  "extraConfig": {
    "response_time_seconds": 45,
    "prep_time_seconds": 0,
    "image_count": 1,
    "image_urls": ["https://cdn.example.com/img/speaking-p2.jpg"],
    "questions": [
      { "question": "Describe this picture." },
      { "question": "What is the person on the left doing?" },
      { "question": "Have you ever been to a place like this?" }
    ]
  }
}
```

### Part 3 — Compare two pictures (2 ẢNH, 45s) → GÓI câu hỏi vào 1 bản ghi
> `image_count: 2` → `image_urls` phải có **đúng 2** ảnh.
```json
{
  "skillId": 5,
  "partNumber": 3,
  "content": "Look at the two pictures and answer the questions.",
  "extraConfig": {
    "response_time_seconds": 45,
    "prep_time_seconds": 0,
    "image_count": 2,
    "image_urls": [
      "https://cdn.example.com/img/speaking-p3-a.jpg",
      "https://cdn.example.com/img/speaking-p3-b.jpg"
    ],
    "questions": [
      { "question": "Compare these two pictures." },
      { "question": "Which place would you prefer to visit and why?" },
      { "question": "What are the advantages of each?" }
    ]
  }
}
```

### Part 4 — Abstract Topic (1 phút chuẩn bị + 2 phút nói) → GÓI câu hỏi vào 1 bản ghi
```json
{
  "skillId": 5,
  "partNumber": 4,
  "content": "Talk about gratitude.",
  "extraConfig": {
    "response_time_seconds": 120,
    "prep_time_seconds": 60,
    "image_count": 1,
    "image_urls": ["https://cdn.example.com/img/speaking-p4.jpg"],
    "questions": [
      { "question": "Tell me about a time you felt grateful." },
      { "question": "Why is gratitude important?" },
      { "question": "How can we encourage gratitude in society?" }
    ]
  }
}
```

---

## Ghi chú validator (các lỗi hay gặp)
- **Vocabulary (1-2)**: mỗi Task = 1 bản ghi WORD_BANK; đủ 5 task = 5 bản ghi (task_variant khác nhau). Mỗi `slot` cần `prompt` + `correct_answer`.
- **Số lượng phần tử cố định**: WORD_BANK `options_pool`=10 & `slots`=5; ORDERING `options_pool`=6 & `correct_order`=6; gap-fill `gaps`=5 (mỗi gap `options`=3); Listening P2 `options_pool`=6 (câu văn) & `speakers`=4 (mỗi đáp án dùng 1 lần); Reading P4 `people`=4 & `questions`=7 (một người được chọn nhiều lần); Reading P5 cần `example` (câu 0) + `paragraphs`=7 & `headings_pool`=8 & `answers`=7.
- **MC**: đáp án nằm trong `extraConfig.options` = `[{ content, is_correct }]`, đúng 3 đáp án và **đúng 1** `is_correct: true`. (Không còn bảng question_bank_options.)
- **Khóa đáp án phải tồn tại**: `correct_answer`/`correct_opinion`/`correct_person`/`correct_heading` phải nằm trong pool/keys tương ứng; `correct_index` trong [0..2].
- **Giá trị enum cố định**: RECORD `response_time_seconds`∈{30,45,120}, `prep_time_seconds`∈{0,60}, `image_count`∈{0,1,2} và `image_urls` phải có ĐÚNG `image_count` phần tử (Speaking P3 = 2 ảnh); Listening P3 mỗi `statements[i].correct`∈{MAN,WOMAN,BOTH}; WORD_BANK `task_variant`∈{DEFINITION,COLLOCATION,SENTENCE,SYNONYM,ANTONYM}.
- **Listening gói cả cụm trong 1 bản ghi**: Listening P3 gói TẤT CẢ nhận định vào `extra_config.statements[]` (1 audio chung ở `mediaUrl`) — 1 bản ghi/part. Listening P4 gói các câu MC của CÙNG 1 bài nghe vào `extra_config.questions[]` (audio riêng ở `mediaUrl`) — mỗi bài nghe = 1 bản ghi (P4 có 2 bài → 2 bản ghi). Không còn tách mỗi nhận định/câu thành 1 dòng, và bỏ `audio_group_id`.
- **Speaking gói cả part trong 1 bản ghi (trừ P1)**: Speaking P1 tách 3 câu độc lập (mỗi câu 1 bản ghi). P2/P3/P4 gói TOÀN BỘ câu hỏi của part vào `extra_config.questions[]` (`questions[i].question` bắt buộc, `sample_answer` tuỳ chọn). Ảnh vẫn ở `image_urls` khớp `image_count`.
