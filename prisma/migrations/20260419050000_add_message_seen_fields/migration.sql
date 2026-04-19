-- Add read/seen tracking to chat messages.
ALTER TABLE `messages`
  ADD COLUMN `is_seen` BOOLEAN NOT NULL DEFAULT false AFTER `sent_at`,
  ADD COLUMN `seen_at` DATETIME(0) NULL AFTER `is_seen`;

CREATE INDEX `idx_messages_chat_seen` ON `messages`(`chat_id`, `is_seen`);
