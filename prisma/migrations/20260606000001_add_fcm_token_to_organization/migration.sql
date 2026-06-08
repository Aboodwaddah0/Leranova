-- Add fcmToken to organization table so org users can receive push notifications
ALTER TABLE `organization` ADD COLUMN `fcmToken` VARCHAR(500) NULL;
