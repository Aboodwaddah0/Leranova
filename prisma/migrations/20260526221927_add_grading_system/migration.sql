-- AlterTable
ALTER TABLE `marks` ADD COLUMN `componentId` INTEGER NULL,
    ADD COLUMN `termId` INTEGER NULL;

-- AlterTable
ALTER TABLE `organization_school_settings` ADD COLUMN `allowConditionalPromotion` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `conditionalMaxFailed` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `maxFailedSubjects` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `requiredSubjectIds` JSON NULL;

-- AlterTable
ALTER TABLE `student_promotion_history` ADD COLUMN `academicYearId` INTEGER NULL,
    MODIFY `decision` VARCHAR(30) NOT NULL,
    MODIFY `reason` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `assessment_component` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `OrgId` INTEGER NOT NULL,
    `subjectId` INTEGER NULL,
    `termId` INTEGER NULL,
    `name` VARCHAR(100) NOT NULL,
    `weight` DECIMAL(5, 2) NOT NULL,
    `maxScore` DECIMAL(5, 2) NOT NULL DEFAULT 100,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_assessment_component_org`(`OrgId`),
    INDEX `idx_assessment_component_subject`(`subjectId`),
    INDEX `idx_assessment_component_term`(`termId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grade_scale` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `OrgId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL DEFAULT 'Standard',
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `grade_scale_OrgId_key`(`OrgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grade_scale_range` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gradeScaleId` INTEGER NOT NULL,
    `grade` VARCHAR(10) NOT NULL,
    `minScore` DECIMAL(5, 2) NOT NULL,
    `maxScore` DECIMAL(5, 2) NOT NULL,
    `gpaPoints` DECIMAL(3, 2) NULL,
    `isPassing` BOOLEAN NOT NULL DEFAULT true,

    INDEX `idx_grade_scale_range_scale`(`gradeScaleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `computed_grade` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `subjectId` INTEGER NOT NULL,
    `termId` INTEGER NOT NULL,
    `OrgId` INTEGER NOT NULL,
    `rawScore` DECIMAL(5, 2) NOT NULL,
    `letterGrade` VARCHAR(10) NULL,
    `gpaPoints` DECIMAL(3, 2) NULL,
    `isPassed` BOOLEAN NOT NULL,
    `computedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_computed_grade_org`(`OrgId`),
    INDEX `idx_computed_grade_student`(`studentId`),
    INDEX `idx_computed_grade_term`(`termId`),
    INDEX `idx_computed_grade_subject`(`subjectId`),
    UNIQUE INDEX `uq_computed_grade_student_subject_term`(`studentId`, `subjectId`, `termId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_marks_term_id` ON `marks`(`termId`);

-- CreateIndex
CREATE INDEX `idx_marks_component_id` ON `marks`(`componentId`);

-- CreateIndex
CREATE INDEX `idx_student_promotion_history_academic_year` ON `student_promotion_history`(`academicYearId`);

-- AddForeignKey
ALTER TABLE `marks` ADD CONSTRAINT `fk_marks_term` FOREIGN KEY (`termId`) REFERENCES `term`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `marks` ADD CONSTRAINT `fk_marks_component` FOREIGN KEY (`componentId`) REFERENCES `assessment_component`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `student_promotion_history` ADD CONSTRAINT `fk_promotion_history_academic_year` FOREIGN KEY (`academicYearId`) REFERENCES `academic_year`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_component` ADD CONSTRAINT `fk_assessment_component_term` FOREIGN KEY (`termId`) REFERENCES `term`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `assessment_component` ADD CONSTRAINT `fk_assessment_component_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `grade_scale_range` ADD CONSTRAINT `fk_grade_scale_range_scale` FOREIGN KEY (`gradeScaleId`) REFERENCES `grade_scale`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `computed_grade` ADD CONSTRAINT `fk_computed_grade_student` FOREIGN KEY (`studentId`) REFERENCES `student`(`Student_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `computed_grade` ADD CONSTRAINT `fk_computed_grade_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `computed_grade` ADD CONSTRAINT `fk_computed_grade_term` FOREIGN KEY (`termId`) REFERENCES `term`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
