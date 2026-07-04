# FE Phase 3 — Question Bank & Files

> Nền tảng chung: base `/api/v1`; response bọc `{ code, success, message, data, metaData }`; header Bearer token.
> **Body chi tiết theo 19 dạng câu hỏi**: [QUESTION_SAMPLES.md](QUESTION_SAMPLES.md).

---

## 1. Upload file — `POST /files/upload` (ADMIN/TEACHER)

`multipart/form-data`, field **`file`**; query `folder_type=images|audio`, `prefix=` (tuỳ chọn).

**Response:**
```json
{
  "code": 201,
  "success": true,
  "message": "Upload thành công",
  "messages": [],
  "data": {
    "url": "https://ixloh....supabase.co/storage/v1/object/public/exam-online/images/reading/p5/abc.jpg",
    "key": "images/reading/p5/abc.jpg",
    "size": 84213,
    "mimeType": "image/jpeg"
  },
  "metaData": null
}
```
> Lấy `data.url` gán vào `mediaUrl` / `extraConfig.image_urls` / `audioUrl` khi tạo câu hỏi/đề.
> Ảnh jpeg/png/gif/webp ≤ 5MB; audio mp3/wav/m4a/ogg ≤ 20MB.

### DELETE /files?key=... hoặc ?url=...
**Response `data`:** `{ "key": "images/reading/p5/abc.jpg" }`

---

## 2. Question Bank (ADMIN/TEACHER)

### POST /questions
Tự suy `question_type` từ `(skillId, partNumber)`. **Request (ví dụ Grammar P1 - MC):**
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
**Response `data`:**
```json
{
  "id": 10,
  "skillId": 1,
  "partNumber": 1,
  "questionType": "MC",
  "content": "She ___ to school every day.",
  "mediaUrl": null,
  "extraConfig": { "options": [ { "content": "goes", "is_correct": true } ] },
  "createdBy": 2,
  "createdAt": "2026-07-02T10:00:00.000Z",
  "deletedAt": null
}
```
> Các dạng khác (WORD_BANK, ORDERING, SPEAKER_MATCH, HEADING_MATCH, ESSAY, RECORD) — body xem [QUESTION_SAMPLES.md](QUESTION_SAMPLES.md).

> **Ghi chú FE form (admin) — mô hình "gộp" → nhiều bản ghi:** một số form gom nhiều câu, khi lưu FE tách thành nhiều `POST /questions`:
> - **Grammar P1**: 25 câu MC → 25 bản ghi. **P2 Vocabulary**: mỗi task = 1 bản `WORD_BANK` (`task_variant` suy từ tab).
> - **Listening**: P1 (1 MC) / P4 (4 MC + `audio_group_id`) gắn `mediaUrl`; P2 → 1 `SPEAKER_MATCH`; P3 → 4 bản MC-agreement (`choice_kind=SPEAKER_AGREEMENT`).
> - **Reading P1 (gap-fill)**: admin nhập **1 ô đoạn văn** (`content` chứa `___(1)…(5)`) + **5 bộ đáp án** (`extraConfig.gaps`) — KHÔNG nhập 5 câu rời. 2 bài ORDERING → P2 & P3; 4 người/7 câu → P4 (`SPEAKER_MATCH`); 7 đoạn/8 heading → P5 (`HEADING_MATCH`).
> - **Writing P4**: sinh 2 bản (Informal + Formal) cùng `question_group_id` + `context`.
> - **Speaking**: mọi part là `RECORD`; ảnh (P2/P3/P4) đưa vào `extraConfig.image_urls` (số phần tử = `image_count`).

### GET /questions?skillId=3&partNumber=2&questionType=ORDERING&search=&page=1&limit=10
**Response:** mảng câu hỏi trong `data` + `metaData` phân trang. Dùng để lọc câu hỏi khi gán vào đề.

### GET /questions/{id}
**Response `data`:** 1 câu hỏi đầy đủ `extraConfig`.

### PATCH /questions/{id}
**Request:** (không đổi được skill/part/type)
```json
{ "content": "Nội dung mới", "extraConfig": { "options": [ { "content": "goes", "is_correct": true } ] } }
```

### DELETE /questions/{id}
Xóa mềm → `{ "message": "Đã xóa câu hỏi" }`.

---

## Lỗi validate mẫu (sai extra_config)
```json
{ "statusCode": 400, "message": "MC phải có đúng 1 đáp án đúng (is_correct = true)", "error": "Bad Request" }
```

---

## Tóm tắt endpoint

| Method | Path | Quyền | Ghi chú |
| :-- | :-- | :-- | :-- |
| POST | `/files/upload` | ADMIN/TEACHER | Upload ảnh/audio → trả url |
| DELETE | `/files` | ADMIN/TEACHER | Xóa file (key hoặc url) |
| POST | `/questions` | ADMIN/TEACHER | Tạo câu hỏi (tự suy type) |
| GET | `/questions` | ADMIN/TEACHER | Lọc skill/part/type + phân trang |
| GET | `/questions/{id}` | ADMIN/TEACHER | Chi tiết |
| PATCH | `/questions/{id}` | ADMIN/TEACHER | Sửa content/extraConfig |
| DELETE | `/questions/{id}` | ADMIN/TEACHER | Xóa mềm |
