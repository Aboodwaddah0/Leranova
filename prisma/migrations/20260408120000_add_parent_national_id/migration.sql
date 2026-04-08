ALTER TABLE `parent`
ADD COLUMN `nationalId` VARCHAR(50) NULL;

CREATE UNIQUE INDEX `parent_nationalId_key` ON `parent`(`nationalId`);
