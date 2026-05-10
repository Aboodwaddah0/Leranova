-- CreateTable
CREATE TABLE `academic_year` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `OrgId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `numberOfTerms` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_academic_year_org`(`OrgId`),
    INDEX `idx_academic_year_is_active`(`isActive`),
    UNIQUE INDEX `uq_org_active_academic_year`(`OrgId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `term` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academicYearId` INTEGER NOT NULL,
    `termNumber` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'CLOSED', 'LOCKED') NOT NULL DEFAULT 'PLANNED',
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_term_academic_year`(`academicYearId`),
    INDEX `idx_term_status`(`status`),
    INDEX `idx_term_start_date`(`startDate`),
    INDEX `idx_term_end_date`(`endDate`),
    UNIQUE INDEX `uq_academic_year_term_number`(`academicYearId`, `termNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `term_edit_audit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `termId` INTEGER NOT NULL,
    `OrgId` INTEGER NOT NULL,
    `updatedByUserId` INTEGER NOT NULL,
    `oldValues` JSON NULL,
    `newValues` JSON NULL,
    `actionType` VARCHAR(50) NOT NULL,
    `changeReason` TEXT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_term_audit_term`(`termId`),
    INDEX `idx_term_audit_org`(`OrgId`),
    INDEX `idx_term_audit_user`(`updatedByUserId`),
    INDEX `idx_term_audit_action_type`(`actionType`),
    INDEX `idx_term_audit_created_at`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `academic_year` ADD CONSTRAINT `fk_academic_year_org` FOREIGN KEY (`OrgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `term` ADD CONSTRAINT `fk_term_academic_year` FOREIGN KEY (`academicYearId`) REFERENCES `academic_year`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `term_edit_audit` ADD CONSTRAINT `fk_term_audit_term` FOREIGN KEY (`termId`) REFERENCES `term`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `term_edit_audit` ADD CONSTRAINT `fk_term_audit_org` FOREIGN KEY (`OrgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `term_edit_audit` ADD CONSTRAINT `fk_term_audit_user` FOREIGN KEY (`updatedByUserId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
