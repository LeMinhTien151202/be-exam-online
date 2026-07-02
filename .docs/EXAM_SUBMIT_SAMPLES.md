# Kịch bản học viên làm bài & nộp — Phase 5

> Body mẫu cho `GET /exams/:id/take` và `POST /exams/:id/submit`.
> **Trước khi chạy:** login tài khoản **STUDENT** → Authorize; đề phải `isActive = true` và đã gán câu hỏi (xem [EXAM_SAMPLES.md](EXAM_SAMPLES.md)).
> `questionId` trong body submit = id câu hỏi lấy từ `GET /exams/:id/take`.

---

## Luồng
1. `GET /exams?type=MOCK_TEST` → chọn đề.
2. `GET /exams/{id}/take` → nhận đề **đã ẩn đáp án** (không có `is_correct`, `correct_*`). Lấy `questionId` của từng câu.
3. `POST /exams/{id}/submit` → gửi `answers`, nhận review + điểm.
4. `GET /progress/me`, `GET /streaks/me`, `GET /attempts/me` để xem kết quả.

---

## Shape đáp án `response` theo từng dạng

| Dạng (part) | `response` gửi lên | Ví dụ |
| :-- | :-- | :-- |
| **MC thường** (Grammar P1, Listening P1/P4) | index đáp án (0-based) | `1` |
| **MC gap-fill** (Reading P1) | mảng index mỗi chỗ trống | `[0, 0, 0, 0, 2]` |
| **MC agreement** (Listening P3) | `"MAN"` \| `"WOMAN"` \| `"BOTH"` | `"BOTH"` |
| **ORDERING** (Reading P2/P3) | mảng thứ tự | `[0,1,2,3,4,5]` |
| **WORD_BANK** (Vocab P2) | object `{ slot_id: answer }` | `{ "s1": "generous" }` |
| **HEADING_MATCH** (Reading P5) | object `{ paragraph_label: heading }` | `{ "1": "Humble Beginnings" }` |
| **SPEAKER_MATCH Listening** (P2) | object `{ speaker_index: answer }` | `{ "1": "prefers to shop alone." }` |
| **SPEAKER_MATCH Reading** (P4) | mảng theo thứ tự câu hỏi | `["A","C","B",...]` |
| **ESSAY** (Writing) | chuỗi bài viết | `"My favourite season is..."` |
| **RECORD** (Speaking) | URL audio đã upload | `"https://.../audio/...mp3"` |

> ESSAY / RECORD hiện **chưa auto-chấm** → trả về trong `needsAiGradingCount` (chờ Phase 6 chấm bằng Gemini).

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
- **Listening P3**: `"BOTH"`
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
→ Không lưu attempt; tăng `student_progress` (skill 1, part 1, +3). Trả `autoScore` (0-100).

### B2. Đề thi thử (MOCK_TEST) — trộn nhiều dạng
```json
{
  "answers": [
    { "questionId": 201, "response": 1 },
    { "questionId": 202, "response": { "s1": "generous", "s2": "stubborn", "s3": "cautious", "s4": "fragile", "s5": "reliable" } },
    { "questionId": 203, "response": { "1": "prefers to shop alone.", "2": "dislikes online shopping.", "3": "thinks before purchasing.", "4": "spends a lot of money." } },
    { "questionId": 204, "response": "BOTH" },
    { "questionId": 205, "response": [0, 0, 0, 0, 2] },
    { "questionId": 206, "response": [0, 1, 2, 3, 4, 5] },
    { "questionId": 207, "response": ["A", "C", "B", "C", "D", "A", "B"] },
    { "questionId": 208, "response": { "1": "Humble Beginnings", "2": "The Tournament in Modern Day", "3": "Inclusivity of Nations", "4": "Record Holders", "5": "Controversial Issues", "6": "Economic Strain", "7": "The Future of The World Cup" } },
    { "questionId": 209, "response": "My favourite season is autumn because the weather is cool and the leaves are beautiful." },
    { "questionId": 210, "response": "https://ixloh....supabase.co/storage/v1/object/public/exam-online/audio/speaking/p1/answer.mp3" }
  ]
}
```
→ Lưu 1 dòng `exam_attempts` (`totalScore` = điểm auto). Câu 209 (ESSAY) + 210 (RECORD) vào `needsAiGradingCount`.

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
- **Luyện tập** (PART_PRACTICE / SKILL_FULL_SET): `attemptId = null`, cập nhật `student_progress`.
- **Thi thử** (MOCK_TEST): `attemptId` có giá trị, lưu `exam_attempts.total_score = score`.

---

## Ghi chú
- Câu `questionId` không thuộc đề → bị bỏ qua khi chấm (không tính điểm).
- ORDERING chấm **tất-cả-hoặc-không** (đúng toàn bộ thứ tự mới được 1 điểm).
- WORD_BANK / HEADING_MATCH / SPEAKER_MATCH / gap-fill chấm **từng ý** (mỗi ý đúng +1, tổng = số ý).
- Streak (`/streaks/me`) tự cập nhật sau mỗi lần submit.
