ALTER TABLE `user`
  ADD COLUMN `passwordResetToken` VARCHAR(255) NULL,
  ADD COLUMN `passwordResetExpiresAt` TIMESTAMP NULL,
  ADD COLUMN `passwordChangedAt` TIMESTAMP NULL;

ALTER TABLE `organization`
  ADD COLUMN `PasswordResetToken` VARCHAR(255) NULL,
  ADD COLUMN `PasswordResetExpiresAt` TIMESTAMP NULL,
  ADD COLUMN `PasswordChangedAt` TIMESTAMP NULL;
