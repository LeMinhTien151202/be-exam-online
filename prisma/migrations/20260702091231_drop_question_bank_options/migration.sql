/*
  Warnings:

  - You are about to drop the `question_bank_options` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "question_bank_options" DROP CONSTRAINT "question_bank_options_question_id_fkey";

-- DropTable
DROP TABLE "question_bank_options";
