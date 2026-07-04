# FE Phase 5 & 6 — Làm bài, Chấm điểm, Tiến độ (STUDENT)

> Nền tảng chung: base `/api/v1`; response bọc `{ code, success, message, messages, data, metaData }` (đọc `data`); header `Authorization: Bearer <access_token>`.
> Shape đáp án `response` theo từng dạng câu hỏi: [EXAM_SUBMIT_SAMPLES.md](EXAM_SUBMIT_SAMPLES.md).

## Luồng dùng
```
[1] GET /exams?type=            → chọn đề
[2] GET /exams/{id}/take        → nhận đề (ĐÃ ẩn đáp án), lấy questionId từng câu
[3] POST /exams/{id}/submit     → gửi answers → nhận điểm + review
[4] GET /attempts/me | /progress/me | /streaks/me → xem kết quả/tiến độ
```

---

## 1. Danh sách đề — `GET /exams`
Chỉ đề `isActive = true`. Query: `?type=&skillId=&page=1&limit=10` (`type` = PART_PRACTICE / SKILL_FULL_SET / MOCK_TEST).

**Response** (phân trang):
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy danh sách đề thành công",
  "messages": [],
  "data": [
    {
      "id": 5,
      "title": "Thi thử APTIS - Đề 01",
      "description": "Full 5 kỹ năng",
      "type": "MOCK_TEST",
      "skillId": null,
      "partNumber": null,
      "isActive": true,
      "createdAt": "2026-07-02T10:00:00.000Z",
      "skill": null
    },
    {
      "id": 3,
      "title": "Luyện Listening P1",
      "type": "PART_PRACTICE",
      "skillId": 2,
      "partNumber": 1,
      "isActive": true,
      "skill": { "id": 2, "name": "Listening", "totalParts": 4 }
    }
  ],
  "metaData": { "page": 1, "pageSize": 10, "total": 6, "totalPage": 1 }
}
```

---

## 2. Lấy đề để làm — `GET /exams/{id}/take`
Trả đề đầy đủ **ĐÃ ẩn đáp án** (không có `is_correct`, `correct_*`). FE dùng để render đề + lấy `question.id` cho từng câu.

**Response `data` (rút gọn 1 part):**
```json
{
  "id": 5,
  "title": "Thi thử APTIS - Đề 01",
  "type": "MOCK_TEST",
  "sections": [
    {
      "id": 8,
      "skillId": 2,
      "durationMinutes": 30,
      "orderIndex": 0,
      "skill": { "id": 2, "name": "Listening" },
      "parts": [
        {
          "id": 12,
          "partNumber": 1,
          "instruction": "Listen and choose the correct answer.",
          "audioUrl": null,
          "questions": [
            {
              "orderIndex": 0,
              "question": {
                "id": 10,
                "skillId": 2,
                "partNumber": 1,
                "questionType": "MC",
                "content": "What time does the train leave?",
                "mediaUrl": "https://.../audio.mp3",
                "extraConfig": {
                  "options": [
                    { "content": "7:15" },
                    { "content": "7:50" },
                    { "content": "8:15" }
                  ]
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
```
> Chú ý: `options` KHÔNG có `is_correct`; các dạng khác cũng bị lược `correct_*` (gap-fill mất `correct_index`, WORD_BANK mất `correct_answer`, HEADING_MATCH mất `correct_heading`, ...). FE chỉ hiển thị đề, không thấy đáp án.

---

## 3. Nộp bài — `POST /exams/{id}/submit`
Mỗi câu 1 phần tử `answers`, `response` tuỳ dạng (xem [EXAM_SUBMIT_SAMPLES.md](EXAM_SUBMIT_SAMPLES.md)).

**Request:**
```json
{
  "answers": [
    { "questionId": 10, "response": 1 },
    { "questionId": 11, "response": [0, 1, 2, 3, 4, 5] },
    { "questionId": 12, "response": { "s1": "generous", "s2": "stubborn" } },
    { "questionId": 20, "response": "My favourite season is autumn because..." },
    { "questionId": 21, "response": "https://.../audio/speaking/answer.mp3" }
  ]
}
```

**Response:**
```json
{
  "code": 201,
  "success": true,
  "message": "Nộp bài thành công",
  "messages": [],
  "data": {
    "examId": 5,
    "type": "MOCK_TEST",
    "attemptId": 12,
    "score": 82,
    "autoScore": 85,
    "earnedAutoPoints": 17,
    "totalAutoPoints": 20,
    "needsManualReviewCount": 0,
    "details": [
      { "questionId": 10, "questionType": "MC", "earned": 1, "total": 1, "autoGraded": true, "needsAiGrading": false },
      { "questionId": 11, "questionType": "ORDERING", "earned": 1, "total": 1, "autoGraded": true, "needsAiGrading": false }
    ],
    "ai": [
      { "questionId": 20, "questionType": "ESSAY", "aiScore": 78, "band": "B2", "feedback": "Good ideas, minor grammar errors.", "needsManualReview": false },
      { "questionId": 21, "questionType": "RECORD", "aiScore": 72, "band": "B1", "feedback": "Clear content, some hesitation.", "needsManualReview": false }
    ]
  },
  "metaData": null
}
```
**Cách đọc kết quả cho FE:**
- `score` = điểm tổng (0–100), gồm trắc nghiệm + AI. Hiện lên màn kết quả.
- `details` = chấm trắc nghiệm từng câu (`earned/total`). `ai` = chấm ESSAY/RECORD (điểm + band + nhận xét Gemini).
- `needsManualReviewCount > 0` → có câu AI chưa chấm được (Gemini chưa cấu hình/lỗi) → `aiScore: null`, hiện "đang chờ chấm".
- **Luyện tập** (PART_PRACTICE/SKILL_FULL_SET): `attemptId = null` (không lưu lịch sử), chỉ cập nhật `progress`.
- **Thi thử** (MOCK_TEST): `attemptId` có giá trị → xem lại ở `/attempts/me`.

---

## 4. Lịch sử thi thử

### GET /attempts/me
**Response `data`:**
```json
[
  {
    "id": 12,
    "studentId": 1,
    "examId": 5,
    "status": "SUBMITTED",
    "totalScore": 82,
    "startedAt": "2026-07-02T10:00:00.000Z",
    "finishedAt": "2026-07-02T10:40:00.000Z",
    "exam": { "id": 5, "title": "Thi thử APTIS - Đề 01", "type": "MOCK_TEST" }
  }
]
```
> Chỉ MOCK_TEST mới có bản ghi ở đây (luyện tập không lưu).

### GET /attempts/{id}
**Response `data`:** 1 attempt như trên. Nếu không phải của mình → **404**:
```json
{ "statusCode": 404, "message": "Không tìm thấy lần thi ID = 99", "error": "Not Found" }
```

---

## 5. Tiến độ & Streak

### GET /progress/me
Bộ đếm số câu đã làm theo (kỹ năng, phần) — dùng cho màn luyện tập (thanh tiến độ).
**Response `data`:**
```json
[
  { "studentId": 1, "skillId": 2, "partNumber": 1, "questionsAnswered": 13 },
  { "studentId": 1, "skillId": 3, "partNumber": 2, "questionsAnswered": 6 }
]
```

### GET /streaks/me
**Response `data`:**
```json
{ "studentId": 1, "currentStreak": 5, "longestStreak": 12, "lastActivity": "2026-07-02T00:00:00.000Z" }
```
> Nếu chưa từng học: `{ "studentId": 1, "currentStreak": 0, "longestStreak": 0, "lastActivity": null }`.

---

## Enum
- `type`: `PART_PRACTICE` | `SKILL_FULL_SET` | `MOCK_TEST`
- `questionType` (trong details/ai): `MC` | `ORDERING` | `WORD_BANK` | `HEADING_MATCH` | `SPEAKER_MATCH` | `ESSAY` | `RECORD`

---

## Tóm tắt endpoint

| Method | Path | Quyền | Ghi chú |
| :-- | :-- | :-- | :-- |
| GET | `/exams` | STUDENT | Đề đang mở (lọc type/skill) |
| GET | `/exams/{id}/take` | STUDENT | Lấy đề (ẩn đáp án) |
| POST | `/exams/{id}/submit` | STUDENT | Nộp bài → điểm + review |
| GET | `/attempts/me` | STUDENT | Lịch sử thi thử |
| GET | `/attempts/{id}` | STUDENT | Chi tiết 1 lần thi |
| GET | `/progress/me` | STUDENT | Bộ đếm câu đã làm |
| GET | `/streaks/me` | STUDENT | Chuỗi ngày học |
