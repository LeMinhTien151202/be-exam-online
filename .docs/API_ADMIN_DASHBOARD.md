# Yêu cầu API — Trang Tổng quan Admin (Dashboard)

> **Mục tiêu:** thay toàn bộ dữ liệu mock ở `src/apps/admin/pages/admin-dashboard/services/data.ts` + `hook/useDashboard.ts` bằng dữ liệu thật từ backend.
> **Quy ước chung** (theo `API_PLAN.md`): base path `/api/v1`, mọi response đi qua envelope `{ code, success, message, messages, data, metaData }` — phần mô tả dưới đây chỉ ghi nội dung trong `data`. JSON dùng **camelCase**. Toàn bộ endpoint yêu cầu quyền **ADMIN** (`@Roles('ADMIN')`).
> **Quy ước skill:** `skillId` — 1=Grammar (Ngữ pháp & Từ vựng), 2=Listening (Nghe), 3=Reading (Đọc), 4=Writing (Viết), 5=Speaking (Nói).

---

## Tổng quan các khối trên dashboard → nguồn dữ liệu

| # | Khối UI | Endpoint đề xuất |
| :- | :-- | :-- |
| 1 | 5 thẻ KPI (học viên, câu hỏi, hoạt động, bộ đề, bài hoàn thành) | `GET /admin/dashboard/summary` |
| 2 | "Phân bổ Ngân hàng câu hỏi" (bar) | `GET /admin/dashboard/summary` → `questionStats` |
| 3 | "Cấu trúc Bộ đề thi" (progress) | `GET /admin/dashboard/summary` → `examCounts` |
| 4 | "Học viên hoạt động 30 ngày qua" (area chart) | `GET /admin/dashboard/activity` |
| 5 | "Phân bổ kỹ năng ôn luyện" (pie) | `GET /admin/dashboard/summary` → `skillDistribution` |
| 6 | "Học viên đăng ký mới" (table) | `GET /admin/dashboard/recent-students` |
| 7 | "Bài làm mới nhất" (table) | `GET /admin/dashboard/recent-tests` |
| 8 | "Hoạt động gần đây" (timeline) | `GET /admin/dashboard/activities` |

> Có thể gộp #1–#3–#5 vào **một** endpoint `summary` để dashboard chỉ gọi 1 lần khi tải (khuyến nghị). Các danh sách (#6–#8) tách riêng để phân trang / lazy-load.

---

## 1. `GET /admin/dashboard/summary`

Trả các chỉ số tổng hợp + phân bổ cho phần đầu dashboard. Nên cache ngắn (30–60s).

**Query (tùy chọn):** không bắt buộc. Có thể nhận `?compareRange=day` để chọn mốc so sánh cho `trend` (mặc định so với hôm qua).

**Response `data`:**
```jsonc
{
  "kpis": {
    "totalStudents":   { "value": 14820, "trendPercent": 12.0, "trendType": "up" },
    "totalQuestions":  { "value": 1250,  "trendType": "neutral" },
    "dailyActivity":   { "value": 1245,  "trendPercent": 5.4,  "trendType": "up" },
    "totalExams":      { "value": 45,    "trendType": "neutral" },
    "completedTests":  { "value": 328,   "trendPercent": 8.2,  "trendType": "up" },
    "pendingGrading":  { "value": 42 },     // bài Writing/Speaking chờ chấm
    "pendingMaterials":{ "value": 8 }       // tài liệu chờ duyệt (nếu có nghiệp vụ)
  },
  "questionStats": {
    "total": 1250,
    "skills": [
      { "skillId": 1, "name": "Ngữ pháp & Từ vựng", "count": 320 },
      { "skillId": 2, "name": "Nghe",  "count": 280 },
      { "skillId": 3, "name": "Đọc",   "count": 300 },
      { "skillId": 4, "name": "Viết",  "count": 170 },
      { "skillId": 5, "name": "Nói",   "count": 180 }
    ]
  },
  "examCounts": {
    "total": 45,
    "types": [
      { "type": "PART",     "name": "Theo phần",  "count": 20 },
      { "type": "SET",      "name": "Theo bộ đề", "count": 15 },
      { "type": "MOCK",     "name": "Đề thi thử", "count": 10 }
    ]
  },
  "skillDistribution": [
    { "skillId": 1, "name": "Grammar",   "value": 35 },  // % lượt luyện tập, tổng ~100
    { "skillId": 3, "name": "Reading",   "value": 25 },
    { "skillId": 2, "name": "Listening", "value": 20 },
    { "skillId": 5, "name": "Speaking",  "value": 10 },
    { "skillId": 4, "name": "Writing",   "value": 10 }
  ]
}
```

**Cách tính / nguồn dữ liệu:**
| Trường | Nguồn (bảng) | Ghi chú |
| :-- | :-- | :-- |
| `totalStudents` | `users` | `count(role = STUDENT)`. `trendPercent` = so số học viên tạo hôm nay vs hôm qua. |
| `totalQuestions` + `questionStats` | `question_bank` | `count` toàn bộ + `group by skillId` (lọc `deletedAt IS NULL`). |
| `dailyActivity` | `exam_attempts`/`exam_results` hoặc bảng log hoạt động | Số lượt hoạt động trong ngày hiện tại. |
| `totalExams` + `examCounts` | `exam_sets` | `count` + `group by type` (lọc `deletedAt IS NULL`). Cần thống nhất enum `type` (`PART`/`SET`/`MOCK`). |
| `completedTests` | `exam_results` | Số bài có trạng thái hoàn thành. |
| `pendingGrading` | `exam_results` | Bài Writing/Speaking `status = PENDING_GRADING`. |
| `skillDistribution` | `exam_results`/attempts | Tỉ lệ % lượt luyện theo skill; BE nên trả sẵn % (đã làm tròn, tổng ≈100). |

- `trendType`: `"up" | "down" | "neutral"`. Khi không có so sánh → `"neutral"` và bỏ `trendPercent`.
- Nếu chưa có nghiệp vụ `pendingMaterials`, trả `0` hoặc bỏ hẳn field (FE sẽ ẩn thẻ).

---

## 2. `GET /admin/dashboard/activity`

Chuỗi thời gian số lượt hoạt động/lượt làm bài theo từng kỹ năng, dùng cho area chart.

**Query:**
| Param | Kiểu | Mặc định | Mô tả |
| :-- | :-- | :-- | :-- |
| `days` | int | 30 | Số ngày gần nhất. |
| `bucket` | enum | `day` | `day` \| `week` (gom nhóm). |

**Response `data`:**
```jsonc
{
  "range": { "from": "2026-06-11", "to": "2026-07-11", "bucket": "day" },
  "series": [
    { "date": "2026-06-11", "label": "Ngày 1",
      "grammar": 400, "reading": 240, "listening": 320, "speaking": 120, "writing": 180 },
    { "date": "2026-06-16", "label": "Ngày 5",
      "grammar": 500, "reading": 300, "listening": 350, "speaking": 150, "writing": 210 }
    // ... đủ số mốc theo days/bucket
  ]
}
```
- **Nguồn:** `exam_results`/`exam_attempts` `group by date, skillId`, đếm số lượt trong mỗi mốc.
- `label` để hiển thị trục X (nếu BE không tạo, FE tự sinh từ `date`).
- Trả **đủ mọi mốc thời gian** kể cả khi không có dữ liệu (điền 0) để đồ thị liền mạch.

---

## 3. `GET /admin/dashboard/recent-students`

Học viên đăng ký mới nhất.

**Query:** `limit` (int, mặc định 5).

**Response `data`:** (mảng)
```jsonc
[
  {
    "id": 101,
    "fullName": "Nguyễn Văn A",
    "email": "nva@gmail.com",
    "registeredAt": "2026-06-03T08:12:00Z",
    "status": "ACTIVE"          // ACTIVE | INACTIVE | LOCKED
  }
]
```
- **Nguồn:** `users` + `user_profiles`, `where role = STUDENT order by createdAt desc limit N`.
- `registeredAt` trả ISO 8601; FE tự format hiển thị.
- *Có thể tái dùng* `GET /users?role=STUDENT&sortBy=createdAt&order=desc&limit=5` thay cho endpoint riêng — BE chọn 1 hướng và báo lại FE.

---

## 4. `GET /admin/dashboard/recent-tests`

Bài làm/nộp mới nhất.

**Query:** `limit` (int, mặc định 5).

**Response `data`:** (mảng)
```jsonc
[
  {
    "resultId": 5001,
    "studentName": "Nguyễn Văn A",
    "skillId": 3,
    "skillName": "Reading",
    "score": 45,               // null nếu chưa chấm
    "maxScore": 50,            // null nếu không áp dụng
    "status": "GRADED",        // GRADED | PENDING_GRADING
    "durationSeconds": 1512    // thời gian làm bài; FE format thành 25:12
  }
]
```
- **Nguồn:** `exam_results` join `users`, `skills`, `order by submittedAt desc limit N`.
- Bài tự luận chưa chấm: `status = "PENDING_GRADING"`, `score = null` → FE hiển thị "Chờ chấm".
- FE hiển thị điểm dạng `score/maxScore` và thời gian dạng `mm:ss` từ `durationSeconds`.

---

## 5. `GET /admin/dashboard/activities`

Nhật ký hoạt động gần đây cho timeline (audit log tối giản).

**Query:** `limit` (int, mặc định 5).

**Response `data`:** (mảng)
```jsonc
[
  {
    "id": 9001,
    "type": "EXAM_COMPLETED",   // xem bảng type bên dưới
    "message": "Học viên Nguyễn Văn A đã hoàn thành bài thi thử Aptis Full Test #3",
    "createdAt": "2026-07-11T09:50:00Z"
  }
]
```
**Bảng `type` → màu chấm timeline (FE map):**
| `type` | Ý nghĩa | Màu |
| :-- | :-- | :-- |
| `EXAM_COMPLETED` | Học viên hoàn thành bài thi | green |
| `QUESTION_ADDED` | Thêm câu hỏi vào ngân hàng | blue |
| `EXAM_CREATED` | Tạo bộ đề mới | cyan |
| `NOTIFICATION_SENT` | Gửi thông báo | orange |
| `STREAK_MILESTONE` | Học viên đạt mốc chuỗi ngày | green |

- **Nguồn:** bảng audit log/hệ thống (nếu chưa có, có thể tổng hợp từ các bảng nghiệp vụ hoặc dựng bảng `activity_logs`).
- `message` do BE dựng sẵn tiếng Việt; `createdAt` ISO — FE tự tính "x phút trước".

---

## Interface TypeScript (FE sẽ dùng để nối)

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
    pendingGrading: KpiValue;
    pendingMaterials?: KpiValue;
  };
  questionStats: { total: number; skills: { skillId: number; name: string; count: number }[] };
  examCounts: { total: number; types: { type: string; name: string; count: number }[] };
  skillDistribution: { skillId: number; name: string; value: number }[];
}

export interface ActivitySeriesPoint {
  date: string; label?: string;
  grammar: number; reading: number; listening: number; speaking: number; writing: number;
}
export interface DashboardActivity {
  range: { from: string; to: string; bucket: 'day' | 'week' };
  series: ActivitySeriesPoint[];
}

export interface RecentStudent {
  id: number; fullName: string; email: string; registeredAt: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
}

export interface RecentTest {
  resultId: number; studentName: string; skillId: number; skillName: string;
  score: number | null; maxScore: number | null;
  status: 'GRADED' | 'PENDING_GRADING'; durationSeconds: number;
}

export type ActivityType =
  | 'EXAM_COMPLETED' | 'QUESTION_ADDED' | 'EXAM_CREATED'
  | 'NOTIFICATION_SENT' | 'STREAK_MILESTONE';
export interface DashboardActivityItem {
  id: number; type: ActivityType; message: string; createdAt: string;
}
```

---

## Câu hỏi cần backend xác nhận
1. Enum `exam_sets.type` chính thức là gì (`PART`/`SET`/`MOCK`?), có sẵn cột này chưa?
2. `skillDistribution` tính theo **lượt làm bài** hay **số câu đã luyện**? BE trả % hay trả count để FE tự tính %?
3. Đã có bảng audit/`activity_logs` cho mục #5 chưa, hay cần dựng mới?
4. Màu sắc trong biểu đồ do **FE quyết định** (không cần BE trả `color`).
5. Chốt hướng cho "học viên mới": endpoint riêng hay tái dùng `/users`.
