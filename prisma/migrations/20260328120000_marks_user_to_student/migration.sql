-- Delete records that cannot be mapped to student before adding FK
DELETE FROM `marks`
WHERE `User_id` NOT IN (SELECT `Student_id` FROM `student`);

-- Drop old relation and index on user
ALTER TABLE `marks` DROP FOREIGN KEY `fk_marks_user`;
ALTER TABLE `marks` DROP INDEX `idx_marks_user_id`;

-- Rename column from user reference to student reference
ALTER TABLE `marks` CHANGE COLUMN `User_id` `Student_id` INTEGER NOT NULL;

-- Add index and foreign key to student table
ALTER TABLE `marks` ADD INDEX `idx_marks_student_id` (`Student_id`);
ALTER TABLE `marks` ADD CONSTRAINT `fk_marks_student`
FOREIGN KEY (`Student_id`) REFERENCES `student`(`Student_id`)
ON DELETE CASCADE ON UPDATE RESTRICT;
