-- Rename subdomain to portal (preserves existing row data)
ALTER TABLE `organization` RENAME COLUMN `subdomain` TO `portal`;
