# Tiến độ học tập & Streak — hướng dẫn nối FE

Tài liệu này giải thích **tiến độ** (đã làm bao nhiêu câu, % hoàn thành đề) và **streak** (chuỗi ngày học liên tiếp): lấy ở API nào, khi nào tăng, cách hiển thị.

> Base URL: `http://localhost:3000/api/v1`. Mọi endpoint dưới đây cần **Bearer token** (role `STUDENT`). Response bọc trong `{ code, success, message, data, metaData }` như toàn hệ thống — phần mô tả bên dưới nói về `data`.

---

## 1. Mô hình dữ liệu (hiểu trước khi nối)

Tiến độ được lưu **theo từng đề** trong bảng `student_progress`, khóa `(studentId, examId, skillId, partNumber)`. Mỗi dòng giữ:
- `answered` — số câu học viên **thực sự làm** ở (đề, kỹ năng, phần) đó.
- `total` — **tổng số câu** của (đề, kỹ năng, phần) đó trong đề.

Từ bảng này BE dựng **2 view** cho FE:

| View | Endpoint | Ý nghĩa |
| :-- | :-- | :-- |
| **% hoàn thành theo TỪNG ĐỀ** | `GET /progress/exams/me` | `answered/total` gộp theo `examId` → % làm xong mỗi đề |
| **Tích lũy theo KỸ NĂNG/PHẦN** | `GET /progress/me` | `answered/total` gộp theo `(skill, part)` qua mọi đề → dashboard "đã luyện bao nhiêu" |

Điểm mấu chốt:
- ✅ **Tiến độ gắn với `examId`.** Đề mới có `id` khác → chưa có dòng nào → **tự động 0%**. Không còn hiện tượng "đề mới mà đã 100%".
- **Chỉ đếm `answered` cho câu học viên THỰC SỰ trả lời** (câu bỏ trống không tính vào `answered` nhưng vẫn nằm trong `total`).
- **Làm lại đề**: `answered` giữ **giá trị cao nhất** từ trước tới nay (nộp lại ít câu hơn không làm tụt %); `total` luôn theo đề hiện tại.
- **Cả 3 loại đề** (PART_PRACTICE / SKILL_FULL_SET / MOCK_TEST) đều ghi tiến độ → đề nào cũng có %.
- **Xóa đề** → BE xóa luôn các dòng tiến độ của đề đó; tạo lại đề mới bắt đầu từ 0%.

5 kỹ năng cố định (từ seed) — dùng `totalParts` khi muốn dựng khung lưới:

| skillId | name | totalParts |
| :--: | :-- | :--: |
| 1 | Grammar & Vocabulary | 2 |
| 2 | Listening | 4 |
| 3 | Reading | 5 |
| 4 | Writing | 4 |
| 5 | Speaking | 4 |

---

## 2. Cách TĂNG tiến độ (không có API riêng)

**Không có endpoint riêng để tăng tiến độ.** Tiến độ tự cập nhật **bên trong luồng nộp bài**:

```
POST /exams/:id/submit
   └─ BE chấm điểm
   └─ upsert student_progress theo (examId, skill, part):
        total    = tổng câu của part trong đề
        answered = max(giá trị cũ, số câu thực sự làm lần này)
   └─ cập nhật streak (touchStreak)
```

FE **không cần gọi gì thêm** — cứ nộp bài, BE lo tiến độ + streak. Chi tiết luồng submit ở [EXAM_SUBMIT_SAMPLES.md](EXAM_SUBMIT_SAMPLES.md).

Tóm tắt ai làm gì:

| Loại đề | Ghi `student_progress`? | Ghi `exam_attempts`? | Cập nhật streak? |
| :-- | :--: | :--: | :--: |
| PART_PRACTICE | ✅ | ❌ | ✅ |
| SKILL_FULL_SET | ✅ | ✅ (đánh dấu đã làm) | ✅ |
| MOCK_TEST | ✅ | ✅ (kèm điểm, tính AVG) | ✅ |

---

## 3. Lấy % hoàn thành theo TỪNG ĐỀ

### `GET /progress/exams/me`
Trả % hoàn thành mỗi đề của học viên đang đăng nhập.

**Response `data`** (mảng, mỗi đề 1 dòng):
```json
[
  { "examId": 12, "answered": 15, "total": 15, "percent": 100 },
  { "examId": 18, "answered": 6,  "total": 20, "percent": 30 }
]
```
- `percent` = `round(answered / total * 100)`.
- **Đề chưa từng làm sẽ KHÔNG có dòng** → FE coi là `0%`. Đây chính là lý do đề mới tạo luôn hiện 0%.
- Dùng cho: thanh % trên card đề, nhãn "Hoàn thành 30%".

### Ví dụ ghép với danh sách đề (pseudo-code FE)
```ts
const exams = await get('/exams');                 // danh sách đề đang mở
const prog  = await get('/progress/exams/me');     // [{examId, answered, total, percent}]
const byId  = new Map(prog.map(p => [p.examId, p.percent]));

const cards = exams.result.map(e => ({
  ...e,
  percent: byId.get(e.id) ?? 0,   // đề chưa làm -> 0%
}));
```

---

## 4. Lấy tiến độ tích lũy theo KỸ NĂNG/PHẦN

### `GET /progress/me`
Dashboard "đã luyện bao nhiêu câu ở mỗi kỹ năng/phần", gộp qua **mọi đề**.

**Response `data`** (mảng, sắp xếp theo `skillId` rồi `partNumber`):
```json
[
  { "skillId": 2, "partNumber": 1, "answered": 8,  "total": 10 },
  { "skillId": 2, "partNumber": 3, "answered": 5,  "total": 5 },
  { "skillId": 3, "partNumber": 1, "answered": 12, "total": 15 }
]
```
- `answered` = tổng câu đã làm ở part đó qua mọi đề; `total` = tổng câu của part đó qua mọi đề đã đụng tới.
- **Part chưa từng luyện KHÔNG có dòng** → FE coi là 0.
- Muốn dựng đủ lưới "kỹ năng × part", ghép với `GET /skills` (`totalParts`) rồi fill 0 cho part thiếu:

```ts
const skills = await get('/skills');      // [{id, name, totalParts}]
const prog   = await get('/progress/me'); // [{skillId, partNumber, answered, total}]
const map = new Map(prog.map(p => [`${p.skillId}-${p.partNumber}`, p]));

const grid = skills.map(s => ({
  skillId: s.id,
  name: s.name,
  parts: Array.from({ length: s.totalParts }, (_, i) => {
    const partNumber = i + 1;
    const row = map.get(`${s.id}-${partNumber}`);
    return { partNumber, answered: row?.answered ?? 0, total: row?.total ?? 0 };
  }),
}));
```

> Lưu ý: view này là **tích lũy qua mọi đề**, không phải % của 1 đề. Muốn % của một đề cụ thể thì dùng `/progress/exams/me` (mục 3).

---

## 5. Lấy streak

### `GET /streaks/me`
```json
{
  "studentId": 12,
  "currentStreak": 5,
  "longestStreak": 11,
  "lastActivity": "2026-07-10"
}
```
- `currentStreak`: số ngày học liên tiếp tính đến `lastActivity`.
- `longestStreak`: kỷ lục dài nhất từ trước tới nay.
- `lastActivity`: ngày hoạt động gần nhất (chỉ tính theo NGÀY, không giờ).
- Học viên **chưa từng học** → `{ currentStreak: 0, longestStreak: 0, lastActivity: null }` (không lỗi 404).

Quy tắc BE cập nhật (tham khảo, FE không cần tự tính):
- Submit lần đầu trong ngày → hôm qua có học: `+1`; cách quãng > 1 ngày: reset về `1`.
- Submit nhiều lần cùng ngày → streak **không đổi**.

---

## 6. Bảng endpoint tóm tắt

| Method | Path | Role | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/progress/exams/me` | STUDENT | **% hoàn thành theo từng đề** (đề chưa làm = 0%, không xuất hiện) |
| GET | `/progress/me` | STUDENT | Tiến độ tích lũy theo (skill, part) — gộp mọi đề |
| GET | `/streaks/me` | STUDENT | Chuỗi ngày học liên tiếp |
| GET | `/skills` | (đăng nhập) | 5 kỹ năng + `totalParts` (dựng khung lưới) |
| GET | `/attempts/me/done` | STUDENT | Mảng `examId` **đã làm** (SKILL_FULL_SET & MOCK_TEST) — nhãn "đã làm/chưa làm" |
| POST | `/exams/:id/submit` | STUDENT | Nộp bài — **nơi tiến độ & streak tự cập nhật** |

Không có `POST /progress` hay `PATCH /progress` — mọi thay đổi tiến độ đi qua luồng submit.

---

## 7. Dùng view nào cho mục đích gì

| Muốn hiển thị | Dùng |
| :-- | :-- |
| **% hoàn thành 1 đề** (thanh tiến trình trên card đề) | `GET /progress/exams/me` → `percent` theo `examId` |
| Tổng đã luyện mỗi kỹ năng/phần (dashboard học tập) | `GET /progress/me` |
| Nhãn **"đã làm / chưa làm"** một đề | `GET /attempts/me/done` (chỉ SKILL_FULL_SET & MOCK_TEST) |
| Streak / lịch học | `GET /streaks/me` |

**Về câu hỏi "xóa đề tạo lại phải về 0%":** đã xử lý ở BE.
- Tiến độ gắn `examId` → đề mới (id khác) chưa có dòng → `/progress/exams/me` không trả về nó → FE hiện 0%.
- Khi xóa đề, BE **xóa luôn** các dòng `student_progress` của đề đó, nên dashboard theo kỹ năng cũng không còn cộng phần của đề đã xóa.
