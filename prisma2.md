-- ============================================================
-- APTISTEST — FULL DATABASE SCHEMA (Final Version + Question Bank)
-- PostgreSQL
--
-- Thay đổi so với các bản trước (TỐI ƯU SIÊU TRIỆT ĐỂ):
-- 1. XÓA BỎ HOÀN TOÀN bảng attempt_details (Không lưu lịch sử đáp án, không snapshot).
-- 2. AI chấm điểm ĐỒNG BỘ: Kết quả trả về FE ngay lập tức, không lưu feedback vào DB.
-- 3. LUYỆN TẬP: Không lưu vào exam_attempts, chỉ tăng bộ đếm trong student_progress.
-- 4. THI THỬ (MOCK_TEST): Lưu duy nhất 1 dòng điểm tổng vào exam_attempts.
-- ============================================================

-- ============================================================
-- PHÂN HỆ 1: NGƯỜI DÙNG & PHÂN QUYỀN
-- ============================================================

CREATE TABLE users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email VARCHAR(255) NOT NULL UNIQUE,
password_hash VARCHAR(255) NOT NULL,
role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED')),
created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
full_name VARCHAR(100) NOT NULL,
avatar_url TEXT,
target_date DATE,
aptis_goal VARCHAR(10) CHECK (aptis_goal IN ('B1', 'B2', 'C')),
school_name VARCHAR(255),
overall_mock_avg INT DEFAULT 0 -- Điểm trung bình tổng các bài thi thử (Mock Test)
);

-- Sidebar menu: dùng DB thay vì hardcode để Admin bật/tắt menu không cần deploy lại
CREATE TABLE system_menus (
id SERIAL PRIMARY KEY,
label VARCHAR(100) NOT NULL,
path VARCHAR(255) NOT NULL,
icon VARCHAR(50),
parent_id INT REFERENCES system_menus(id),
sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE role_menu_access (
role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
menu_id INT NOT NULL REFERENCES system_menus(id) ON DELETE CASCADE,
PRIMARY KEY (role, menu_id)
);

-- ============================================================
-- PHÂN HỆ 2: NGÂN HÀNG ĐỀ THI (EXAM BANK)
-- ============================================================

CREATE TABLE skills (
id INT PRIMARY KEY,
name VARCHAR(50) NOT NULL,
total_parts INT NOT NULL
);

-- Dữ liệu tĩnh — không thay đổi
INSERT INTO skills (id, name, total_parts) VALUES
(1, 'Grammar & Vocabulary', 2),
(2, 'Listening', 4),
(3, 'Reading', 4),
(4, 'Writing', 4),
(5, 'Speaking', 4);

-- ─────────────────────────────────────────────────────────────
-- 2.1. Bảng exam_sets — "vỏ" của đề thi, chưa có nội dung
-- ─────────────────────────────────────────────────────────────
--
-- 3 loại đề và rule tương ứng (enforce ở tầng Service):
--
-- type='PART_PRACTICE' → skill_id NOT NULL, part_number NOT NULL
-- Backend tự sinh: 1 section + 1 part
-- Ví dụ: Luyện Listening Part 1
--
-- type='SKILL_FULL_SET' → skill_id NOT NULL, part_number NULL
-- Backend tự sinh: 1 section + N parts (N = skills.total_parts)
-- Ví dụ: Bộ đề Listening đủ 4 parts
--
-- type='MOCK_TEST' → skill_id NULL, part_number NULL
-- Backend tự sinh: 5 sections (1 per skill) + 4 parts mỗi section = 20 parts
-- Ví dụ: Thi thử Aptis đầy đủ
--
-- ─────────────────────────────────────────────────────────────
CREATE TABLE exam_sets (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
title VARCHAR(255) NOT NULL,
description TEXT,
type VARCHAR(30) NOT NULL CHECK (type IN ('PART_PRACTICE', 'SKILL_FULL_SET', 'MOCK_TEST')),
skill_id INT REFERENCES skills(id),
part_number INT,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
created_by UUID NOT NULL REFERENCES users(id),
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMP,

    -- Đảm bảo tính nhất quán theo loại đề
    CONSTRAINT chk_part_practice  CHECK (
        type != 'PART_PRACTICE'  OR (skill_id IS NOT NULL AND part_number IS NOT NULL)
    ),
    CONSTRAINT chk_skill_full_set CHECK (
        type != 'SKILL_FULL_SET' OR (skill_id IS NOT NULL AND part_number IS NULL)
    ),
    CONSTRAINT chk_mock_test      CHECK (
        type != 'MOCK_TEST'      OR (skill_id IS NULL     AND part_number IS NULL)
    )

);

-- ─────────────────────────────────────────────────────────────
-- 2.2. Bảng exam_sections — kỹ năng bên trong đề
--
-- Được tự sinh bởi backend khi Admin tạo exam_set:
--
-- PART_PRACTICE → INSERT 1 row (skill_id lấy từ exam_sets)
-- SKILL_FULL_SET → INSERT 1 row (skill_id lấy từ exam_sets)
-- MOCK_TEST → INSERT 5 rows (skill_id = 1,2,3,4,5 theo order_index)
--
-- Thời gian thi mặc định theo từng kỹ năng (phút):
-- Grammar=25, Listening=30, Reading=30, Writing=30, Speaking=15
-- Admin có thể chỉnh duration_minutes sau khi tạo.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE exam_sections (
id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
exam_id UUID NOT NULL REFERENCES exam_sets(id) ON DELETE CASCADE,
skill_id INT NOT NULL REFERENCES skills(id),
duration_minutes INT NOT NULL,
order_index INT NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 2.3. Bảng exam_parts — từng Part bên trong section
--
-- Được tự sinh bởi backend ngay sau khi tạo exam_sections:
--
-- PART_PRACTICE → INSERT 1 part (part_number lấy từ exam_sets.part_number)
-- SKILL_FULL_SET → INSERT N parts (N = skills.total_parts của skill đó)
-- MOCK_TEST → INSERT 4 parts cho mỗi section → tổng 20 parts
--
-- Sau khi sinh xong, Admin vào từng part để assign câu hỏi từ question_bank.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE exam_parts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
section_id UUID NOT NULL REFERENCES exam_sections(id) ON DELETE CASCADE,
part_number INT NOT NULL,
instruction TEXT,
audio_url TEXT -- Audio dùng chung cho cả Part (Listening P3, P4)
);

-- ============================================================
-- PHÂN HỆ 3: NGÂN HÀNG CÂU HỎI (QUESTION BANK)
-- Tách độc lập khỏi exam — tái sử dụng được giữa nhiều đề
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 3.1. Bảng question_bank — kho câu hỏi trung tâm
--
-- Câu hỏi KHÔNG gắn vào đề nào cả. Gắn vào đề qua exam_part_questions.
-- Admin tạo câu hỏi một lần, dùng cho nhiều đề khác nhau.
--
-- extra_config JSONB — metadata đặc thù theo question_type:
--
-- 'MC' → null (dùng question_bank_options)
--
-- 'ORDERING' → {
-- "fixed_first": true,
-- "options_pool": ["câu A", "câu B", ...],
-- "correct_order": [0, 2, 1, 3, 4]
-- }
--
-- 'WORD_BANK' → {
-- "task_variant": "SENTENCE" | "DEFINITION" | "COLLOCATION" | "SYNONYM" | "ANTONYM",
-- "options_pool": ["word1", "word2", ..., "word10"],
-- "slots": [
-- { "slot_id": "s1", "correct_answer": "word3" },
-- ...
-- ]
-- }
--
-- 'HEADING_MATCH' → {
-- "paragraph_label": "C",
-- "correct_heading": "The economic benefits of...",
-- "headings_pool": ["heading1", ..., "heading8"]
-- }
--
-- 'SPEAKER_MATCH' → {
-- "speaker_index": 2,
-- "correct_opinion": "B",
-- "opinions_pool": [
-- { "key": "A", "text": "They prefer..." },
-- ...
-- ]
-- }
--
-- 'ESSAY' → {
-- "word_limit_min": 30,
-- "word_limit_max": 40,
-- "register_type": "FORMAL" | "INFORMAL" | null,
-- "speaker_name": "Member A" | null,
-- "task_label": "Task 1" | null
-- }
--
-- 'RECORD' → {
-- "response_time_seconds": 30 | 45 | 120,
-- "prep_time_seconds": 0 | 60,
-- "image_count": 0 | 1 | 2,
-- "question_group_id": "uuid" | null
-- }
-- ─────────────────────────────────────────────────────────────
CREATE TABLE question_bank (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
skill_id INT NOT NULL REFERENCES skills(id),
part_number INT NOT NULL, -- Thuộc part mấy (1/2/3/4)
content TEXT, -- Nội dung câu hỏi / đề bài
media_url TEXT, -- Ảnh hoặc audio riêng của câu hỏi
question_type VARCHAR(30) NOT NULL CHECK (question_type IN (
'MC',
'ORDERING',
'WORD_BANK',
'HEADING_MATCH',
'SPEAKER_MATCH',
'ESSAY',
'RECORD'
)),
extra_config JSONB,
created_by UUID NOT NULL REFERENCES users(id),
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
deleted_at TIMESTAMP
);

-- Đáp án cho câu hỏi MC (gắn vào question_bank, không phải exam)
CREATE TABLE question_bank_options (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
content TEXT NOT NULL,
is_correct BOOLEAN NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 3.2. Bảng exam_part_questions — gán câu hỏi vào đề (nhiều-nhiều)
--
-- Luồng Admin tạo đề:
-- 1. Tạo exam_set → backend tự sinh sections + parts
-- 2. Admin vào từng exam_part
-- 3. Filter question_bank theo skill_id + part_number
-- 4. Chọn câu hỏi, kéo thả sắp xếp thứ tự
-- 5. Backend INSERT vào exam_part_questions
--
-- 1 câu hỏi có thể xuất hiện trong nhiều đề khác nhau.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE exam_part_questions (
exam_part_id UUID NOT NULL REFERENCES exam_parts(id) ON DELETE CASCADE,
question_id UUID NOT NULL REFERENCES question_bank(id),
order_index INT NOT NULL DEFAULT 0,
PRIMARY KEY (exam_part_id, question_id)
);

-- ============================================================
-- PHÂN HỆ 4: KẾT QUẢ & CHẤM ĐIỂM AI
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PHÂN HỆ 4: KẾT QUẢ THI THỬ (CHỈ LƯU ĐIỂM TỔNG)
-- ─────────────────────────────────────────────────────────────

-- Bảng này CHỈ phục vụ cho bài thi thử MOCK_TEST.
-- Luồng chạy: FE submit 1 JSON cực lớn -> BE chấm trắc nghiệm + gọi AI chấm tự luận
-- -> Trả kết quả Review nóng về FE -> Lưu duy nhất điểm tổng vào bảng này.
CREATE TABLE exam_attempts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
student_id UUID NOT NULL REFERENCES users(id),
exam_id UUID NOT NULL REFERENCES exam_sets(id),
status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
total_score INT NOT NULL, -- Điểm tổng quát cuối cùng
started_at TIMESTAMP NOT NULL DEFAULT NOW(),
finished_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- (Đã xóa bỏ hoàn toàn attempt_details, attempt_section_progress và ai_grading_results)
-- Hệ thống không lưu trữ lịch sử đáp án từng câu để tối ưu hóa hiệu năng và dung lượng.

-- ─────────────────────────────────────────────────────────────
-- PHÂN HỆ 5: TIẾN ĐỘ & PHỤ TRỢ
-- ─────────────────────────────────────────────────────────────

-- 5.1. Bảng student_progress — Bộ đếm tiến độ luyện tập
-- Bảng này CHỈ làm nhiệm vụ đếm số câu đã làm theo từng Part.
-- Không lưu điểm số, không lưu aggregate cho cả Skill (tự SUM từ Part nếu cần).
CREATE TABLE student_progress (
student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
skill_id INT NOT NULL REFERENCES skills(id),
part_number INT NOT NULL, -- Bắt buộc chỉ định Part
questions_answered INT NOT NULL DEFAULT 0,
PRIMARY KEY (student_id, skill_id, part_number)
);

CREATE TABLE learning_streaks (
student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
current_streak INT NOT NULL DEFAULT 0,
longest_streak INT NOT NULL DEFAULT 0,
last_activity DATE NOT NULL DEFAULT CURRENT_DATE
);

-- (Đã lược bỏ study_logs để đơn giản hóa, track tiến độ qua student_progress và learning_streaks)

CREATE TABLE study_materials (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
title VARCHAR(255) NOT NULL,
file_url TEXT NOT NULL,
file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('PDF', 'VIDEO')),
duration_seconds INT,
skill_id INT REFERENCES skills(id),
teacher_id UUID NOT NULL REFERENCES users(id),
deleted_at TIMESTAMP
);

CREATE TABLE notifications (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
receiver_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = broadcast toàn hệ thống
notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('SYSTEM', 'EXAM_REMINDER', 'GRADE_RESULT')),
title VARCHAR(200) NOT NULL,
message TEXT NOT NULL,
is_read BOOLEAN NOT NULL DEFAULT FALSE,
created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
setting_key VARCHAR(100) PRIMARY KEY,
setting_value TEXT NOT NULL
);

-- Dữ liệu mặc định
INSERT INTO system_settings (setting_key, setting_value) VALUES
('MOCK_TEST_DURATION_GRAMMAR', '25'),
('MOCK_TEST_DURATION_LISTENING', '30'),
('MOCK_TEST_DURATION_READING', '30'),
('MOCK_TEST_DURATION_WRITING', '30'),
('MOCK_TEST_DURATION_SPEAKING', '15');

-- ============================================================
-- INDEXES
-- ============================================================

-- Tiến độ học tập
CREATE INDEX idx_progress_student ON student_progress (student_id, skill_id);

-- Lịch sử bài làm (Chỉ Mock Test)
CREATE INDEX idx_attempts_student_status ON exam_attempts (student_id, status);

-- Tìm câu hỏi trong bank theo kỹ năng + part (dùng khi Admin filter để assign vào đề)
CREATE INDEX idx_qbank_skill_part ON question_bank (skill_id, part_number);

-- JSONB index cho extra_config (query theo task_variant, question_group_id...)
CREATE INDEX idx_qbank_extra_config ON question_bank USING GIN (extra_config);

-- Câu hỏi trong từng part của đề
CREATE INDEX idx_exam_part_questions_part ON exam_part_questions (exam_part_id, order_index);

-- ============================================================
-- TỔNG KẾT SỐ BẢNG
-- ============================================================
--
-- Auth & RBAC : users, user_profiles, system_menus, role_menu_access (4)
-- Exam Bank : skills, exam_sets, exam_sections, exam_parts (4)
-- Question Bank : question_bank, question_bank_options, exam_part_questions (3)
-- Attempts : exam_attempts (1)
-- Progress & Phụ : student_progress, learning_streaks, study_materials,
-- notifications, system_settings (5)
--
-- TỔNG : 17 bảng
-- (Đã tối ưu siêu triệt để: Xóa lịch sử đáp án, snapshot, xóa AI grading tables, xóa logs)
-- ============================================================
