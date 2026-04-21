ALTER TABLE `messages`
  ADD COLUMN `reply_to_message_id` INT NULL;

CREATE INDEX `idx_messages_reply_to_message_id`
  ON `messages`(`reply_to_message_id`);

ALTER TABLE `messages`
  ADD CONSTRAINT `fk_messages_reply_to_message_id`
  FOREIGN KEY (`reply_to_message_id`) REFERENCES `messages`(`id`)
  ON DELETE SET NULL
  ON UPDATE RESTRICT;
