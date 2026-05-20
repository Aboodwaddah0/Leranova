-- AlterTable
ALTER TABLE `quiz_attempt` ADD COLUMN `aiGrading` JSON NULL;

-- AlterTable
ALTER TABLE `quiz_question` ADD COLUMN `expectedAnswer` TEXT NULL,
    ADD COLUMN `type` VARCHAR(30) NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    MODIFY `correctAnswer` INTEGER NULL;
