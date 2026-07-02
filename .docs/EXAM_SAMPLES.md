# Kịch bản tạo đề & gán câu hỏi — Phase 4

> Body mẫu cho các endpoint `exam-sets` / `exam-sections` / `exam-parts`.
> **Trước khi chạy:** login (ADMIN/TEACHER) → Authorize; đã `pnpm db:seed` (có 5 skills); đã tạo sẵn câu hỏi trong ngân hàng (xem [QUESTION_SAMPLES.md](QUESTION_SAMPLES.md)).
> Base: `/api/v1`. Thứ tự làm: **Tạo đề → lấy part id → gán câu hỏi → bật active**.

---

## A. Tạo đề — `POST /exam-sets` (3 loại)

Chỉ gửi loại đề, backend **tự sinh sections + parts**. Không cần tạo section/part tay.

### A1. Đề theo phần — `PART_PRACTICE` (1 phần của 1 kỹ năng)
Cần `skillId` + `partNumber`. Ví dụ: luyện Listening Part 1 (skillId=2, part=1).
```json
{
  "title": "Luyện Listening Part 1 - Đề 01",
  "description": "Luyện nghe thông tin chi tiết",
  "type": "PART_PRACTICE",
  "skillId": 2,
  "partNumber": 1
}
```
→ Sinh: **1 section** (Listening) + **1 part** (Part 1).

### A2. Bộ đề 1 kỹ năng — `SKILL_FULL_SET` (đủ các phần)
Chỉ cần `skillId` (KHÔNG gửi partNumber). Ví dụ: bộ Reading đủ 5 phần (skillId=3).
```json
{
  "title": "Bộ đề Reading đầy đủ - Đề 01",
  "description": "Đủ 5 phần Reading",
  "type": "SKILL_FULL_SET",
  "skillId": 3
}
```
→ Sinh: **1 section** (Reading) + **5 parts** (Part 1→5, theo `total_parts`).

### A3. Đề thi thử — `MOCK_TEST` (đủ 5 kỹ năng)
KHÔNG gửi skillId/partNumber.
```json
{
  "title": "Thi thử APTIS đầy đủ - Đề 01",
  "description": "Full 5 kỹ năng",
  "type": "MOCK_TEST"
}
```
→ Sinh: **5 sections** (skill 1→5) + **19 parts** (2+4+5+4+4).

> Response trả về **cấu trúc đầy đủ** đã sinh (sections → parts). Ghi lại `id` của các **part** để gán câu hỏi ở bước B.

---

## B. Gán câu hỏi vào part

### B0. Lấy part id
`GET /exam-sets/{examId}` → tìm trong `data.sections[].parts[]` → copy `id` của part muốn gán.

### B1. Gán câu hỏi — `POST /exam-parts/{partId}/questions`
`questionId` lấy từ ngân hàng; câu hỏi **phải cùng (kỹ năng, phần)** với part (nếu không sẽ báo lỗi).
```json
{
  "questions": [
    { "questionId": 1, "orderIndex": 0 },
    { "questionId": 2, "orderIndex": 1 },
    { "questionId": 3, "orderIndex": 2 }
  ]
}
```

### B2. Sắp lại thứ tự — `PATCH /exam-parts/{partId}/questions/reorder`
Gửi TOÀN BỘ câu hỏi của part với `orderIndex` mới.
```json
{
  "questions": [
    { "questionId": 3, "orderIndex": 0 },
    { "questionId": 1, "orderIndex": 1 },
    { "questionId": 2, "orderIndex": 2 }
  ]
}
```

### B3. Gỡ câu hỏi — `DELETE /exam-parts/{partId}/questions/{questionId}`
Không cần body. Ví dụ: `DELETE /exam-parts/5/questions/2`.

---

## C. Chỉnh section / part

### C1. Đổi thời gian làm bài — `PATCH /exam-sections/{sectionId}`
```json
{ "durationMinutes": 35 }
```

### C2. Đặt instruction + audio chung part — `PATCH /exam-parts/{partId}`
(Dùng cho Listening P3/P4 audio dùng chung cả part. `audioUrl` lấy từ `POST /files/upload`.)
```json
{
  "instruction": "You will hear a conversation. Answer the questions.",
  "audioUrl": "https://ixloh....supabase.co/storage/v1/object/public/exam-online/audio/listening/p3/abc.mp3"
}
```

---

## D. Quản lý đề

| Việc | Endpoint |
| :-- | :-- |
| Danh sách (lọc) | `GET /exam-sets?type=MOCK_TEST&isActive=true&page=1&limit=10` |
| Chi tiết full tree | `GET /exam-sets/{id}` |
| Sửa tiêu đề/mô tả | `PATCH /exam-sets/{id}` → `{ "title": "...", "description": "..." }` |
| Bật/tắt cho học viên | `PATCH /exam-sets/{id}/toggle-active` (không body) |
| Xóa mềm | `DELETE /exam-sets/{id}` |

> Đề mới tạo mặc định `isActive = true`. Muốn ẩn khỏi học viên thì `toggle-active`.

---

## E. Kịch bản đầy đủ (end-to-end)

**Mục tiêu:** tạo 1 đề luyện Listening Part 1 và gán 3 câu hỏi.

1. **Tạo câu hỏi** (nếu chưa có): `POST /questions` 3 lần với body Listening Part 1 (xem QUESTION_SAMPLES.md) → ghi lại 3 `id` trả về (vd 10, 11, 12).

2. **Tạo đề:**
   ```
   POST /exam-sets
   { "title": "Luyện Listening P1 - Đề 01", "type": "PART_PRACTICE", "skillId": 2, "partNumber": 1 }
   ```
   → response có `sections[0].parts[0].id` (vd `partId = 7`).

3. **Gán câu hỏi vào part:**
   ```
   POST /exam-parts/7/questions
   { "questions": [
       { "questionId": 10, "orderIndex": 0 },
       { "questionId": 11, "orderIndex": 1 },
       { "questionId": 12, "orderIndex": 2 }
   ] }
   ```

4. **Kiểm tra:** `GET /exam-sets/{examId}` → thấy 3 câu trong `parts[0].questions` đúng thứ tự.

5. **(Tuỳ chọn) Bật hiển thị:** `PATCH /exam-sets/{examId}/toggle-active` (nếu cần ẩn/hiện).

---

## Lỗi hay gặp (validate)
- `PART_PRACTICE cần cả skillId và partNumber` — thiếu 1 trong 2.
- `SKILL_FULL_SET không dùng partNumber` — gửi thừa partNumber.
- `MOCK_TEST không dùng skillId/partNumber` — gửi thừa.
- `Kỹ năng X chỉ có N phần` — partNumber vượt total_parts.
- `Câu hỏi không thuộc kỹ năng X phần Y: [id...]` — gán câu sai (skill/part) vào part → chọn đúng câu cùng phần.
- `Câu hỏi không tồn tại hoặc đã bị xóa: [id...]` — questionId sai hoặc đã soft-delete.
