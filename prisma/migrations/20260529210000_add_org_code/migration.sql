-- Add unique organization code used as prefix in registration numbers
ALTER TABLE `organization` ADD COLUMN `organizationCode` VARCHAR(20) NULL;
ALTER TABLE `organization` ADD UNIQUE INDEX `organization_organizationCode_key` (`organizationCode`);
