-- Add class-based daily unique constraint (one record per student per class per day)
ALTER TABLE `attendance` ADD UNIQUE INDEX `uq_student_class_attendance_date`(`studentId`, `classId`, `date`);
