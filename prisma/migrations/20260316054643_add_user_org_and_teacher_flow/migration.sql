/*
  Warnings:

  - Made the column `OrgId` on table `teacher` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `teacher` DROP FOREIGN KEY `fk_teacher_org`;

-- AlterTable
ALTER TABLE `teacher` MODIFY `OrgId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `OrgId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `idx_user_org_id` ON `user`(`OrgId`);

-- AddForeignKey
ALTER TABLE `teacher` ADD CONSTRAINT `fk_teacher_org` FOREIGN KEY (`OrgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `fk_user_org` FOREIGN KEY (`OrgId`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
