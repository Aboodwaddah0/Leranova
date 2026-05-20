-- AlterTable: add video overview fields to lesson_ai_content
ALTER TABLE `lesson_ai_content`
    ADD COLUMN `videoOverviewUrl` VARCHAR(500) NULL,
    ADD COLUMN `videoOverviewStatus` VARCHAR(20) NULL;
