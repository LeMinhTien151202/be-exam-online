# Kế hoạch Xây dựng API — Hệ thống Luyện thi APTIS

> Dựa trên `DATABASE_DESIGN 4.md` (17 bảng, khóa Int autoincrement), nghiệp vụ APTIS (5 kỹ năng / 19 parts) và quy ước code trong `.agent/AGENTS.md` + `.docs/ARCHITECTURE.md`.
> Base path: `/api/v1`. Mọi response đi qua `TransformInterceptor` (`{ code, success, message, messages, data, metaData }`).

---

## 0. Nguyên tắc chung (áp dụng cho MỌI endpoint)

- **Auth mặc định**: `JwtAuthGuard` toàn cục. Route công khai đánh `@Public()`; route cần login nhưng không cần kiểm tra quyền chi tiết đánh `@SkipCheckPermission()`.
- **Phân quyền**: theo **`role` enum** (`ADMIN` / `TEACHER` / `STUDENT`) qua `@Roles(...)` + `RolesGuard`. *(Xem mục 1 — chọn hướng RBAC theo role thay vì permission apiPath, khớp thiết kế DB `role_menu_access`.)*
- **Validation**: DTO + `class-validator`, message tiếng Việt.
- **Soft delete**: chỉ áp dụng cho bảng CÓ cột `deleted_at` (`exam_sets`, `question_bank`, `study_materials`). Query đọc luôn lọc `deletedAt: null`. Các bảng khác xóa cứng hoặc dùng cờ trạng thái (vd `users.status`).
- **Pagination**: service trả `{ result, page, pageSize, total, totalPage }`; controller nhận `page`, `limit` (+ filter). Interceptor tự tách `data` / `metaData`.
- **Audit**: bảng có `created_by` set từ `@User()`. *(DB tối giản — KHÔNG nhồi `updatedBy/updatedAt/deletedBy` vào bảng mà thiết kế không có.)*
- **Transaction**: mọi thao tác ghi nhiều bảng dùng `prisma.$transaction`.

---

## 1. Phân quyền & Roles

| Role | Phạm vi chính |
| :--- | :--- |
| **ADMIN** | Toàn quyền: quản lý user, menu, settings, exam set, question bank, xem mọi kết quả. |
| **TEACHER** | Tạo/sửa question bank, exam set, study materials; xem kết quả học viên. |
| **STUDENT** | Làm bài (practice + mock), xem tiến độ/kết quả/streak của chính mình, nhận notification. |

**Quyết định thiết kế (cần xác nhận):** dùng **RolesGuard theo `role` enum** — đơn giản, khớp bảng `role_menu_access`. KHÔNG dựng bảng permission `apiPath+method` như `.docs/AUTH_FLOW.md` mô tả (đó là mâu thuẫn tài liệu đã ghi nhận). Sidebar/menu động lấy từ `system_menus` + `role_menu_access`.

---

## 2. Danh sách Module & Endpoints

### 2.1. `auth/` — Xác thực *(Phân hệ 1)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| POST | `/auth/register` | `@Public` | Đăng ký tài khoản STUDENT (hash bcrypt, tạo kèm `user_profiles`). |
| POST | `/auth/login` | `@Public` + LocalGuard | Đăng nhập, trả `access_token` + set cookie httpOnly `refresh_token`. |
| GET | `/auth/account` | `@SkipCheckPermission` | Thông tin user hiện tại + role + menu được phép. |
| GET | `/auth/refresh` | `@Public` | Cấp lại access token từ cookie refresh. |
| POST | `/auth/logout` | `@SkipCheckPermission` | Thu hồi refresh token + clear cookie. |
| PATCH | `/auth/change-password` | `@SkipCheckPermission` | Đổi mật khẩu (verify mật khẩu cũ). |

### 2.2. `users/` — Người dùng *(bảng `users`, `user_profiles`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/users` | ADMIN | List + pagination + filter `role`, `status`, search email. |
| GET | `/users/:id` | ADMIN | Chi tiết user + profile. |
| POST | `/users` | ADMIN | Tạo user (gán `role` bất kỳ: TEACHER/ADMIN/STUDENT). |
| PATCH | `/users/:id` | ADMIN | Cập nhật `role` / `status` (ACTIVE ↔ LOCKED). |
| PATCH | `/users/:id/lock` | ADMIN | Khóa tài khoản (thay cho xóa — `users` không có `deleted_at`). |
| GET | `/profile/me` | STUDENT/TEACHER | Xem profile của chính mình. |
| PATCH | `/profile/me` | STUDENT/TEACHER | Cập nhật `full_name`, `avatar_url`, `target_date`, `aptis_goal` (B1/B2/C), `school_name`. |

> **Ưu tiên cao**: thay `UsersService` mock hiện tại bằng Prisma thật + bcrypt.

### 2.3. `menus/` — Sidebar động *(bảng `system_menus`, `role_menu_access`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/menus/me` | mọi role | Trả menu theo role hiện tại (dựng cây `parent_id`). |
| GET | `/menus` | ADMIN | List toàn bộ menu (quản lý). |
| POST/PATCH/DELETE | `/menus/:id` | ADMIN | CRUD menu (`label`, `path`, `icon`, `parent_id`, `sort_order`). |
| PUT | `/menus/:id/access` | ADMIN | Gán role nào thấy menu (ghi `role_menu_access`). |

### 2.4. `skills/` — Kỹ năng *(bảng `skills`, dữ liệu tĩnh)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/skills` | mọi role | 5 kỹ năng + `total_parts` (seed sẵn, read-only). |

### 2.5. `question-bank/` — Ngân hàng câu hỏi *(bảng `question_bank`, `question_bank_options`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| POST | `/questions` | ADMIN/TEACHER | Tạo câu hỏi (transaction: question + options nếu MC). Validate `extra_config` theo `question_type`. |
| GET | `/questions` | ADMIN/TEACHER | **Filter `skill_id` + `part_number` + `question_type`** (dùng khi assign vào đề) + pagination. |
| GET | `/questions/:id` | ADMIN/TEACHER | Chi tiết + options + extra_config. |
| PATCH | `/questions/:id` | ADMIN/TEACHER | Sửa nội dung/options/extra_config. |
| DELETE | `/questions/:id` | ADMIN/TEACHER | Soft delete (`deleted_at`). |

> **Validate `extra_config` bắt buộc theo type** — xem mục 3.5.

### 2.6. `exam-sets/` — Đề thi *(bảng `exam_sets`, `exam_sections`, `exam_parts`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| POST | `/exam-sets` | ADMIN/TEACHER | Tạo đề → **auto-sinh sections + parts theo `type`** (xem mục 3.1). Transaction. |
| GET | `/exam-sets` | ADMIN/TEACHER | List + filter `type`, `skill_id`, `is_active` + pagination. |
| GET | `/exam-sets/:id` | ADMIN/TEACHER | Cấu trúc đầy đủ: sections → parts → câu hỏi đã gán. |
| PATCH | `/exam-sets/:id` | ADMIN/TEACHER | Sửa `title`, `description`. |
| PATCH | `/exam-sets/:id/toggle-active` | ADMIN/TEACHER | Bật/tắt `is_active` (đề mới hiện cho học viên). |
| DELETE | `/exam-sets/:id` | ADMIN/TEACHER | Soft delete (`deleted_at`, cascade sections/parts). |
| PATCH | `/exam-sections/:id` | ADMIN/TEACHER | Chỉnh `duration_minutes`. |
| PATCH | `/exam-parts/:id` | ADMIN/TEACHER | Chỉnh `instruction`, `audio_url` (audio chung part cho Listening P3/P4). |

### 2.7. `exam-parts/:id/questions` — Gán câu hỏi vào đề *(bảng `exam_part_questions`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| POST | `/exam-parts/:partId/questions` | ADMIN/TEACHER | Gán danh sách câu hỏi + `order_index` (transaction, kiểm tra skill/part khớp). |
| DELETE | `/exam-parts/:partId/questions/:questionId` | ADMIN/TEACHER | Gỡ câu hỏi khỏi part. |
| PATCH | `/exam-parts/:partId/questions/reorder` | ADMIN/TEACHER | Kéo-thả sắp lại `order_index`. |

### 2.8. `exams/` — Học viên làm bài *(STUDENT)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/exams` | STUDENT | Danh sách đề `is_active` (lọc theo `type`: luyện tập / thi thử). |
| GET | `/exams/:id/take` | STUDENT | Lấy đề để làm — **KHÔNG trả `is_correct` / `correct_*` trong `extra_config`**. |
| POST | `/exams/:id/submit` | STUDENT | Nộp bài. Xử lý khác nhau theo `type` (xem mục 3.2 & 3.3). |

### 2.9. `attempts/` — Kết quả thi thử *(bảng `exam_attempts` — CHỈ MOCK_TEST)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/attempts/me` | STUDENT | Lịch sử điểm mock test của mình. |
| GET | `/attempts/:id` | STUDENT (chủ) / TEACHER / ADMIN | Chi tiết 1 lần thi (chỉ điểm tổng — DB không lưu chi tiết). |
| GET | `/attempts` | TEACHER/ADMIN | Toàn bộ, filter `student_id`, `status`. |

### 2.10. `progress/` & `streaks/` — Tiến độ *(bảng `student_progress`, `learning_streaks`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/progress/me` | STUDENT | Bộ đếm `questions_answered` theo (skill, part). |
| GET | `/streaks/me` | STUDENT | `current_streak`, `longest_streak`, `last_activity`. |

> Cả 2 bảng được **cập nhật tự động** khi submit (xem mục 3.4), không có endpoint ghi trực tiếp.

### 2.11. `study-materials/` — Tài liệu học *(bảng `study_materials`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| POST | `/study-materials` | TEACHER/ADMIN | Tạo (PDF/VIDEO, `file_url`, `skill_id`, `duration_seconds`). |
| GET | `/study-materials` | mọi role | List + filter `skill_id`, `file_type` + pagination. |
| GET | `/study-materials/:id` | mọi role | Chi tiết. |
| PATCH | `/study-materials/:id` | TEACHER/ADMIN | Sửa. |
| DELETE | `/study-materials/:id` | TEACHER/ADMIN | Soft delete (`deleted_at`). |

### 2.12. `notifications/` — Thông báo *(bảng `notifications`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/notifications/me` | mọi role | List của mình (gồm `receiver_id = NULL` broadcast) + filter `is_read`. |
| PATCH | `/notifications/:id/read` | mọi role | Đánh dấu đã đọc. |
| PATCH | `/notifications/read-all` | mọi role | Đọc tất cả. |
| POST | `/notifications` | ADMIN | Gửi (broadcast hoặc target 1 user), `notification_type`. |

### 2.13. `settings/` — Cấu hình hệ thống *(bảng `system_settings`)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/settings` | ADMIN | Toàn bộ key-value (gồm `MOCK_TEST_DURATION_*`). |
| PATCH | `/settings/:key` | ADMIN | Cập nhật giá trị (vd đổi duration mock). |

### 2.14. `files/` — Upload *(Multer, chưa có bảng riêng)*
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| POST | `/files/upload` | ADMIN/TEACHER | Upload ảnh (jpeg/jpg/png/gif ≤ 1MB), phân loại theo header `folder_type`; trả `file_url`. |

---

## 3. Logic nghiệp vụ trọng yếu

### 3.1. Tạo `exam_set` → tự sinh cấu trúc (transaction)
Enforce ở Service theo `type`:
- **`PART_PRACTICE`** (yêu cầu `skill_id` + `part_number`): 1 section + 1 part.
- **`SKILL_FULL_SET`** (`skill_id`, `part_number = NULL`): 1 section + N parts (N = `skills.total_parts`).
- **`MOCK_TEST`** (`skill_id = NULL`, `part_number = NULL`): 5 sections (skill 1→5) + parts theo `total_parts` mỗi skill → **tổng 19 parts** (2+4+5+4+4).
- `duration_minutes` mặc định theo `system_settings.MOCK_TEST_DURATION_*` (Grammar 25, Listening 30, Reading 30, Writing 30, Speaking 15).
- Validate ràng buộc `type` ↔ `skill_id`/`part_number` (tương đương CHECK constraint trong SQL).

### 3.2. Submit `MOCK_TEST`
1. FE gửi 1 JSON lớn chứa toàn bộ đáp án.
2. BE **chấm trắc nghiệm** (MC/ORDERING/WORD_BANK/HEADING_MATCH/SPEAKER_MATCH) bằng đáp án trong DB.
3. BE **gọi AI chấm tự luận** (ESSAY/RECORD) **đồng bộ** → nhận điểm + nhận xét.
4. Trả **review nóng** đầy đủ về FE (điểm từng phần + feedback AI).
5. **Chỉ lưu 1 dòng** `exam_attempts` (`total_score`, `status=SUBMITTED`, `started_at`/`finished_at`). KHÔNG lưu đáp án chi tiết / feedback.
6. Cập nhật streak (3.4).

### 3.3. Submit luyện tập (`PART_PRACTICE` / `SKILL_FULL_SET`)
- Chấm và trả kết quả về FE.
- **KHÔNG ghi `exam_attempts`.** Chỉ **`UPSERT` + tăng `student_progress.questions_answered`** theo (student, skill, part).
- Cập nhật streak (3.4).

### 3.4. Cập nhật `learning_streaks`
Khi có hoạt động (submit practice/mock):
- `last_activity` = hôm qua → `current_streak += 1`; = hôm nay → giữ nguyên; cách > 1 ngày → reset về 1.
- `longest_streak = max(longest_streak, current_streak)`; set `last_activity = CURRENT_DATE`.

### 3.5. Validate `extra_config` theo `question_type` (khi tạo/sửa câu hỏi)
Mapping part → type đã chốt (xem memory `aptis-skill-parts`). Mỗi type có schema `extra_config` riêng:
- `MC`: `null` (MC đơn, dùng `question_bank_options`) **hoặc** gap-fill `{ gaps: [{gap_id, options[3], correct_index}] }` (Reading P1) / `{ choice_kind:"SPEAKER_AGREEMENT", correct }` (Listening P3) / `{ audio_group_id }` (Listening P4).
- `ORDERING`: `{ fixed_first, options_pool, correct_order }`.
- `WORD_BANK`: `{ task_variant: DEFINITION|COLLOCATION|SENTENCE|SYNONYM|ANTONYM, options_pool[10], slots[5] }`.
- `HEADING_MATCH`: `{ paragraph_label, correct_heading, headings_pool }`.
- `SPEAKER_MATCH`: `{ speaker_index, correct_opinion, opinions_pool }`.
- `ESSAY`: `{ word_limit_min, word_limit_max, register_type, speaker_name, task_label }`.
- `RECORD`: `{ response_time_seconds, prep_time_seconds, image_count, question_group_id }`.

### 3.6. AI chấm tự luận qua Gemini API *(module `ai-grading/`)*

**Phạm vi**: chấm `ESSAY` (Writing) và `RECORD` (Speaking) — 2 dạng không auto-chấm được. Gọi **đồng bộ** trong luồng `POST /exams/:id/submit` của MOCK_TEST (mục 3.2).

**Cấu hình (`.env`)**:
```env
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-2.0-flash"      # flash = nhanh/rẻ; đổi sang *-pro nếu cần chất lượng cao hơn. Chốt theo docs Gemini hiện hành.
GEMINI_TIMEOUT_MS=45000
GEMINI_MAX_RETRIES=2
```
> API key **chỉ nằm ở server**, không bao giờ trả về FE.

**`GeminiService`** (wrapper dùng chung):
- Dùng SDK `@google/generative-ai` (hoặc REST `…/models/{model}:generateContent?key=`).
- Bật structured output: `responseMimeType: 'application/json'` + `responseSchema` → parse JSON an toàn.
- Retry có backoff khi lỗi mạng / 429 rate-limit; quá `MAX_RETRIES` → ném lỗi để caller xử lý.

**`EssayGradingService`** (Writing):
- Input: đề bài + `extra_config` (word_limit, register_type, task_label) + bài viết của học viên.
- Prompt gồm **rubric APTIS/CEFR** (task fulfillment, grammar, vocabulary, cohesion, register) + thang điểm.
- Output JSON: `{ score, band (A1..C), feedback, criteria: { taskFulfillment, grammar, vocabulary, cohesion } }`.

**`SpeakingGradingService`** (Speaking / RECORD):
- **Quyết định (tạm thời)**: đưa **file audio thẳng cho Gemini multimodal chấm** — KHÔNG dùng STT riêng (Whisper) hay công cụ chấm phát âm chuyên dụng (Azure Pronunciation). Đơn giản, 1 nhà cung cấp. Để ngỏ nâng cấp hybrid sau nếu cần điểm phát âm định lượng.
- Input: **audio** (inline base64 ≤ ~20MB, hoặc Gemini File API cho file lớn) + đề + `extra_config` (response_time, image_count).
- Gemini nghe trực tiếp → chấm nội dung, grammar, vocabulary, fluency; `pronunciation` chỉ ở mức **định tính** (nhận xét, không đo chính xác từng âm).
- Output JSON tương tự Essay + tiêu chí `pronunciation` (định tính), `fluency`.

**Điều phối khi submit MOCK (mục 3.2 bước 3)**:
- Gom tất cả câu ESSAY + RECORD → chấm **song song** bằng `Promise.allSettled`.
- Câu `fulfilled` → cộng điểm; câu `rejected` → điểm `null` + `needsManualReview: true` (KHÔNG fail cả bài).
- Tổng hợp vào review nóng trả FE; `exam_attempts.total_score` = điểm trắc nghiệm + tổng điểm AI (chuẩn hóa thang).
- **KHÔNG lưu** feedback AI vào DB (đúng triết lý tối giản — xem [[design-conflicts]]).

**Lưu ý vận hành**:
- Free tier Gemini có quota/rate-limit → cân nhắc hàng đợi hoặc giới hạn số bài chấm đồng thời.
- Chi phí tính theo token (Writing) và giây audio (Speaking) → log usage.
- Tách provider sau lớp `GeminiService` để dễ đổi model/nhà cung cấp về sau.

### 3.7. Ẩn đáp án khi học viên làm bài
`GET /exams/:id/take` phải loại bỏ: `question_bank_options.is_correct`, và các khóa `correct_*` / `is_correct` trong `extra_config` (`correct_order`, `correct_answer`, `correct_heading`, `correct_opinion`, `correct_index`, `correct`).

---

## 4. Lộ trình triển khai (Phases)

| Phase | Nội dung | Phụ thuộc |
| :--: | :-- | :-- |
| **1** | **Auth** (register/login/refresh/logout) + **Users/Profile** nối Prisma thật (bỏ mock) + bcrypt + `RolesGuard` | — |
| **2** | **Skills** (read) + **Menus** + RBAC menu động | 1 |
| **3** | **Question Bank** + options + validate `extra_config` (3.5) + **Files upload** | 1 |
| **4** | **Exam Sets** + auto-sinh sections/parts (3.1) + **gán câu hỏi** (2.7) | 3 |
| **5** | **Exams take/submit** — luyện tập (3.3) + chấm trắc nghiệm + **Progress** + **Streak** (3.4) | 4 |
| **6** | **Mock Test** submit + **AI chấm tự luận qua Gemini** đồng bộ (3.2 + 3.6): module `ai-grading/`, `GeminiService` + Essay/Speaking grading, chấm song song | 5 |
| **7** | **Study Materials** + **Notifications** + **Settings** | 1 |

---

## 5. Việc nền cần làm trước Phase 1
- [ ] Thêm `url = env("DATABASE_URL")` vào `datasource` trong `schema.prisma` (hiện đang thiếu) + tạo `.env`.
- [ ] Seed dữ liệu tĩnh: `skills` (5 dòng), `system_settings` (5 duration). *(Có trong DATABASE_DESIGN 4.md — chuyển thành `prisma/seed.ts`.)*
- [ ] Viết `auth/jwt-auth.guard.ts`, `roles.guard.ts`, `@Roles()` decorator, passport `local`/`jwt` strategy (hiện CHƯA có).
- [ ] Đăng ký `JwtAuthGuard` global trong `main.ts`.
- [ ] Chốt hướng phân quyền role-based (mục 1) với chủ dự án.
- [ ] Cài SDK Gemini (`pnpm add @google/generative-ai`) + thêm `GEMINI_*` vào `.env` (mục 3.6). *(Chưa có trong `package.json`.)*
- [ ] Chốt model Gemini (`GEMINI_MODEL`) + cách nhận audio RECORD (inline base64 vs File API) trước Phase 6.
