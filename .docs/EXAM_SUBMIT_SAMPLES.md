# Kịch bản học viên làm bài & nộp — Phase 5

> Body mẫu cho `GET /exams/:id/take` và `POST /exams/:id/submit`.
> **Trước khi chạy:** login tài khoản **STUDENT** → Authorize; đề phải `isActive = true` và đã gán câu hỏi (xem [EXAM_SAMPLES.md](EXAM_SAMPLES.md)).
> `questionId` trong body submit = id câu hỏi lấy từ `GET /exams/:id/take`.

---

## Luồng
1. `GET /exams?type=...` → chọn đề (PART_PRACTICE / SKILL_FULL_SET / MOCK_TEST).
2. `GET /exams/{id}/take` → nhận đề **đã ẩn đáp án** (không có `is_correct`, `correct_*`). Lấy `questionId` của từng câu.
3. `POST /exams/{id}/submit` → gửi `answers`, nhận review + điểm.
4. `GET /progress/me`, `GET /streaks/me`, `GET /attempts/me` để xem kết quả.

---

## Lưu tiến độ theo từng loại đề

Ba loại đề lưu **khác nhau** — FE dựa vào đây để hiển thị tiến độ / nhãn "Đã làm" / điểm trung bình:

| Loại đề | Mục tiêu (FE) | BE lưu gì | Cách suy ra trạng thái |
| :-- | :-- | :-- | :-- |
| **PART_PRACTICE** (luyện theo phần) | Biết **đã làm phần đó chưa** + thanh **tiến độ** từng phần | `student_progress.questions_answered` theo (student, skill, part) — **cộng dồn** | tiến độ = `answered / tổng câu của phần`; đã làm = `answered > 0` |
| **SKILL_FULL_SET** (luyện theo bộ đề) | Nhãn **Đã làm / Chưa làm** cho từng đề | **1 dòng `exam_attempts`** đánh dấu hoàn thành theo `exam_set_id` | Đã làm = **tồn tại attempt** cho đề đó |
| **MOCK_TEST** (thi thử) | **Đã thi / Chưa thi** + **điểm trung bình** | **1 dòng `exam_attempts` mỗi lần nộp** (`total_score`) | Đã thi = có attempt; điểm TB = `AVG(total_score)` các lần thi |

> `exam_attempts` dùng cho **cả SKILL_FULL_SET và MOCK_TEST** (mỗi lần nộp ghi 1 dòng). **Điểm trung bình chỉ tính trên `MOCK_TEST`**; SKILL_FULL_SET chỉ cần biết đã-làm nên không dùng điểm để tính TB. **PART_PRACTICE KHÔNG ghi attempt** — chỉ tăng bộ đếm `student_progress`.

---

## Shape đáp án `response` theo từng dạng

| Dạng (part) | `response` gửi lên | Ví dụ |
| :-- | :-- | :-- |
| **MC thường** (Grammar P1, Listening P1) | index đáp án (0-based) | `1` |
| **MC gap-fill** (Reading P1) | mảng index mỗi chỗ trống | `[0, 0, 0, 0, 2]` |
| **MC agreement** (Listening P3, gói cả part) | mảng `"MAN"\|"WOMAN"\|"BOTH"` theo thứ tự `statements` | `["BOTH","MAN","WOMAN","BOTH"]` |
| **MC monologue** (Listening P4, gói cả bài nghe) | mảng index đáp án theo thứ tự `questions` | `[1, 0]` |
| **ORDERING** (Reading P2/P3) | mảng thứ tự | `[0,1,2,3,4,5]` |
| **WORD_BANK** (Vocab P2) | object `{ slot_id: answer }` | `{ "s1": "generous" }` |
| **HEADING_MATCH** (Reading P5) | object `{ paragraph_label: heading }` | `{ "1": "Humble Beginnings" }` |
| **SPEAKER_MATCH Listening** (P2) | object `{ speaker_index: answer }` | `{ "1": "prefers to shop alone." }` |
| **SPEAKER_MATCH Reading** (P4) | mảng theo thứ tự câu hỏi | `["A","C","B",...]` |
| **ESSAY** (Writing) | Writing gói nhiều câu con/part → **mảng bài viết** theo thứ tự `prompts`/`tasks` (P2 mảng 1 phần tử) | `["ans1","ans2",...]` |
| **RECORD** (Speaking P1) | 1 URL audio đã upload | `"https://.../audio/...mp3"` |
| **RECORD gói** (Speaking P2/P3/P4) | **mảng URL** audio theo thứ tự `questions` | `["https://.../q1.mp3", "https://.../q2.mp3"]` |

> ESSAY / RECORD **không auto-chấm được** → **AI (Gemini) chấm đồng bộ** khi nộp cho **mọi loại đề** có câu Viết/Nói (PART_PRACTICE, SKILL_FULL_SET, MOCK_TEST); kết quả trả trong `ai[]`. Gemini lỗi / chưa cấu hình `GEMINI_API_KEY` → câu đó vào `needsManualReviewCount` (`aiScore = null`).

---

## A. Ví dụ từng dạng (giá trị của trường `response`)

Khớp với đáp án đúng trong [QUESTION_SAMPLES.md](QUESTION_SAMPLES.md):

- **Grammar P1** (goes đúng, index 1): `1`
- **Vocab P2 DEFINITION**:
```json
{ "s1": "generous", "s2": "stubborn", "s3": "cautious", "s4": "fragile", "s5": "reliable" }
```
- **Listening P2** (4 người ghép câu):
```json
{ "1": "prefers to shop alone.", "2": "dislikes online shopping.", "3": "thinks before purchasing.", "4": "spends a lot of money." }
```
- **Listening P3** (theo thứ tự các nhận định): `["BOTH", "MAN", "WOMAN", "BOTH"]`
- **Listening P4** (theo thứ tự các câu trong bài nghe): `[1, 0]`
- **Reading P1 gap-fill**: `[0, 0, 0, 0, 2]`
- **Reading P2 ORDERING**: `[0, 1, 2, 3, 4, 5]`
- **Reading P4** (theo thứ tự 7 câu hỏi):
```json
["A", "C", "B", "C", "D", "A", "B"]
```
- **Reading P5 HEADING_MATCH**:
```json
{ "1": "Humble Beginnings", "2": "The Tournament in Modern Day", "3": "Inclusivity of Nations", "4": "Record Holders", "5": "Controversial Issues", "6": "Economic Strain", "7": "The Future of The World Cup" }
```

### Writing (ESSAY) — `response` là **mảng** câu trả lời con theo thứ tự `prompts`/`tasks`

- **Writing P1** (5 ô điền — mảng 5 câu ngắn):
```json
["autumn", "reading books", "by train", "Da Nang", "my family"]
```
- **Writing P2** (1 đề — mảng 1 phần tử):
```json
["I love travelling and photography, so I want to join the Travel Club to meet people who share my hobbies and explore new places together."]
```
- **Writing P3** (3 Member A/B/C — mảng 3 đoạn):
```json
[
  "I usually travel with my family. We enjoy road trips and visiting the countryside together every summer.",
  "I agree that self-guided tours are more flexible, but group tours are safer and you can make new friends easily.",
  "If I could travel anywhere tomorrow, I would go to Japan to see the cherry blossoms and try the local food."
]
```
- **Writing P4** (2 task Informal + Formal — mảng 2 email):
```json
[
  "Hey Minh! Did you see the notice? I'm so annoyed the picnic got cancelled. We were really looking forward to it. Maybe we can plan something ourselves? Let me know what you think!",
  "Dear Sir/Madam, I am writing to express my dissatisfaction regarding the cancellation of the annual picnic. Many members had already made arrangements. I would like to propose that the club seek sponsorship or reschedule the event. I look forward to your response. Yours faithfully, An."
]
```

### Speaking (RECORD) — `response` là URL audio đã upload

- **Speaking P1** (3 câu độc lập → mỗi câu 1 bản ghi, response = 1 URL):
```json
"https://ixloh....supabase.co/storage/v1/object/public/exam-online/audio/speaking/p1/answer.mp3"
```
- **Speaking P2/P3/P4** (gói cả part → response = **mảng URL** theo thứ tự `questions`):
```json
[
  "https://ixloh....supabase.co/storage/v1/object/public/exam-online/audio/speaking/p2/q1.mp3",
  "https://ixloh....supabase.co/storage/v1/object/public/exam-online/audio/speaking/p2/q2.mp3",
  "https://ixloh....supabase.co/storage/v1/object/public/exam-online/audio/speaking/p2/q3.mp3"
]
```
> Writing/Speaking do **Gemini chấm** (không auto) ở **mọi loại đề** (PART_PRACTICE / SKILL_FULL_SET / MOCK_TEST), trả trong `ai[]`; câu Writing/Speaking gói được chấm **tổng thể cả part → 1 điểm**.

---

## B. Body submit đầy đủ — `POST /exams/{id}/submit`

> Thay `questionId` bằng id thật lấy từ `GET /exams/{id}/take`.

### B1. Đề luyện tập Grammar (PART_PRACTICE) — 3 câu MC
```json
{
  "answers": [
    { "questionId": 101, "response": 1 },
    { "questionId": 102, "response": 0 },
    { "questionId": 103, "response": 2 }
  ]
}
```
→ **PART_PRACTICE**: KHÔNG lưu attempt; chỉ tăng `student_progress` (skill 1, part 1, +3). Trả `autoScore` (0-100). Nếu luyện phần **Viết/Nói** → câu ESSAY/RECORD vẫn được **AI (Gemini) chấm** và trả trong `ai[]`.

### B1b. Đề luyện theo bộ đề (SKILL_FULL_SET) — nộp cả kỹ năng
Body giống B1/B2 (gộp mọi câu của các part trong 1 kỹ năng).
→ **SKILL_FULL_SET**: ghi **1 dòng `exam_attempts`** (đánh dấu đề này **đã làm**) + tăng `student_progress` các part liên quan. Nếu là bộ đề **Viết/Nói** → câu ESSAY/RECORD được **AI (Gemini) chấm** và trả trong `ai[]`. Điểm chỉ để trả review nóng, **không tính vào điểm trung bình**.

### B2. Đề thi thử (MOCK_TEST) — trộn nhiều dạng
```json
{
  "answers": [
    { "questionId": 201, "response": 1 },
    { "questionId": 202, "response": { "s1": "generous", "s2": "stubborn", "s3": "cautious", "s4": "fragile", "s5": "reliable" } },
    { "questionId": 203, "response": { "1": "prefers to shop alone.", "2": "dislikes online shopping.", "3": "thinks before purchasing.", "4": "spends a lot of money." } },
    { "questionId": 204, "response": ["BOTH", "MAN", "WOMAN", "BOTH"] },
    { "questionId": 211, "response": [1, 0] },
    { "questionId": 205, "response": [0, 0, 0, 0, 2] },
    { "questionId": 206, "response": [0, 1, 2, 3, 4, 5] },
    { "questionId": 207, "response": ["A", "C", "B", "C", "D", "A", "B"] },
    { "questionId": 208, "response": { "1": "Humble Beginnings", "2": "The Tournament in Modern Day", "3": "Inclusivity of Nations", "4": "Record Holders", "5": "Controversial Issues", "6": "Economic Strain", "7": "The Future of The World Cup" } },
    { "questionId": 209, "response": ["autumn", "reading", "by train", "Da Nang", "my family"] },
    { "questionId": 210, "response": "https://ixloh....supabase.co/storage/v1/object/public/exam-online/audio/speaking/p1/answer.mp3" }
  ]
}
```
→ **MOCK_TEST**: câu 209 (ESSAY) + 210 (RECORD) được **AI (Gemini) chấm đồng bộ** → điểm AI. Ghi **1 dòng `exam_attempts` mỗi lần nộp** (`totalScore` = **điểm trắc nghiệm + điểm AI**; thi lại → thêm dòng mới) → dùng cho **đã thi/chưa thi** và **điểm trung bình** (`AVG`). Gemini lỗi → câu đó vào `needsManualReviewCount`.

---

## C. Kết quả trả về (review nóng)
```json
{
  "examId": 5,
  "type": "MOCK_TEST",
  "attemptId": 12,
  "score": 82,
  "autoScore": 85,
  "earnedAutoPoints": 17,
  "totalAutoPoints": 20,
  "needsManualReviewCount": 0,
  "details": [
    { "questionId": 201, "questionType": "MC", "earned": 1, "total": 1, "autoGraded": true, "needsAiGrading": false }
  ],
  "ai": [
    { "questionId": 209, "questionType": "ESSAY", "aiScore": 78, "band": "B2", "feedback": "Good ideas, minor grammar errors.", "needsManualReview": false },
    { "questionId": 210, "questionType": "RECORD", "aiScore": 72, "band": "B1", "feedback": "Clear content, some hesitation.", "needsManualReview": false }
  ]
}
```
- `score` = **điểm tổng** = trung bình % theo từng câu (trắc nghiệm `earned/total*100` + AI `aiScore`). `autoScore` = riêng phần trắc nghiệm.
- `details` = chi tiết trắc nghiệm; `ai` = chi tiết chấm tự luận (ESSAY/RECORD) từ Gemini.
- `needsManualReviewCount` > 0 nếu chưa cấu hình GEMINI_API_KEY hoặc Gemini lỗi → câu đó `aiScore = null`, cần chấm tay.
- **PART_PRACTICE** (luyện theo phần): `attemptId = null`, chỉ cập nhật `student_progress` (đã làm phần nào + tiến độ). Nếu luyện phần Viết/Nói → câu ESSAY/RECORD vẫn được **AI (Gemini) chấm** (trả `ai[]`).
- **SKILL_FULL_SET** (luyện theo bộ đề): `attemptId` có giá trị (đánh dấu **đã làm** đề) + cập nhật `student_progress`. **Không** tính vào điểm trung bình.
- **MOCK_TEST** (thi thử): `attemptId` có giá trị, lưu `exam_attempts.total_score = score` **mỗi lần nộp** (nhiều dòng/đề) → dùng cho **đã thi/chưa thi** và **điểm trung bình** (`AVG(total_score)`).

---

## Ghi chú
- Câu `questionId` không thuộc đề → bị bỏ qua khi chấm (không tính điểm).
- ORDERING chấm **tất-cả-hoặc-không** (đúng toàn bộ thứ tự mới được 1 điểm).
- WORD_BANK / HEADING_MATCH / SPEAKER_MATCH / gap-fill / Listening P3 (statements) / Listening P4 (questions) chấm **từng ý** (mỗi ý đúng +1, tổng = số ý).
- Streak (`/streaks/me`) tự cập nhật sau mỗi lần submit.
