-- CreateTable
CREATE TABLE `school_event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `type` ENUM('HOLIDAY', 'EXAM', 'PTA_MEETING', 'ACTIVITY', 'ANNOUNCEMENT', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `termId` INTEGER NULL,
    `createdBy` INTEGER NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_school_event_org`(`orgId`),
    INDEX `idx_school_event_term`(`termId`),
    INDEX `idx_school_event_start`(`startDate`),
    INDEX `idx_school_event_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `classId` INTEGER NOT NULL,
    `orgId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED') NOT NULL DEFAULT 'PRESENT',
    `markedBy` INTEGER NOT NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_attendance_class_date`(`classId`, `date`),
    INDEX `idx_attendance_org_date`(`orgId`, `date`),
    INDEX `idx_attendance_student`(`studentId`),
    UNIQUE INDEX `uq_student_attendance_date`(`studentId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `school_event` ADD CONSTRAINT `fk_school_event_org` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `school_event` ADD CONSTRAINT `fk_school_event_term` FOREIGN KEY (`termId`) REFERENCES `term`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `school_event` ADD CONSTRAINT `fk_school_event_creator` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `fk_attendance_student` FOREIGN KEY (`studentId`) REFERENCES `student`(`Student_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `fk_attendance_class` FOREIGN KEY (`classId`) REFERENCES `course`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `fk_attendance_org` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `fk_attendance_marker` FOREIGN KEY (`markedBy`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
