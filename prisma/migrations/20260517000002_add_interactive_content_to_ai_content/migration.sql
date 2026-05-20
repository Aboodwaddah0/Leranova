ALTER TABLE `lesson_ai_content`
    ADD COLUMN `interactiveContent` JSON NULL,
    ADD COLUMN `interactiveStatus` VARCHAR(20) NULL;
