-- AlterTable
ALTER TABLE `lesson` ADD COLUMN `Description` TEXT NULL,
    ADD COLUMN `videoPublicId` VARCHAR(255) NULL,
    ADD COLUMN `videoResourceType` VARCHAR(50) NULL,
    ADD COLUMN `videoUrl` VARCHAR(500) NULL;
