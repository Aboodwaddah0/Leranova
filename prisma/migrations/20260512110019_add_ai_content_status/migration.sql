-- AlterTable
ALTER TABLE `lesson_ai_content` ADD COLUMN `publishedAt` DATETIME(3) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'draft';
