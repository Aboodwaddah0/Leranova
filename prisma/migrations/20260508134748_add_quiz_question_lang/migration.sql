-- AlterTable
ALTER TABLE `quiz_question` ADD COLUMN `lang` VARCHAR(5) NOT NULL DEFAULT 'ar';

-- CreateIndex
CREATE INDEX `idx_quiz_question_quiz_lang` ON `quiz_question`(`quizId`, `lang`);
