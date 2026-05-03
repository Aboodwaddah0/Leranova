-- Add an optional teacher assignment to courses.
ALTER TABLE `course`
  ADD COLUMN `Teacher_id` INT NULL AFTER `Org_id`;

CREATE INDEX `idx_course_teacher_id` ON `course`(`Teacher_id`);

ALTER TABLE `course`
  ADD CONSTRAINT `fk_course_teacher`
    FOREIGN KEY (`Teacher_id`) REFERENCES `teacher`(`Teacher_id`)
    ON DELETE SET NULL
    ON UPDATE RESTRICT;
