-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('PART_PRACTICE', 'SKILL_FULL_SET', 'MOCK_TEST');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MC', 'ORDERING', 'WORD_BANK', 'HEADING_MATCH', 'SPEAKER_MATCH', 'ESSAY', 'RECORD');

-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('PART', 'SKILL', 'FULL');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GradingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PDF', 'VIDEO');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'EXAM_REMINDER', 'GRADE_RESULT');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" INTEGER NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "avatar_url" TEXT,
    "target_date" DATE,
    "aptis_goal" VARCHAR(10),
    "school_name" VARCHAR(255),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "system_menus" (
    "id" SERIAL NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(50),
    "parent_id" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "system_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_menu_access" (
    "role" "Role" NOT NULL,
    "menu_id" INTEGER NOT NULL,

    CONSTRAINT "role_menu_access_pkey" PRIMARY KEY ("role","menu_id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "total_parts" INTEGER NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sets" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "ExamType" NOT NULL,
    "skill_id" INTEGER,
    "part_number" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "exam_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sections" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_parts" (
    "id" SERIAL NOT NULL,
    "section_id" INTEGER NOT NULL,
    "part_number" INTEGER NOT NULL,
    "instruction" TEXT,
    "audio_url" TEXT,

    CONSTRAINT "exam_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "part_id" INTEGER NOT NULL,
    "content" TEXT,
    "media_url" TEXT,
    "question_type" "QuestionType" NOT NULL,
    "extra_config" JSONB,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "mode" "AttemptMode" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "total_score" DECIMAL(5,2),
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(6),

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_section_progress" (
    "id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "section_id" INTEGER NOT NULL,
    "status" "SectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "attempt_section_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_details" (
    "id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "question_snapshot" JSONB NOT NULL,
    "answer_text" TEXT,
    "answer_json" JSONB,
    "audio_url" TEXT,
    "is_correct" BOOLEAN,
    "score_earned" DECIMAL(5,2),

    CONSTRAINT "attempt_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_grading_results" (
    "id" SERIAL NOT NULL,
    "attempt_detail_id" INTEGER NOT NULL,
    "grading_status" "GradingStatus" NOT NULL DEFAULT 'PENDING',
    "fluency_score" DECIMAL(4,2),
    "grammar_score" DECIMAL(4,2),
    "vocabulary_score" DECIMAL(4,2),
    "coherence_score" DECIMAL(4,2),
    "register_score" DECIMAL(4,2),
    "ai_feedback" TEXT,
    "suggested_improvement" TEXT,

    CONSTRAINT "ai_grading_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_part_progress" (
    "student_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "part_number" INTEGER NOT NULL,
    "questions_answered" INTEGER NOT NULL DEFAULT 0,
    "sessions_count" INTEGER NOT NULL DEFAULT 0,
    "last_practiced_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_part_progress_pkey" PRIMARY KEY ("student_id","skill_id","part_number")
);

-- CreateTable
CREATE TABLE "student_skill_progress" (
    "student_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "sets_completed" INTEGER NOT NULL DEFAULT 0,
    "overall_avg" DECIMAL(5,2),
    "last_updated" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_skill_progress_pkey" PRIMARY KEY ("student_id","skill_id")
);

-- CreateTable
CREATE TABLE "learning_streaks" (
    "student_id" INTEGER NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_streaks_pkey" PRIMARY KEY ("student_id")
);

-- CreateTable
CREATE TABLE "study_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "mode" "AttemptMode" NOT NULL,
    "minutes_spent" INTEGER NOT NULL,
    "activity_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_materials" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "duration_seconds" INTEGER,
    "skill_id" INTEGER,
    "teacher_id" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "study_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "receiver_id" INTEGER,
    "notification_type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("setting_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_questions_part" ON "questions"("part_id");

-- CreateIndex
CREATE INDEX "idx_questions_extra_config" ON "questions" USING GIN ("extra_config");

-- CreateIndex
CREATE INDEX "idx_attempts_student_status" ON "exam_attempts"("student_id", "status");

-- CreateIndex
CREATE INDEX "idx_attempt_details_attempt" ON "attempt_details"("attempt_id");

-- CreateIndex
CREATE INDEX "idx_ai_grading_status" ON "ai_grading_results"("grading_status");

-- CreateIndex
CREATE INDEX "idx_part_progress_student" ON "student_part_progress"("student_id", "skill_id");

-- CreateIndex
CREATE INDEX "idx_skill_progress_student" ON "student_skill_progress"("student_id", "skill_id");

-- CreateIndex
CREATE INDEX "idx_study_logs_user_date" ON "study_logs"("user_id", "activity_at");

-- CreateIndex
CREATE INDEX "idx_notifications_receiver" ON "notifications"("receiver_id", "is_read");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_menus" ADD CONSTRAINT "system_menus_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "system_menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu_access" ADD CONSTRAINT "role_menu_access_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "system_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sets" ADD CONSTRAINT "exam_sets_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exam_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_parts" ADD CONSTRAINT "exam_parts_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "exam_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exam_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_section_progress" ADD CONSTRAINT "attempt_section_progress_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_section_progress" ADD CONSTRAINT "attempt_section_progress_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_details" ADD CONSTRAINT "attempt_details_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_details" ADD CONSTRAINT "attempt_details_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_grading_results" ADD CONSTRAINT "ai_grading_results_attempt_detail_id_fkey" FOREIGN KEY ("attempt_detail_id") REFERENCES "attempt_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_part_progress" ADD CONSTRAINT "student_part_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_part_progress" ADD CONSTRAINT "student_part_progress_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skill_progress" ADD CONSTRAINT "student_skill_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skill_progress" ADD CONSTRAINT "student_skill_progress_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_streaks" ADD CONSTRAINT "learning_streaks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_logs" ADD CONSTRAINT "study_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
