ALTER TABLE `chats`
  ADD COLUMN `course_id` INTEGER NULL,
  ADD UNIQUE INDEX `chats_course_id_key`(`course_id`),
  ADD INDEX `idx_chats_course_id`(`course_id`);

ALTER TABLE `chats`
  ADD CONSTRAINT `fk_chats_course` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE `chats`
  MODIFY `type` ENUM('GROUP', 'PRIVATE', 'COURSE_GROUP') NOT NULL;
