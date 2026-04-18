-- AlterTable
ALTER TABLE `lesson` ADD COLUMN `duration` VARCHAR(50) NULL,
    ADD COLUMN `isCompleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `subscription` ALTER COLUMN `endDate` DROP DEFAULT;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `phone` VARCHAR(50) NULL;
