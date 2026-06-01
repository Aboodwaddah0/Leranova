-- Fix: remove unique constraint that incorrectly limits orgs to 2 academic years max.
-- Only one active year per org is enforced at application level (updateMany before activate).
DROP INDEX `uq_org_active_academic_year` ON `academic_year`;

-- Add composite index for efficient "find active year for org X" queries
CREATE INDEX `idx_academic_year_org_active` ON `academic_year`(`OrgId`, `isActive`);

-- Add academicYearId to attendance so records are scoped to a session
ALTER TABLE `attendance` ADD COLUMN `academicYearId` INTEGER NULL;
CREATE INDEX `idx_attendance_academic_year` ON `attendance`(`academicYearId`);
ALTER TABLE `attendance` ADD CONSTRAINT `fk_attendance_academic_year` FOREIGN KEY (`academicYearId`) REFERENCES `academic_year`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
