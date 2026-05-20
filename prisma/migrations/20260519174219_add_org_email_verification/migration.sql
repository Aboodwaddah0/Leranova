-- AlterTable
ALTER TABLE `organization` ADD COLUMN `emailVerificationExpiresAt` TIMESTAMP(0) NULL,
    ADD COLUMN `emailVerificationToken` VARCHAR(255) NULL,
    ADD COLUMN `rejectionReason` TEXT NULL,
    MODIFY `status` ENUM('PENDING', 'EMAIL_VERIFIED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';
