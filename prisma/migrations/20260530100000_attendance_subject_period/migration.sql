-- Drop old per-day unique constraint to allow multiple period entries per student per day
ALTER TABLE `attendance` DROP INDEX `uq_student_attendance_date`;

-- Add subjectId column (nullable — links attendance record to the specific subject/period)
ALTER TABLE `attendance` ADD COLUMN `subjectId` INTEGER NULL;

-- FK from attendance.subjectId → subject.id
ALTER TABLE `attendance` ADD CONSTRAINT `fk_attendance_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- Index for fast subject-based queries
CREATE INDEX `idx_attendance_subject` ON `attendance`(`subjectId`);

-- New unique constraint: one record per student per subject per day
ALTER TABLE `attendance` ADD UNIQUE INDEX `uq_student_subject_attendance_date`(`studentId`, `subjectId`, `date`);
