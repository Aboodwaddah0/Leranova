-- AddColumn: fcmToken to user table for Firebase Cloud Messaging push notifications
ALTER TABLE `user` ADD COLUMN `fcmToken` VARCHAR(500) NULL;
