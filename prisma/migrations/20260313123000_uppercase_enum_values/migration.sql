-- Expand enum sets temporarily to allow in-place value updates.
ALTER TABLE `user`
  MODIFY COLUMN `Gender` ENUM('Female','Male','FEMALE','MALE') NULL,
  MODIFY COLUMN `Role` ENUM('Student','Parent','Admin','Academy','Teacher','STUDENT','PARENT','ADMIN','ACADEMY','TEACHER') NOT NULL;

ALTER TABLE `organization`
  MODIFY COLUMN `Role` ENUM('Academy','School','ACADEMY','SCHOOL') NOT NULL;

ALTER TABLE `chats`
  MODIFY COLUMN `type` ENUM('group','private','GROUP','PRIVATE') NOT NULL;

-- Convert existing values to uppercase target set.
UPDATE `user`
SET `Gender` = CASE
  WHEN `Gender` = 'Female' THEN 'FEMALE'
  WHEN `Gender` = 'Male' THEN 'MALE'
  ELSE `Gender`
END;

UPDATE `user`
SET `Role` = CASE
  WHEN `Role` = 'Student' THEN 'STUDENT'
  WHEN `Role` = 'Parent' THEN 'PARENT'
  WHEN `Role` = 'Admin' THEN 'ADMIN'
  WHEN `Role` = 'Academy' THEN 'ACADEMY'
  WHEN `Role` = 'Teacher' THEN 'TEACHER'
  ELSE `Role`
END;

UPDATE `organization`
SET `Role` = CASE
  WHEN `Role` = 'Academy' THEN 'ACADEMY'
  WHEN `Role` = 'School' THEN 'SCHOOL'
  ELSE `Role`
END;

UPDATE `chats`
SET `type` = CASE
  WHEN `type` = 'group' THEN 'GROUP'
  WHEN `type` = 'private' THEN 'PRIVATE'
  ELSE `type`
END;

-- Lock enums to uppercase-only values.
ALTER TABLE `user`
  MODIFY COLUMN `Gender` ENUM('FEMALE','MALE') NULL,
  MODIFY COLUMN `Role` ENUM('STUDENT','PARENT','ADMIN','ACADEMY','TEACHER') NOT NULL;

ALTER TABLE `organization`
  MODIFY COLUMN `Role` ENUM('ACADEMY','SCHOOL') NOT NULL;

ALTER TABLE `chats`
  MODIFY COLUMN `type` ENUM('GROUP','PRIVATE') NOT NULL;
