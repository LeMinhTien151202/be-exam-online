# FE nối API — Trang Tổng quan Admin (Dashboard)

> Backend đã hiện thực đầy đủ 5 endpoint theo `API_ADMIN_DASHBOARD.md`.
> **Base path:** `/api/v1` · Mọi response bọc envelope `{ code, success, message, messages, data, metaData }` — bảng dưới chỉ mô tả phần trong `data`.
> **Auth:** cần Bearer token; các endpoint gắn `@Roles('ADMIN')` (RolesGuard hiện đang TẮT toàn cục nên thực tế mọi user đăng nhập vẫn gọi được — sẽ siết lại khi bật guard).
> **Skill:** 1=Grammar & Vocabulary, 2=Listening, 3=Reading, 4=Writing, 5=Speaking.

---

## Tóm tắt endpoint

| # | Method | Path | Dùng cho khối UI | Query |
| :- | :- | :-- | :-- | :-- |
| 1 | GET | `/admin/dashboard/summary` | 5 KPI + bar câu hỏi + progress đề + pie kỹ năng | — |
| 2 | GET | `/admin/dashboard/activity` | Area chart hoạt động 30 ngày | `days` (30), `bucket` (`day`\|`week`) |
| 3 | GET | `/admin/dashboard/recent-students` | Bảng học viên mới | `limit` (5) |
| 4 | GET | `/admin/dashboard/recent-tests` | Bảng bài làm mới nhất | `limit` (5) |
| 5 | GET | `/admin/dashboard/activities` | Timeline hoạt động gần đây | `limit` (5) |

> Khối #1, #2, #3, #5 (bar/progress/pie) đều nằm trong `summary` → tải dashboard gọi **1 lần** `summary`, rồi lazy-load 3 danh sách còn lại.

---

## 1. `GET /admin/dashboard/summary`

**`data`:**
```jsonc
{
  "kpis": {
    "totalStudents":  { "value": 128, "trendPercent": 12.5, "trendType": "up" },
    "totalQuestions": { "value": 1250, "trendType": "neutral" },
    "dailyActivity":  { "value": 34, "trendPercent": 6.2, "trendType": "up" },
    "totalExams":     { "value": 45, "trendType": "neutral" },
    "completedTests": { "value": 328, "trendPercent": 8.0, "trendType": "up" },
    "pendingGrading": { "value": 0 }
  },
  "questionStats": {
    "total": 1250,
    "skills": [
      { "skillId": 1, "name": "Grammar & Vocabulary", "count": 320 },
      { "skillId": 2, "name": "Listening", "count": 280 },
      { "skillId": 3, "name": "Reading", "count": 300 },
      { "skillId": 4, "name": "Writing", "count": 170 },
      { "skillId": 5, "name": "Speaking", "count": 180 }
    ]
  },
  "examCounts": {
    "total": 45,
    "types": [
      { "type": "PART_PRACTICE",  "name": "Theo phần",  "count": 20 },
      { "type": "SKILL_FULL_SET", "name": "Theo bộ đề", "count": 15 },
      { "type": "MOCK_TEST",      "name": "Đề thi thử", "count": 10 }
    ]
  },
  "skillDistribution": [
    { "skillId": 1, "name": "Grammar & Vocabulary", "value": 35 },
    { "skillId": 3, "name": "Reading", "value": 25 },
    { "skillId": 2, "name": "Listening", "value": 20 },
    { "skillId": 5, "name": "Speaking", "value": 10 },
    { "skillId": 4, "name": "Writing", "value": 10 }
  ]
}
```

**Cách tính (nguồn thật):**
| Trường | Nguồn | Ghi chú |
| :-- | :-- | :-- |
| `totalStudents` | `users` role=STUDENT | trend = số HV tạo hôm nay vs hôm qua |
| `totalQuestions` + `questionStats` | `question_bank` (deletedAt null) | count + groupBy skillId; đủ 5 skill kể cả 0 câu; `trendType: neutral` |
| `dailyActivity` | `student_progress` | số **học viên khác nhau** có cập nhật tiến độ hôm nay; trend vs hôm qua |
| `totalExams` + `examCounts` | `exam_sets` (deletedAt null) | count + groupBy `type`; đủ 3 loại; `trendType: neutral` |
| `completedTests` | `exam_attempts` | tổng lượt nộp đã lưu (MOCK_TEST + SKILL_FULL_SET); trend hôm nay vs hôm qua |
| `pendingGrading` | — | **luôn = 0**: AI (Gemini) chấm đồng bộ ngay khi nộp, BE không lưu hàng đợi chờ chấm |
| `skillDistribution` | `student_progress` | % theo `sum(answered)` mỗi skill, làm tròn ép tổng = 100 |

- `trendType`: `up | down | neutral`. Không có kỳ trước (previous=0) và hiện tại>0 → `up 100%`; cả hai = 0 → `neutral` (bỏ `trendPercent`).
- `pendingMaterials` **không trả** (chưa có nghiệp vụ duyệt tài liệu) → FE ẩn thẻ đó.

---

## 2. `GET /admin/dashboard/activity`

**Query:** `days` (int, mặc định 30, tối đa 365) · `bucket` = `day` | `week` (mặc định `day`).

**`data`:**
```jsonc
{
  "range": { "from": "2026-06-12", "to": "2026-07-11", "bucket": "day" },
  "series": [
    { "date": "2026-06-12", "label": "Ngày 1", "grammar": 4, "reading": 2, "listening": 3, "speaking": 1, "writing": 0 },
    { "date": "2026-06-13", "label": "Ngày 2", "grammar": 0, "reading": 0, "listening": 0, "speaking": 0, "writing": 0 }
    // ... đủ mọi mốc trong khoảng, điền 0 khi không có dữ liệu
  ]
}
```
- **Nguồn:** `student_progress` (`updatedAt` + `skillId`) — đếm số lượt luyện theo skill trong mỗi mốc. Trả **đủ mọi ngày/tuần** (điền 0) để đồ thị liền mạch.
- `bucket=week` gom theo tuần (bắt đầu Thứ 2), `label` = `Tuần N`.
- Màu do FE quyết định (BE không trả `color`).
- ⚠️ **Giới hạn dữ liệu:** `student_progress` lưu theo **upsert** (mỗi (HV, đề, skill, part) 1 dòng, `updatedAt` = lần cập nhật gần nhất) nên chuỗi phản ánh "lần luyện gần nhất theo skill", chưa phải log lịch sử đầy đủ. Muốn chính xác tuyệt đối cho biểu đồ theo thời gian cần thêm bảng `activity_logs` (xem mục "Nâng cấp" cuối file).

---

## 3. `GET /admin/dashboard/recent-students`

**Query:** `limit` (int, mặc định 5, tối đa 50).

**`data`** (mảng):
```jsonc
[
  {
    "id": 101,
    "fullName": "Nguyễn Văn A",
    "email": "nva@gmail.com",
    "registeredAt": "2026-07-10T08:12:00.000Z",
    "status": "ACTIVE"
  }
]
```
- **Nguồn:** `users` + `user_profiles`, `role=STUDENT order by createdAt desc`.
- `fullName` lấy từ profile; nếu học viên chưa có profile → fallback bằng `email`.
- `status`: chỉ `ACTIVE | LOCKED` (schema không có `INACTIVE`).

---

## 4. `GET /admin/dashboard/recent-tests`

**Query:** `limit` (int, mặc định 5, tối đa 50).

**`data`** (mảng):
```jsonc
[
  {
    "resultId": 5001,
    "studentName": "Nguyễn Văn A",
    "skillId": 3,
    "skillName": "Reading",
    "score": 45,
    "maxScore": 100,
    "status": "GRADED",
    "durationSeconds": 0
  }
]
```
- **Nguồn:** `exam_attempts` join `users`/`user_profiles` + `exam_sets`/`skills`, `order by finishedAt desc`.
- Chỉ đề **MOCK_TEST** và **SKILL_FULL_SET** tạo `exam_attempts` (PART_PRACTICE không lưu attempt → không xuất hiện ở đây).
- `score` = điểm tổng **0–100** (đã tính cả AI). `maxScore` luôn = 100.
- `skillId/skillName`: đề MOCK_TEST không gắn skill → `skillId: null`, `skillName: "Tổng hợp"`.
- `status` luôn `GRADED` (chấm đồng bộ khi nộp — không có `PENDING_GRADING` lưu lại).
- `durationSeconds`: hiện = 0 vì BE chưa lưu mốc bắt đầu làm bài (`startedAt = finishedAt` lúc nộp). FE nên ẩn/hiện "—" khi = 0 cho tới khi có nghiệp vụ bấm giờ.

---

## 5. `GET /admin/dashboard/activities`

**Query:** `limit` (int, mặc định 5, tối đa 50) — số item **cuối cùng** sau khi trộn mọi nguồn.

**`data`** (mảng, đã sắp `createdAt` giảm dần):
```jsonc
[
  { "id": 5001, "type": "EXAM_COMPLETED", "message": "Học viên Nguyễn Văn A đã hoàn thành \"Aptis Full Test #3\"", "createdAt": "2026-07-11T09:50:00.000Z" },
  { "id": 88,   "type": "QUESTION_ADDED", "message": "Thêm câu hỏi Listening vào ngân hàng", "createdAt": "2026-07-11T09:10:00.000Z" },
  { "id": 12,   "type": "EXAM_CREATED",   "message": "Tạo bộ đề mới \"Reading Part 1 luyện tập\"", "createdAt": "2026-07-11T08:00:00.000Z" },
  { "id": 30,   "type": "NOTIFICATION_SENT", "message": "Gửi thông báo \"Bảo trì hệ thống\"", "createdAt": "2026-07-10T20:00:00.000Z" }
]
```
- **Nguồn (tổng hợp thời gian thực, không cần bảng log):** trộn N bản ghi mới nhất từ `exam_attempts` (EXAM_COMPLETED), `question_bank` (QUESTION_ADDED), `exam_sets` (EXAM_CREATED), `notifications` (NOTIFICATION_SENT), rồi sắp theo thời gian và cắt `limit`.
- `STREAK_MILESTONE` **chưa phát sinh** (không có sự kiện lưu lại) — FE vẫn nên khai báo type trong union để chờ.
- `message` do BE dựng sẵn tiếng Việt; `createdAt` ISO → FE tự tính "x phút trước".
- Màu chấm timeline FE tự map theo `type` (green/blue/cyan/orange…).
- ⚠️ `id` chỉ **duy nhất trong cùng `type`** (id gốc của từng bảng), có thể trùng giữa các type khác nhau → FE dùng key = `type + '-' + id`.

---

## Interface TypeScript (khớp response thật)

```ts
export type TrendType = 'up' | 'down' | 'neutral';
export interface KpiValue { value: number; trendPercent?: number; trendType?: TrendType; }

export interface DashboardSummary {
  kpis: {
    totalStudents: KpiValue;
    totalQuestions: KpiValue;
    dailyActivity: KpiValue;
    totalExams: KpiValue;
    completedTests: KpiValue;
    pendingGrading: KpiValue;      // hiện luôn { value: 0 }
  };
  questionStats: { total: number; skills: { skillId: number; name: string; count: number }[] };
  examCounts: {
    total: number;
    types: { type: 'PART_PRACTICE' | 'SKILL_FULL_SET' | 'MOCK_TEST'; name: string; count: number }[];
  };
  skillDistribution: { skillId: number; name: string; value: number }[];
}

export interface ActivitySeriesPoint {
  date: string; label: string;
  grammar: number; reading: number; listening: number; speaking: number; writing: number;
}
export interface DashboardActivity {
  range: { from: string; to: string; bucket: 'day' | 'week' };
  series: ActivitySeriesPoint[];
}

export interface RecentStudent {
  id: number; fullName: string; email: string;
  registeredAt: string; status: 'ACTIVE' | 'LOCKED';
}

export interface RecentTest {
  resultId: number; studentName: string;
  skillId: number | null; skillName: string;
  score: number; maxScore: number;
  status: 'GRADED'; durationSeconds: number;
}

export type ActivityType =
  | 'EXAM_COMPLETED' | 'QUESTION_ADDED' | 'EXAM_CREATED'
  | 'NOTIFICATION_SENT' | 'STREAK_MILESTONE';
export interface DashboardActivityItem {
  id: number; type: ActivityType; message: string; createdAt: string;
}
```

---

## Trả lời các câu hỏi backend cần xác nhận (mục cuối `API_ADMIN_DASHBOARD.md`)

1. **Enum `exam_sets.type`**: đã có sẵn cột `type` = `PART_PRACTICE | SKILL_FULL_SET | MOCK_TEST` (KHÁC với `PART/SET/MOCK` trong bản nháp). BE trả đúng enum này kèm `name` tiếng Việt.
2. **`skillDistribution`**: tính theo **số câu đã luyện** (`sum(answered)` trong `student_progress`); BE trả sẵn **%** đã làm tròn (tổng = 100).
3. **Bảng `activity_logs`**: CHƯA có. Endpoint `activities` hiện **tổng hợp trực tiếp** từ các bảng nghiệp vụ (đủ dùng cho MVP). Cần log audit chuẩn thì bổ sung sau (xem dưới).
4. **Màu biểu đồ**: FE quyết định — BE không trả `color`.
5. **Học viên mới**: dùng endpoint **riêng** `GET /admin/dashboard/recent-students` (không tái dùng `/users`) để đóng gói sẵn `fullName/status`.

---

## Nâng cấp tương lai (khi cần chính xác hơn)

Để `activity` (area chart) và `activities` (timeline) có dữ liệu lịch sử chuẩn + thêm `dailyActivity` chính xác + `STREAK_MILESTONE`, nên thêm bảng `activity_logs(id, type, actorId, skillId?, message, createdAt)` và ghi 1 dòng ở các luồng: nộp bài, tạo câu hỏi, tạo đề, gửi thông báo, đạt mốc streak. Khi đó đổi nguồn 2 endpoint trên sang bảng này, phần còn lại của dashboard giữ nguyên.

> Ngoài ra `durationSeconds` sẽ có giá trị thật khi thêm nghiệp vụ "bắt đầu làm bài" (lưu `startedAt` lúc mở đề thay vì lúc nộp).
