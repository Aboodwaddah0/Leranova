-- AlterTable
ALTER TABLE `teacher` ADD COLUMN `OrgId` INTEGER NULL,
    ADD COLUMN `bio` TEXT NULL,
    ADD COLUMN `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `specialization` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `idx_teacher_org_id` ON `teacher`(`OrgId`);

-- AddForeignKey
ALTER TABLE `teacher` ADD CONSTRAINT `fk_teacher_org` FOREIGN KEY (`OrgId`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
