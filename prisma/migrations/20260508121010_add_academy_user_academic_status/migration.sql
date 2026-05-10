-- AlterTable
ALTER TABLE `academy_user` ADD COLUMN `AcademicStatus` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX `idx_academy_user_academic_status` ON `academy_user`(`AcademicStatus`);
