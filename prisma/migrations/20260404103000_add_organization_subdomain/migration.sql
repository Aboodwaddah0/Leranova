ALTER TABLE `organization`
  ADD COLUMN `subdomain` VARCHAR(63) NULL AFTER `Name`;

UPDATE `organization`
SET `subdomain` = CONCAT('org', `id`)
WHERE `subdomain` IS NULL OR `subdomain` = '';

ALTER TABLE `organization`
  MODIFY COLUMN `subdomain` VARCHAR(63) NOT NULL,
  ADD UNIQUE INDEX `organization_subdomain_key`(`subdomain`);
