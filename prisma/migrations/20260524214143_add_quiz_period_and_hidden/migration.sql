-- AlterTable
ALTER TABLE `quiz` ADD COLUMN `availableFrom` TIMESTAMP(0) NULL,
    ADD COLUMN `availableTo` TIMESTAMP(0) NULL,
    ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false;
