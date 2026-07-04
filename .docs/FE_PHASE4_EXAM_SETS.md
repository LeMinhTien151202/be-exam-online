# FE Phase 4 — Exam Sets (dựng đề + gán câu hỏi)

> Nền tảng chung: base `/api/v1`; response bọc `{ code, success, message, messages, data, metaData }` (đọc `data`); header `Authorization: Bearer <access_token>` (ADMIN/TEACHER).
> Body 3 loại đề chi tiết: [EXAM_SAMPLES.md](EXAM_SAMPLES.md).

## Luồng dùng (quan trọng)
```
[1] POST /exam-sets           → BE tự sinh sections + parts, trả về cây → LẤY part.id
[2] (tuỳ) PATCH /exam-parts   → đặt instruction / audioUrl cho part
[3] POST /exam-parts/{id}/questions → gán câu hỏi vào part (dùng part.id ở bước 1)
[4] GET  /exam-sets/{id}      → kiểm tra lại toàn bộ đề
[5] PATCH /exam-sets/{id}/toggle-active → mở cho học viên
```

---

## 1. Tạo đề — `POST /exam-sets`

BE **tự sinh sections + parts** theo `type` (FE không tạo tay). `type` ∈ `PART_PRACTICE | SKILL_FULL_SET | MOCK_TEST`.

**Request — PART_PRACTICE** (1 phần của 1 kỹ năng, cần `skillId` + `partNumber`):
```json
{ "title": "Luyện Listening P1 - Đề 01", "description": "Nghe thông tin chi tiết", "type": "PART_PRACTICE", "skillId": 2, "partNumber": 1 }
```
**Request — SKILL_FULL_SET** (đủ các phần 1 kỹ năng, chỉ `skillId`):
```json
{ "title": "Bộ đề Reading đầy đủ", "type": "SKILL_FULL_SET", "skillId": 3 }
```
**Request — MOCK_TEST** (đủ 5 kỹ năng, không skillId/partNumber):
```json
{ "title": "Thi thử APTIS - Đề 01", "type": "MOCK_TEST" }
```

**Response** (ví dụ PART_PRACTICE — trả về cây đã sinh; **lấy `sections[].parts[].id`** để gán câu hỏi):
```json
{
  "code": 201,
  "success": true,
  "message": "Tạo đề thi thành công",
  "messages": [],
  "data": {
    "id": 5,
    "title": "Luyện Listening P1 - Đề 01",
    "description": "Nghe thông tin chi tiết",
    "type": "PART_PRACTICE",
    "skillId": 2,
    "partNumber": 1,
    "isActive": true,
    "createdBy": 2,
    "createdAt": "2026-07-02T10:00:00.000Z",
    "deletedAt": null,
    "skill": { "id": 2, "name": "Listening", "totalParts": 4 },
    "sections": [
      {
        "id": 8,
        "examId": 5,
        "skillId": 2,
        "durationMinutes": 30,
        "orderIndex": 0,
        "skill": { "id": 2, "name": "Listening", "totalParts": 4 },
        "parts": [
          {
            "id": 12,
            "sectionId": 8,
            "partNumber": 1,
            "instruction": null,
            "audioUrl": null,
            "questions": []
          }
        ]
      }
    ]
  },
  "metaData": null
}
```
> - **SKILL_FULL_SET** (Reading): 1 section + **5 parts** (partNumber 1→5).
> - **MOCK_TEST**: **5 sections** (skill 1→5) + **19 parts** tổng.
> - `questions: []` vì chưa gán — làm ở mục 4.

**Lỗi validate mẫu:**
```json
{ "statusCode": 400, "message": "PART_PRACTICE cần cả skillId và partNumber", "error": "Bad Request" }
```

---

## 2. Danh sách đề — `GET /exam-sets`

Query: `?type=&skillId=&isActive=true&search=&page=1&limit=10`. Dùng cho màn quản lý đề.

**Response** (phân trang — mảng ở `data`, thông tin trang ở `metaData`):
```json
{
  "code": 200,
  "success": true,
  "message": "Lấy danh sách đề thi thành công",
  "messages": [],
  "data": [
    {
      "id": 5,
      "title": "Luyện Listening P1 - Đề 01",
      "type": "PART_PRACTICE",
      "skillId": 2,
      "partNumber": 1,
      "isActive": true,
      "createdAt": "2026-07-02T10:00:00.000Z",
      "skill": { "id": 2, "name": "Listening", "totalParts": 4 },
      "_count": { "sections": 1, "attempts": 0 }
    }
  ],
  "metaData": { "page": 1, "pageSize": 10, "total": 8, "totalPage": 1 }
}
```
> `_count.sections` = số kỹ năng trong đề; `_count.attempts` = số lượt thi thử đã nộp.

---

## 3. Chi tiết đề — `GET /exam-sets/{id}`

Trả **toàn bộ cây**: sections → parts → câu hỏi đã gán (kèm `extraConfig`). Dùng cho màn soạn đề / xem trước.

**Response `data` (rút gọn 1 part có câu hỏi):**
```json
{
  "id": 5,
  "title": "Luyện Listening P1 - Đề 01",
  "type": "PART_PRACTICE",
  "isActive": true,
  "skill": { "id": 2, "name": "Listening", "totalParts": 4 },
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
              "examPartId": 12,
              "questionId": 10,
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
                    { "content": "7:15", "is_correct": false },
                    { "content": "7:50", "is_correct": true },
                    { "content": "8:15", "is_correct": false }
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
> Đây là view cho ADMIN nên **có** đáp án (`is_correct`). Bản học viên làm bài (`GET /exams/{id}/take`) sẽ ẩn đáp án.

---

## 4. Gán câu hỏi vào part — `POST /exam-parts/{partId}/questions`

`partId` lấy từ response bước 1 (hoặc `GET /exam-sets/{id}`). `questionId` lấy từ `GET /questions?skillId=&partNumber=`.

**Request:**
```json
{
  "questions": [
    { "questionId": 10, "orderIndex": 0 },
    { "questionId": 11, "orderIndex": 1 }
  ]
}
```

**Response** (mảng câu hỏi đã gán trong part, kèm `question`):
```json
{
  "code": 201,
  "success": true,
  "message": "Gán câu hỏi thành công",
  "messages": [],
  "data": [
    {
      "examPartId": 12,
      "questionId": 10,
      "orderIndex": 0,
      "question": { "id": 10, "questionType": "MC", "content": "What time does the train leave?", "extraConfig": { "options": [] } }
    },
    {
      "examPartId": 12,
      "questionId": 11,
      "orderIndex": 1,
      "question": { "id": 11, "questionType": "MC", "content": "Where is the meeting?", "extraConfig": { "options": [] } }
    }
  ],
  "metaData": null
}
```

**Lỗi hay gặp** — gán câu **sai (skill, part)** so với part:
```json
{ "statusCode": 400, "message": "Câu hỏi không thuộc kỹ năng 2 phần 1: 11", "error": "Bad Request" }
```

---

## 5. Sắp lại thứ tự — `PATCH /exam-parts/{partId}/questions/reorder`

Gửi **TOÀN BỘ** câu hỏi của part với `orderIndex` mới.
**Request:**
```json
{
  "questions": [
    { "questionId": 11, "orderIndex": 0 },
    { "questionId": 10, "orderIndex": 1 }
  ]
}
```
**Response `data`:** mảng câu hỏi đã sắp lại (giống mục 4).

---

## 6. Gỡ câu hỏi — `DELETE /exam-parts/{partId}/questions/{questionId}`
Không body. **Response `data`:** `{ "message": "Đã gỡ câu hỏi khỏi part" }`.

---

## 7. Chỉnh section / part

### PATCH /exam-sections/{id} — đổi thời gian làm bài
**Request:**
```json
{ "durationMinutes": 35 }
```
**Response `data`:** section sau cập nhật `{ "id": 8, "durationMinutes": 35, ... }`.

### PATCH /exam-parts/{id} — instruction + audio chung part
Dùng cho Listening P3/P4 (audio dùng chung cả part). `audioUrl` lấy từ `POST /files/upload`.
**Request:**
```json
{ "instruction": "You will hear a conversation. Answer the questions.", "audioUrl": "https://.../audio/listening/p3/conv.mp3" }
```
**Response `data`:** part sau cập nhật.

---

## 8. Sửa / xóa đề

### PATCH /exam-sets/{id} — sửa tiêu đề/mô tả
```json
{ "title": "Tên mới", "description": "Mô tả mới" }
```

### PATCH /exam-sets/{id}/toggle-active — bật/tắt hiển thị
Không body. **Response `data`:** đề với `isActive` đã đảo. Đề `isActive=true` mới hiện ở `GET /exams` của học viên.

### DELETE /exam-sets/{id} — xóa mềm
Không body. **Response `data`:** `{ "message": "Đã xóa đề thi" }`.

---

## Enum
- `type`: `PART_PRACTICE` | `SKILL_FULL_SET` | `MOCK_TEST`

---

## Tóm tắt endpoint

| Method | Path | Quyền | Ghi chú |
| :-- | :-- | :-- | :-- |
| POST | `/exam-sets` | ADMIN/TEACHER | Tạo đề (tự sinh sections/parts) |
| GET | `/exam-sets` | ADMIN/TEACHER | List + lọc + phân trang |
| GET | `/exam-sets/{id}` | ADMIN/TEACHER | Chi tiết full tree |
| PATCH | `/exam-sets/{id}` | ADMIN/TEACHER | Sửa title/description |
| PATCH | `/exam-sets/{id}/toggle-active` | ADMIN/TEACHER | Bật/tắt hiển thị |
| DELETE | `/exam-sets/{id}` | ADMIN/TEACHER | Xóa mềm |
| PATCH | `/exam-sections/{id}` | ADMIN/TEACHER | Đổi durationMinutes |
| PATCH | `/exam-parts/{id}` | ADMIN/TEACHER | instruction/audioUrl |
| POST | `/exam-parts/{id}/questions` | ADMIN/TEACHER | Gán câu hỏi vào part |
| PATCH | `/exam-parts/{id}/questions/reorder` | ADMIN/TEACHER | Sắp lại thứ tự |
| DELETE | `/exam-parts/{id}/questions/{questionId}` | ADMIN/TEACHER | Gỡ câu hỏi |
