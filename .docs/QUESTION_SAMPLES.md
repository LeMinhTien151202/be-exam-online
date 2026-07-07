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

**Task 1 — DEFINITION (ghép định nghĩa → từ):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Chọn từ phù hợp với mỗi định nghĩa.",
  "extraConfig": {
    "task_variant": "DEFINITION",
    "options_pool": ["generous", "stubborn", "cautious", "fragile", "ancient", "rapid", "honest", "vacant", "gloomy", "reliable"],
    "slots": [
      { "slot_id": "s1", "prompt": "Willing to give and share", "correct_answer": "generous" },
      { "slot_id": "s2", "prompt": "Refusing to change one's mind", "correct_answer": "stubborn" },
      { "slot_id": "s3", "prompt": "Careful to avoid danger", "correct_answer": "cautious" },
      { "slot_id": "s4", "prompt": "Easily broken", "correct_answer": "fragile" },
      { "slot_id": "s5", "prompt": "Able to be trusted", "correct_answer": "reliable" }
    ]
  }
}
```

**Task 2 — COLLOCATION (từ gốc → từ đi kèm):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Chọn từ ghép với từ gốc tạo thành cụm cố định.",
  "extraConfig": {
    "task_variant": "COLLOCATION",
    "options_pool": ["a decision", "a mistake", "a photo", "a break", "progress", "attention", "a risk", "fun", "care", "place"],
    "slots": [
      { "slot_id": "s1", "prompt": "make ___", "correct_answer": "a decision" },
      { "slot_id": "s2", "prompt": "take ___", "correct_answer": "a photo" },
      { "slot_id": "s3", "prompt": "pay ___", "correct_answer": "attention" },
      { "slot_id": "s4", "prompt": "have ___", "correct_answer": "fun" },
      { "slot_id": "s5", "prompt": "make ___ (tiến bộ)", "correct_answer": "progress" }
    ]
  }
}
```

**Task 3 — SENTENCE (điền từ vào câu):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Chọn từ phù hợp hoàn thành mỗi câu.",
  "extraConfig": {
    "task_variant": "SENTENCE",
    "options_pool": ["borrow", "lend", "raise", "rise", "affect", "effect", "advice", "advise", "fewer", "less"],
    "slots": [
      { "slot_id": "s1", "prompt": "Could you ___ me your pen?", "correct_answer": "lend" },
      { "slot_id": "s2", "prompt": "Prices ___ every year.", "correct_answer": "rise" },
      { "slot_id": "s3", "prompt": "The weather can ___ our mood.", "correct_answer": "affect" },
      { "slot_id": "s4", "prompt": "She gave me good ___.", "correct_answer": "advice" },
      { "slot_id": "s5", "prompt": "There are ___ cars today.", "correct_answer": "fewer" }
    ]
  }
}
```

**Task 4 — SYNONYM (tìm từ đồng nghĩa):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Chọn từ đồng nghĩa với mỗi từ cho sẵn.",
  "extraConfig": {
    "task_variant": "SYNONYM",
    "options_pool": ["enormous", "desert", "brave", "quick", "wealthy", "begin", "happy", "difficult", "silent", "angry"],
    "slots": [
      { "slot_id": "s1", "prompt": "huge", "correct_answer": "enormous" },
      { "slot_id": "s2", "prompt": "abandon", "correct_answer": "desert" },
      { "slot_id": "s3", "prompt": "fast", "correct_answer": "quick" },
      { "slot_id": "s4", "prompt": "rich", "correct_answer": "wealthy" },
      { "slot_id": "s5", "prompt": "start", "correct_answer": "begin" }
    ]
  }
}
```

**Task 5 — ANTONYM (tìm từ trái nghĩa):**
```json
{
  "skillId": 1,
  "partNumber": 2,
  "content": "Chọn từ trái nghĩa với mỗi từ cho sẵn.",
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

### Part 3 — Opinion Matching (MC dạng Man/Woman/Both, audio chung ở part)
```json
{
  "skillId": 2,
  "partNumber": 3,
  "content": "The new policy will benefit young workers.",
  "extraConfig": {
    "choice_kind": "SPEAKER_AGREEMENT",
    "correct": "BOTH"
  }
}
```

### Part 4 — Monologue (MC, gom 2 câu/1 audio bằng audio_group_id)
```json
{
  "skillId": 2,
  "partNumber": 4,
  "content": "What is the main purpose of the lecture?",
  "mediaUrl": "https://cdn.example.com/audio/listening-p4-monologue1.mp3",
  "extraConfig": {
    "audio_group_id": "g1",
    "options": [
      { "content": "To warn about a risk", "is_correct": false },
      { "content": "To explain a discovery", "is_correct": true },
      { "content": "To advertise a product", "is_correct": false }
    ]
  }
}
```

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

### Part 1 — Personal Info (3 câu, 30s, không chuẩn bị)
```json
{
  "skillId": 5,
  "partNumber": 1,
  "content": "What's your favourite season and why?",
  "extraConfig": { "response_time_seconds": 30, "prep_time_seconds": 0, "image_count": 0 }
}
```

### Part 2 — Describe a picture (1 ảnh, 45s)
> Ảnh lưu ở `extra_config.image_urls` (số phần tử = `image_count`).
```json
{
  "skillId": 5,
  "partNumber": 2,
  "content": "Describe this picture.",
  "extraConfig": {
    "response_time_seconds": 45,
    "prep_time_seconds": 0,
    "image_count": 1,
    "image_urls": ["https://cdn.example.com/img/speaking-p2.jpg"]
  }
}
```

### Part 3 — Compare two pictures (2 ẢNH, 45s)
> `image_count: 2` → `image_urls` phải có **đúng 2** ảnh.
```json
{
  "skillId": 5,
  "partNumber": 3,
  "content": "Compare these two pictures.",
  "extraConfig": {
    "response_time_seconds": 45,
    "prep_time_seconds": 0,
    "image_count": 2,
    "image_urls": [
      "https://cdn.example.com/img/speaking-p3-a.jpg",
      "https://cdn.example.com/img/speaking-p3-b.jpg"
    ]
  }
}
```

### Part 4 — Abstract Topic (1 phút chuẩn bị + 2 phút nói)
```json
{
  "skillId": 5,
  "partNumber": 4,
  "content": "Tell me about a time you felt grateful. Why is gratitude important? How can we encourage it?",
  "extraConfig": {
    "response_time_seconds": 120,
    "prep_time_seconds": 60,
    "image_count": 1,
    "image_urls": ["https://cdn.example.com/img/speaking-p4.jpg"]
  }
}
```

---

## Ghi chú validator (các lỗi hay gặp)
- **Vocabulary (1-2)**: mỗi Task = 1 bản ghi WORD_BANK; đủ 5 task = 5 bản ghi (task_variant khác nhau). Mỗi `slot` cần `prompt` + `correct_answer`.
- **Số lượng phần tử cố định**: WORD_BANK `options_pool`=10 & `slots`=5; ORDERING `options_pool`=6 & `correct_order`=6; gap-fill `gaps`=5 (mỗi gap `options`=3); Listening P2 `options_pool`=6 (câu văn) & `speakers`=4 (mỗi đáp án dùng 1 lần); Reading P4 `people`=4 & `questions`=7 (một người được chọn nhiều lần); Reading P5 cần `example` (câu 0) + `paragraphs`=7 & `headings_pool`=8 & `answers`=7.
- **MC**: đáp án nằm trong `extraConfig.options` = `[{ content, is_correct }]`, đúng 3 đáp án và **đúng 1** `is_correct: true`. (Không còn bảng question_bank_options.)
- **Khóa đáp án phải tồn tại**: `correct_answer`/`correct_opinion`/`correct_person`/`correct_heading` phải nằm trong pool/keys tương ứng; `correct_index` trong [0..2].
- **Giá trị enum cố định**: RECORD `response_time_seconds`∈{30,45,120}, `prep_time_seconds`∈{0,60}, `image_count`∈{0,1,2} và `image_urls` phải có ĐÚNG `image_count` phần tử (Speaking P3 = 2 ảnh); Listening P3 `correct`∈{MAN,WOMAN,BOTH}; WORD_BANK `task_variant`∈{DEFINITION,COLLOCATION,SENTENCE,SYNONYM,ANTONYM}.
