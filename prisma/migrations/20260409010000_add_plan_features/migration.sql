-- AlterTable
ALTER TABLE `plan`
ADD COLUMN `features` JSON NULL AFTER `description`;
