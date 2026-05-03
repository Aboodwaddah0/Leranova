/*
  Warnings:

  - You are about to drop the column `End` on the `course` table. All the data in the column will be lost.
  - You are about to drop the column `Start` on the `course` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `isCompleted` on the `lesson` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `user` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `messages` DROP FOREIGN KEY `fk_messages_reply_to_message_id`;

-- DropIndex
DROP INDEX `idx_messages_chat_seen` ON `messages`;

-- DropIndex
DROP INDEX `idx_student_subject_subscription_payment_status` ON `student_subject_subscription`;

-- AlterTable
ALTER TABLE `academy_user` ADD COLUMN `DOB` DATE NULL;

-- AlterTable
ALTER TABLE `course` DROP COLUMN `End`,
    DROP COLUMN `Start`;

-- AlterTable
ALTER TABLE `lesson` DROP COLUMN `duration`,
    DROP COLUMN `isCompleted`;

-- AlterTable
ALTER TABLE `messages` MODIFY `seen_at` TIMESTAMP(0) NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `phone`;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_reply_to_message_id_fkey` FOREIGN KEY (`reply_to_message_id`) REFERENCES `messages`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
