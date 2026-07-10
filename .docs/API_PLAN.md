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
| GET | `/auth/google` | `@Public` | Bắt đầu đăng nhập Google OAuth (redirect sang Google). |
| GET | `/auth/google/callback` | `@Public` | Google gọi lại sau khi xác thực → cấp token + set cookie. |
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

### 2.5. `question-bank/` — Ngân hàng câu hỏi *(bảng `question_bank`)*
> Đáp án MC nằm trong `extra_config.options` (đã bỏ bảng `question_bank_options`).

| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| POST | `/questions` | ADMIN/TEACHER | Tạo câu hỏi. Tự suy `question_type` từ (skill, part), validate `extra_config` theo type. |
| GET | `/questions` | ADMIN/TEACHER | **Filter `skill_id` + `part_number` + `question_type`** (dùng khi assign vào đề) + pagination. |
| GET | `/questions/:id` | ADMIN/TEACHER | Chi tiết + extra_config (kèm options MC). |
| PATCH | `/questions/:id` | ADMIN/TEACHER | Sửa content/mediaUrl/extra_config. |
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

### 2.9. `attempts/` — Lần làm bài *(bảng `exam_attempts` — MOCK_TEST + SKILL_FULL_SET)*
> Ghi 1 dòng mỗi lần nộp cho **MOCK_TEST** (lưu điểm → tính TB) và **SKILL_FULL_SET** (đánh dấu đã làm đề). **PART_PRACTICE KHÔNG ghi attempt** (chỉ `student_progress`).

| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/attempts/me` | STUDENT | Lịch sử làm bài của mình (filter `type`, `exam_set_id`). MOCK_TEST kèm điểm; trả kèm **điểm trung bình** MOCK_TEST. |
| GET | `/attempts/me/done` | STUDENT | Tập `exam_set_id` **đã làm** (để FE gắn nhãn Đã làm/Chưa làm cho SKILL_FULL_SET & MOCK_TEST). |
| GET | `/attempts/:id` | STUDENT (chủ) / TEACHER / ADMIN | Chi tiết 1 lần làm (chỉ điểm tổng — DB không lưu chi tiết). |
| GET | `/attempts` | TEACHER/ADMIN | Toàn bộ, filter `student_id`, `status`, `type`. |

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
| GET | `/notifications` | ADMIN | **Quản lý**: tất cả thông báo + lọc `notificationType`/`isRead`/`audience`(all\|broadcast\|personal)/`receiverId`/`search` + phân trang (kèm `receiver`). |
| GET | `/notifications/me` | mọi role | List của mình (gồm `receiver_id = NULL` broadcast) + filter `is_read` + **phân trang**. |
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
| DELETE | `/files` | ADMIN/TEACHER | Xóa file đã upload (theo `file_url`). |

### 2.15. `faqs/` — Góc giải đáp *(bảng `faqs`)*
FAQ tĩnh: ADMIN/TEACHER đăng sẵn Q+A, học viên đọc/tìm.
| Method | Path | Quyền | Mô tả |
| :-- | :-- | :-- | :-- |
| GET | `/faqs` | mọi role | List FAQ (`isActive` only; lọc `category`/`search`; ADMIN `?includeInactive=true`) + **phân trang**. Sắp theo `sort_order`. |
| GET | `/faqs/:id` | mọi role | Chi tiết. |
| POST | `/faqs` | ADMIN/TEACHER | Tạo (`question`, `answer`, `category?`, `sortOrder?`, `isActive?`). |
| PATCH | `/faqs/:id` | ADMIN/TEACHER | Sửa / ẩn (`isActive`). |
| DELETE | `/faqs/:id` | ADMIN/TEACHER | Soft delete (`deleted_at`). |

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
5. **Lưu 1 dòng** `exam_attempts` **mỗi lần nộp** (`total_score`, `status=SUBMITTED`, `started_at`/`finished_at`). Cùng 1 đề thi nhiều lần → nhiều dòng. KHÔNG lưu đáp án chi tiết / feedback.
6. **Điểm trung bình**: `AVG(total_score)` trên các attempt MOCK_TEST của học viên (dùng ở dashboard/landing). Trạng thái **đã thi/chưa thi** = có/không có attempt cho `exam_set_id`.
7. Cập nhật streak (3.4).

### 3.3. Submit luyện tập
**`PART_PRACTICE`** (luyện theo phần):
- Chấm trắc nghiệm. Nếu luyện phần **Viết/Nói** → **gọi AI (Gemini) chấm** câu ESSAY/RECORD đồng bộ (3.6) và trả điểm + feedback về FE để **hiển thị ngay** (không lưu).
- **KHÔNG ghi `exam_attempts`, KHÔNG lưu điểm.** Chỉ **`UPSERT` + tăng `student_progress.questions_answered`** theo (student, skill, part).
- Cập nhật streak (3.4).

**`SKILL_FULL_SET`** (luyện theo bộ đề):
- Chấm trắc nghiệm. Nếu bộ đề **Viết/Nói** → **gọi AI (Gemini) chấm** các câu ESSAY/RECORD đồng bộ (3.6) và trả điểm + feedback về FE.
- **Ghi 1 dòng `exam_attempts`** (`exam_set_id`, `status=SUBMITTED`) **chỉ để đánh dấu đã làm đề này** — FE gắn nhãn Đã làm/Chưa làm. **KHÔNG lưu `total_score`** (`total_score = NULL`); average là chuyện của MOCK_TEST. Điểm auto + AI chỉ trả review nóng cho học viên xem ngay, không persist.
- Cũng tăng `student_progress` cho các part liên quan (đóng góp tiến độ từng phần).
- Cập nhật streak (3.4).

### 3.4. Cập nhật `learning_streaks`
Khi có hoạt động (submit practice/mock):
- `last_activity` = hôm qua → `current_streak += 1`; = hôm nay → giữ nguyên; cách > 1 ngày → reset về 1.
- `longest_streak = max(longest_streak, current_streak)`; set `last_activity = CURRENT_DATE`.

### 3.5. Validate `extra_config` theo `question_type` (khi tạo/sửa câu hỏi)
Mapping part → type đã chốt (xem memory `aptis-skill-parts`). Registry `src/question-bank/question-config.ts` vừa suy `question_type` từ (skillId, partNumber) vừa validate. Schema `extra_config` theo từng part (nhiều dạng **gói cả cụm vào 1 dòng** — không tách mỗi ý 1 bản ghi):

- `MC`:
  - **Grammar P1** (1-1): `{ options: [{content, is_correct}] ×3 }` (đúng 1 `is_correct=true`), có `content`, không audio.
  - **Listening P1** (2-1): giống trên nhưng **bắt buộc `mediaUrl`** (audio).
  - **Reading P1 gap-fill** (3-1): `content` (đoạn văn) + `{ gaps: [{gap_id, options[3], correct_index}] ×5 }`.
  - **Listening P3 agreement** (2-3, GÓI cả part): `{ choice_kind:"SPEAKER_AGREEMENT", statements: [{statement, correct: MAN|WOMAN|BOTH}] }`, audio chung ở `mediaUrl`.
  - **Listening P4 monologue** (2-4, MỖI BÀI NGHE = 1 dòng): **`mediaUrl`** (audio riêng) + `{ questions: [{question, options[3]{content, is_correct}}] }`. **Đã bỏ `audio_group_id`.**
- `ORDERING` (Reading P2/P3): `{ fixed_first: true, options_pool[6], correct_order[6] (hoán vị 0..5) }`.
- `WORD_BANK` (Vocab P2): `{ task_variant: DEFINITION|COLLOCATION|SENTENCE|SYNONYM|ANTONYM, options_pool[10], slots[5]{slot_id, prompt, correct_answer ∈ options_pool} }`.
- `SPEAKER_MATCH`:
  - **Listening P2** (2-2): `{ options_pool[6], speakers[4]{speaker_index, correct_answer ∈ pool, dùng đúng 1 lần} }`.
  - **Reading P4** (3-4): `{ people[4]{passage, key}, questions[7]{statement, correct_person ∈ people.key} }`.
- `HEADING_MATCH` (Reading P5): `{ example{paragraph_label, paragraph_text, correct_heading}, paragraphs[7]{label, text}, headings_pool[8], answers[7]{paragraph_label, correct_heading ∈ pool} }`.
- `ESSAY` (Writing — MỖI PART 1 dòng, câu con gói trong `extra_config`):
  - **P1** (4-1): `content` + `{ word_limit_min/max, prompts[5]{question, sample_answer?} }`.
  - **P2** (4-2): `content` + `{ word_limit_min/max, sample_answer? }`.
  - **P3** (4-3): `content` + `{ word_limit_min/max, prompts[3]{speaker_name, question, sample_answer?} }`.
  - **P4** (4-4): `{ context, tasks[2]{task_label, instruction, register_type: FORMAL|INFORMAL, word_limit_min/max, sample_answer?} }`.
- `RECORD` (Speaking) — media chung: `{ response_time_seconds: 30|45|120, prep_time_seconds: 0|60, image_count: 0|1|2, image_urls[] (số lượng = image_count) }`:
  - **P1** (5-1): 3 câu ĐỘC LẬP, mỗi câu 1 dòng — `content` (câu hỏi) + media ở trên.
  - **P2/P3/P4** (5-2..4): GÓI cả part — media + `{ questions[]{question, sample_answer?} }`.

> `sample_answer` (bài/đáp án mẫu) là **tuỳ chọn**, bị ẩn khỏi đề khi học viên làm (xem 3.7).

### 3.6. AI chấm tự luận qua Gemini API *(module `ai-grading/`)*

**Phạm vi**: chấm `ESSAY` (Writing) và `RECORD` (Speaking) — 2 dạng không auto-chấm được. Gọi **đồng bộ** trong luồng `POST /exams/:id/submit` cho **mọi loại đề có câu Viết/Nói** — PART_PRACTICE (3.3), SKILL_FULL_SET (3.3), MOCK_TEST (3.2) — luôn trả điểm + feedback AI trong review nóng để FE hiển thị ngay. Khác biệt ở chỗ **lưu điểm**: chỉ **MOCK_TEST lưu** (gồm điểm AI) vào `exam_attempts.total_score` để tính trung bình; PART_PRACTICE và SKILL_FULL_SET **không lưu điểm để tính trung bình** (PART_PRACTICE không ghi attempt; SKILL_FULL_SET ghi attempt chỉ để đánh dấu đã-làm).

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

**`AiGradingService`** (1 service dùng chung cho cả Writing và Speaking — `src/ai-grading/ai-grading.service.ts`):
- `gradeMany(items)` → chấm song song bằng `Promise.all`; mỗi câu tự bọc try/catch nên 1 câu lỗi **không** làm hỏng cả bài (trả về `needsManualReview: true`).
- `gradeEssay` (ESSAY / Writing):
  - Input: đề bài + `extra_config` (prompts/tasks, word_limit, register_type…) + bài viết học viên.
  - Writing giờ 1 part = 1 dòng gồm nhiều câu con (`prompts[]` / `tasks[]`) → dựng lại các câu con và chấm **tổng thể cả part → 1 điểm**.
  - Prompt gồm rubric APTIS/CEFR (task fulfillment, grammar, vocabulary, cohesion, register).
- `gradeSpeaking` (RECORD / Speaking):
  - **Quyết định (tạm thời)**: đưa **file audio thẳng cho Gemini multimodal chấm** — KHÔNG dùng STT riêng (Whisper) hay công cụ chấm phát âm chuyên dụng (Azure Pronunciation). Đơn giản, 1 nhà cung cấp. Để ngỏ nâng cấp hybrid sau nếu cần điểm phát âm định lượng.
  - Input: **audio** (tải URL đã upload → `fetch` → base64, gửi inline; P1 = 1 URL, P2/3/4 = mảng URL theo thứ tự `questions`) + đề + `extra_config`.
  - Gemini nghe trực tiếp → chấm nội dung, grammar, vocabulary, fluency; phát âm chỉ **định tính** (gộp trong `feedback`). Câu gói chấm **tổng thể cả part → 1 điểm**.
- **Output JSON dùng chung** (`gradeSchema`): `{ score (0-100), band (A1..C), feedback }`. *(Không tách `criteria`/`pronunciation`/`fluency` thành field riêng — các tiêu chí nằm trong `feedback` dạng text.)*

**Điều phối khi submit (mục 3.2 / 3.3)**:
- `ExamsService.submit()` gom mọi câu ESSAY + RECORD → gọi `aiGrading.gradeMany(...)` (song song) cho **cả 3 loại đề**.
- Câu chấm được → có `aiScore`; câu lỗi/thiếu `GEMINI_API_KEY` → `aiScore = null` + `needsManualReview: true` (đếm vào `needsManualReviewCount`).
- Tổng hợp vào review nóng (`ai[]`) trả FE ở **cả 3 loại đề**. `score` tổng = trung bình % theo từng câu (trắc nghiệm `earned/total*100` + `aiScore`). **MOCK_TEST + SKILL_FULL_SET** đều ghi `exam_attempts.total_score` = `score` này (cột `Int`, không nullable); nhưng **AVG chỉ tính trên MOCK_TEST** (SKILL_FULL_SET chỉ dùng để đánh dấu đã-làm, không đưa vào trung bình). **PART_PRACTICE**: không ghi attempt. Cả 3 đều trả điểm AI cho học viên xem ngay.
- **KHÔNG lưu** feedback AI vào DB (đúng triết lý tối giản — xem [[design-conflicts]]).

**Endpoint TEST (kiểm tra Gemini hoạt động — module `ai-grading/`, chỉ ADMIN/TEACHER)**:
| Method | Path | Mô tả |
| :-- | :-- | :-- |
| GET | `/ai-grading/status` | Trả `{ enabled }` — Gemini đã bật chưa (có `GEMINI_API_KEY`). |
| POST | `/ai-grading/test` | Chấm thử 1 câu `{ questionType: ESSAY\|RECORD, content?, extraConfig?, response }` → gọi thẳng Gemini, trả `{ score, band, feedback, needsManualReview }`. **Không lưu DB.** |

**Lưu ý vận hành**:
- Free tier Gemini có quota/rate-limit → cân nhắc hàng đợi hoặc giới hạn số bài chấm đồng thời.
- Chi phí tính theo token (Writing) và giây audio (Speaking) → log usage.
- Tách provider sau lớp `GeminiService` để dễ đổi model/nhà cung cấp về sau.

### 3.7. Ẩn đáp án khi học viên làm bài
`GET /exams/:id/take` loại bỏ mọi khóa `is_correct` và `correct_*` trong `extra_config` (`options[].is_correct`, `correct_order`, `correct_answer`, `correct_heading`, `correct_person`, `correct_index`, `correct`...). Đã cài đặt bằng `stripAnswers()` đệ quy trong `src/exams/grading.ts`.

---

## 4. Lộ trình triển khai (Phases)

| Phase | Nội dung | Phụ thuộc |
| :--: | :-- | :-- |
| **1** | **Auth** (register/login/refresh/logout) + **Users/Profile** nối Prisma thật (bỏ mock) + bcrypt + `RolesGuard` | — |
| **2** | **Skills** (read) + **Menus** + RBAC menu động | 1 |
| **3** | **Question Bank** + options + validate `extra_config` (3.5) + **Files upload** | 1 |
| **4** | **Exam Sets** + auto-sinh sections/parts (3.1) + **gán câu hỏi** (2.7) | 3 |
| **5** | **Exams take/submit** — luyện tập (3.3) + chấm trắc nghiệm + **Progress** + **Streak** (3.4) | 4 |
| **6** | **Mock Test** submit + **AI chấm tự luận qua Gemini** đồng bộ cho **mọi đề có câu Viết/Nói** (PART_PRACTICE / SKILL_FULL_SET / MOCK_TEST) (3.2 + 3.3 + 3.6): module `ai-grading/`, `GeminiService` + Essay/Speaking grading, chấm song song. Chỉ MOCK_TEST lưu điểm để tính trung bình. | 5 |
| **7** | **Study Materials** + **Notifications** + **Settings** | 1 |
| **8** | **FAQ / Góc giải đáp** (FAQ tĩnh — bảng `faqs`, CRUD, lọc category/search) | 1 |

---

## 5. Việc nền cần làm trước Phase 1
- [ ] Thêm `url = env("DATABASE_URL")` vào `datasource` trong `schema.prisma` (hiện đang thiếu) + tạo `.env`.
- [ ] Seed dữ liệu tĩnh: `skills` (5 dòng), `system_settings` (5 duration). *(Có trong DATABASE_DESIGN 4.md — chuyển thành `prisma/seed.ts`.)*
- [ ] Viết `auth/jwt-auth.guard.ts`, `roles.guard.ts`, `@Roles()` decorator, passport `local`/`jwt` strategy (hiện CHƯA có).
- [ ] Đăng ký `JwtAuthGuard` global trong `main.ts`.
- [ ] Chốt hướng phân quyền role-based (mục 1) với chủ dự án.
- [ ] Cài SDK Gemini (`pnpm add @google/generative-ai`) + thêm `GEMINI_*` vào `.env` (mục 3.6). *(Chưa có trong `package.json`.)*
- [ ] Chốt model Gemini (`GEMINI_MODEL`) + cách nhận audio RECORD (inline base64 vs File API) trước Phase 6.
