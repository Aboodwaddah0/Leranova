-- Convert enum columns through VARCHAR first because MySQL treats enum values
-- case-insensitively under the default collation and will reject pairs like
-- 'Female' and 'FEMALE' in the same enum definition.
ALTER TABLE `user`
  MODIFY COLUMN `Gender` VARCHAR(10) NULL,
  MODIFY COLUMN `Role` VARCHAR(20) NOT NULL;

ALTER TABLE `organization`
  MODIFY COLUMN `Role` VARCHAR(20) NOT NULL;

ALTER TABLE `chats`
  MODIFY COLUMN `type` VARCHAR(20) NOT NULL;

UPDATE `user`
SET `Gender` = UPPER(`Gender`)
WHERE `Gender` IS NOT NULL;

UPDATE `user`
SET `Role` = UPPER(`Role`);

UPDATE `organization`
SET `Role` = UPPER(`Role`);

UPDATE `chats`
SET `type` = UPPER(`type`);

ALTER TABLE `user`
  MODIFY COLUMN `Gender` ENUM('FEMALE','MALE') NULL,
  MODIFY COLUMN `Role` ENUM('STUDENT','PARENT','ADMIN','ACADEMY','TEACHER') NOT NULL;

ALTER TABLE `organization`
  MODIFY COLUMN `Role` ENUM('ACADEMY','SCHOOL') NOT NULL;

ALTER TABLE `chats`
  MODIFY COLUMN `type` ENUM('GROUP','PRIVATE') NOT NULL;
