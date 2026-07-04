# FE — Luồng lưu Ảnh/Audio cho câu hỏi Listening & Speaking

> Áp dụng cho ADMIN/TEACHER khi soạn câu hỏi. Base `/api/v1`, header Bearer token.
> Nguyên tắc: **Upload trước → nhận `url` → gán url vào đúng field khi tạo câu hỏi/đề.**

---

## 1. Nguyên tắc chung (3 bước)

```
[1] POST /files/upload  ──►  { url, key, size, mimeType }
[2] Lấy data.url
[3] Gán url vào field phù hợp khi POST /questions (hoặc PATCH /exam-parts)
```

- **Listening = audio** → `folder_type=audio`, gán vào `mediaUrl` của câu hỏi (hoặc `audioUrl` của part).
- **Speaking = ảnh** → `folder_type=images`, gán vào `extraConfig.image_urls[]`.

**Upload — `POST /files/upload?folder_type=audio&prefix=listening/p1`** (multipart, field `file`):
```json
{
  "code": 201,
  "success": true,
  "message": "Upload thành công",
  "messages": [],
  "data": {
    "url": "https://ixloh....supabase.co/storage/v1/object/public/exam-online/audio/listening/p1/abc.mp3",
    "key": "audio/listening/p1/abc.mp3",
    "size": 340221,
    "mimeType": "audio/mp3"
  },
  "metaData": null
}
```

---

## 2. Bảng: media của từng part gán vào đâu

| Part | Media | folder_type | Gán vào |
| :-- | :-- | :-- | :-- |
| **Listening P1** (MC) | 1 audio / câu | audio | `mediaUrl` của câu hỏi |
| **Listening P2** (SPEAKER_MATCH) | 1 audio / bài (4 người) | audio | `mediaUrl` của câu hỏi |
| **Listening P3** (MC Man/Woman/Both) | 1 audio **chung cả part** | audio | `audioUrl` của part (`PATCH /exam-parts/{id}`) |
| **Listening P4** (MC monologue) | 2 audio (2 monologue) | audio | `mediaUrl` từng câu + `extraConfig.audio_group_id` gom 2 câu/1 audio |
| **Speaking P2** (RECORD) | 1 ảnh | images | `extraConfig.image_urls` (1 phần tử) |
| **Speaking P3** (RECORD) | 2 ảnh | images | `extraConfig.image_urls` (2 phần tử) |
| **Speaking P4** (RECORD) | 0–1 ảnh | images | `extraConfig.image_urls` (khớp `image_count`) |

---

## 3. LISTENING — gán audio

### 3.1. Part 1 — mỗi câu 1 audio
1. Upload: `POST /files/upload?folder_type=audio&prefix=listening/p1` → lấy `url`.
2. Tạo câu hỏi, đặt `url` vào **`mediaUrl`**:
```json
{
  "skillId": 2,
  "partNumber": 1,
  "content": "What time does the train leave?",
  "mediaUrl": "https://.../audio/listening/p1/abc.mp3",
  "extraConfig": {
    "options": [
      { "content": "7:15", "is_correct": false },
      { "content": "7:50", "is_correct": true },
      { "content": "8:15", "is_correct": false }
    ]
  }
}
```

### 3.2. Part 2 — 1 audio cho cả bài ghép người
Tương tự P1, đặt audio vào `mediaUrl` của câu SPEAKER_MATCH (xem cấu trúc extra_config ở [QUESTION_SAMPLES.md](QUESTION_SAMPLES.md)).

### 3.3. Part 3 — 1 audio DÙNG CHUNG cả part
Audio không nằm ở câu hỏi mà ở **part**. Sau khi tạo đề (part đã sinh), gán audio vào part:
1. Upload audio (`prefix=listening/p3`) → `url`.
2. `PATCH /exam-parts/{partId}`:
```json
{ "instruction": "Listen and choose Man / Woman / Both.", "audioUrl": "https://.../audio/listening/p3/conv.mp3" }
```
Các câu hỏi P3 không cần `mediaUrl`.

### 3.4. Part 4 — 2 monologue, mỗi cái 2 câu
Mỗi monologue 1 audio, 2 câu dùng chung → đặt cùng `mediaUrl` + cùng `audio_group_id`:
```json
{
  "skillId": 2,
  "partNumber": 4,
  "content": "What is the main purpose of the lecture?",
  "mediaUrl": "https://.../audio/listening/p4/monologue1.mp3",
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
> Câu thứ 2 của cùng monologue: **cùng `mediaUrl` + `audio_group_id: "g1"`**. Monologue 2 dùng `audio_group_id: "g2"` + audio khác.

---

## 4. SPEAKING — gán ảnh (`extraConfig.image_urls`)

> ⚠️ Số phần tử `image_urls` **phải khớp** `image_count`, nếu không sẽ báo lỗi.

### 4.1. Part 2 — 1 ảnh
1. Upload: `POST /files/upload?folder_type=images&prefix=speaking/p2` → `url`.
2. Tạo câu hỏi:
```json
{
  "skillId": 5,
  "partNumber": 2,
  "content": "Describe this picture.",
  "extraConfig": {
    "response_time_seconds": 45,
    "prep_time_seconds": 0,
    "image_count": 1,
    "image_urls": ["https://.../images/speaking/p2/pic.jpg"]
  }
}
```

### 4.2. Part 3 — 2 ảnh
Upload **2 lần** → 2 url → bỏ vào mảng:
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
      "https://.../images/speaking/p3/pic-a.jpg",
      "https://.../images/speaking/p3/pic-b.jpg"
    ]
  }
}
```

---

## 5. Ví dụ code (axios)

```js
// Hàm upload chung -> trả về url
async function uploadFile(file, folderType, prefix) {
  const form = new FormData();
  form.append('file', file); // file từ <input type="file">
  const { data } = await api.post(
    `/files/upload?folder_type=${folderType}&prefix=${encodeURIComponent(prefix)}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data.url; // URL công khai
}

// Speaking P3: upload 2 ảnh rồi tạo câu hỏi
const url1 = await uploadFile(fileA, 'images', 'speaking/p3');
const url2 = await uploadFile(fileB, 'images', 'speaking/p3');
await api.post('/questions', {
  skillId: 5,
  partNumber: 3,
  content: 'Compare these two pictures.',
  extraConfig: {
    response_time_seconds: 45,
    prep_time_seconds: 0,
    image_count: 2,
    image_urls: [url1, url2],
  },
});

// Listening P1: upload audio rồi tạo câu hỏi
const audioUrl = await uploadFile(audioFile, 'audio', 'listening/p1');
await api.post('/questions', {
  skillId: 2,
  partNumber: 1,
  content: 'What time does the train leave?',
  mediaUrl: audioUrl,
  extraConfig: {
    options: [
      { content: '7:15', is_correct: false },
      { content: '7:50', is_correct: true },
      { content: '8:15', is_correct: false },
    ],
  },
});
```

---

## 6. Lưu ý
- **Ảnh**: jpeg/png/gif/webp ≤ 5MB. **Audio**: mp3/wav/m4a/ogg ≤ 20MB. Sai loại/quá nặng → 400.
- `prefix` chỉ để phân thư mục cho dễ quản lý (tuỳ chọn) — không ảnh hưởng logic.
- Xóa file cũ khi thay: `DELETE /files?url=<url_cũ>`.
- Audio Listening P3/P4: P3 dùng chung part (`audioUrl`), P4 gom theo `audio_group_id` — đừng nhầm 2 cơ chế.

---

## 7. Tóm tắt endpoint liên quan

| Method | Path | Quyền | Ghi chú |
| :-- | :-- | :-- | :-- |
| POST | `/files/upload?folder_type=&prefix=` | ADMIN/TEACHER | Upload ảnh/audio → trả `url` |
| DELETE | `/files?key=` hoặc `?url=` | ADMIN/TEACHER | Xóa file |
| POST | `/questions` | ADMIN/TEACHER | Gán `mediaUrl` / `extraConfig.image_urls` |
| PATCH | `/exam-parts/{id}` | ADMIN/TEACHER | Gán `audioUrl` chung part (Listening P3) |
