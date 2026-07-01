/*
  Warnings:

  - You are about to drop the column `mode` on the `exam_attempts` table. All the data in the column will be lost.
  - The `status` column on the `exam_attempts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `total_score` on the `exam_attempts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Integer`.
  - You are about to drop the `ai_grading_results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_details` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attempt_section_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_part_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_skill_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `study_logs` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `total_score` on table `exam_attempts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `finished_at` on table `exam_attempts` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `created_by` to the `exam_sets` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ai_grading_results" DROP CONSTRAINT "ai_grading_results_attempt_detail_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_details" DROP CONSTRAINT "attempt_details_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_details" DROP CONSTRAINT "attempt_details_question_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_section_progress" DROP CONSTRAINT "attempt_section_progress_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "attempt_section_progress" DROP CONSTRAINT "attempt_section_progress_section_id_fkey";

-- DropForeignKey
ALTER TABLE "question_options" DROP CONSTRAINT "question_options_question_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_part_id_fkey";

-- DropForeignKey
ALTER TABLE "student_part_progress" DROP CONSTRAINT "student_part_progress_skill_id_fkey";

-- DropForeignKey
ALTER TABLE "student_part_progress" DROP CONSTRAINT "student_part_progress_student_id_fkey";

-- DropForeignKey
ALTER TABLE "student_skill_progress" DROP CONSTRAINT "student_skill_progress_skill_id_fkey";

-- DropForeignKey
ALTER TABLE "student_skill_progress" DROP CONSTRAINT "student_skill_progress_student_id_fkey";

-- DropForeignKey
ALTER TABLE "study_logs" DROP CONSTRAINT "study_logs_user_id_fkey";

-- AlterTable
ALTER TABLE "exam_attempts" DROP COLUMN "mode",
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
ALTER COLUMN "total_score" SET NOT NULL,
ALTER COLUMN "total_score" SET DATA TYPE INTEGER,
ALTER COLUMN "finished_at" SET NOT NULL,
ALTER COLUMN "finished_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "exam_sets" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "overall_mock_avg" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "ai_grading_results";

-- DropTable
DROP TABLE "attempt_details";

-- DropTable
DROP TABLE "attempt_section_progress";

-- DropTable
DROP TABLE "question_options";

-- DropTable
DROP TABLE "questions";

-- DropTable
DROP TABLE "student_part_progress";

-- DropTable
DROP TABLE "student_skill_progress";

-- DropTable
DROP TABLE "study_logs";

-- DropEnum
DROP TYPE "AttemptMode";

-- DropEnum
DROP TYPE "AttemptStatus";

-- DropEnum
DROP TYPE "GradingStatus";

-- DropEnum
DROP TYPE "SectionStatus";

-- CreateTable
CREATE TABLE "question_bank" (
    "id" SERIAL NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "part_number" INTEGER NOT NULL,
    "content" TEXT,
    "media_url" TEXT,
    "question_type" "QuestionType" NOT NULL,
    "extra_config" JSONB,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_options" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "question_bank_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_part_questions" (
    "exam_part_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "exam_part_questions_pkey" PRIMARY KEY ("exam_part_id","question_id")
);

-- CreateTable
CREATE TABLE "student_progress" (
    "student_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "part_number" INTEGER NOT NULL,
    "questions_answered" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("student_id","skill_id","part_number")
);

-- CreateIndex
CREATE INDEX "idx_qbank_skill_part" ON "question_bank"("skill_id", "part_number");

-- CreateIndex
CREATE INDEX "idx_qbank_extra_config" ON "question_bank" USING GIN ("extra_config");

-- CreateIndex
CREATE INDEX "idx_exam_part_questions_part" ON "exam_part_questions"("exam_part_id", "order_index");

-- CreateIndex
CREATE INDEX "idx_progress_student" ON "student_progress"("student_id", "skill_id");

-- CreateIndex
CREATE INDEX "idx_attempts_student_status" ON "exam_attempts"("student_id", "status");

-- AddForeignKey
ALTER TABLE "exam_sets" ADD CONSTRAINT "exam_sets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_options" ADD CONSTRAINT "question_bank_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_part_questions" ADD CONSTRAINT "exam_part_questions_exam_part_id_fkey" FOREIGN KEY ("exam_part_id") REFERENCES "exam_parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_part_questions" ADD CONSTRAINT "exam_part_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
