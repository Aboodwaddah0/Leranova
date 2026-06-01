-- AlterTable
ALTER TABLE `lesson_progress` ADD COLUMN `videoDurationSeconds` INTEGER NULL,
    ADD COLUMN `watchedSeconds` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `student_certificate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `orgId` INTEGER NOT NULL,
    `subjectId` INTEGER NOT NULL,
    `trackId` INTEGER NOT NULL,
    `issuedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_cert_student`(`studentId`),
    INDEX `idx_cert_org`(`orgId`),
    UNIQUE INDEX `uq_student_cert_subject`(`studentId`, `subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_certificate` ADD CONSTRAINT `fk_cert_student` FOREIGN KEY (`studentId`) REFERENCES `student`(`Student_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `student_certificate` ADD CONSTRAINT `fk_cert_org` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `student_certificate` ADD CONSTRAINT `fk_cert_subject` FOREIGN KEY (`subjectId`) REFERENCES `subject`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `student_certificate` ADD CONSTRAINT `fk_cert_track` FOREIGN KEY (`trackId`) REFERENCES `course`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
