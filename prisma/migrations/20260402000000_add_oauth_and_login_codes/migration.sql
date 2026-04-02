-- Add OAuth fields to organization table
ALTER TABLE `organization` ADD COLUMN `oauthProvider` VARCHAR(50);
ALTER TABLE `organization` ADD COLUMN `oauthId` VARCHAR(255);
ALTER TABLE `organization` ADD UNIQUE KEY `oauthId` (`oauthId`);

-- Add OAuth fields to user table
ALTER TABLE `user` ADD COLUMN `oauthProvider` VARCHAR(50);
ALTER TABLE `user` ADD COLUMN `oauthId` VARCHAR(255);
ALTER TABLE `user` ADD UNIQUE KEY `oauthId_user` (`oauthId`);

-- Create login_code table
CREATE TABLE `login_code` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `code` VARCHAR(10) NOT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `expiresAt` DATETIME NOT NULL,
  `isUsed` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_login_code_user_id` (`userId`),
  INDEX `idx_login_code_expires_at` (`expiresAt`),
  CONSTRAINT `login_code_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
);
