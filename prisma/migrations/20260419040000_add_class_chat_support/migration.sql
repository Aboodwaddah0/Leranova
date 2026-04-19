-- Add class-based chat support while keeping existing chat behavior intact.
ALTER TABLE `chats`
  ADD COLUMN `class_id` INTEGER NULL AFTER `course_id`;

-- Extend existing enum values for class chat mode.
ALTER TABLE `chats`
  MODIFY `type` ENUM('GROUP', 'PRIVATE', 'COURSE_GROUP', 'CLASS_GROUP') NOT NULL;

CREATE INDEX `idx_chats_class_id` ON `chats`(`class_id`);

-- Ensure one class chat per organization/class pair.
CREATE UNIQUE INDEX `uq_chats_org_class` ON `chats`(`organization_id`, `class_id`);
