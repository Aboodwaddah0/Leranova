-- CreateTable
CREATE TABLE `student_note` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `teacherId` INTEGER NOT NULL,
    `orgId` INTEGER NOT NULL,
    `title` VARCHAR(255) NULL,
    `content` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `student_note_studentId_idx`(`studentId`),
    INDEX `student_note_teacherId_idx`(`teacherId`),
    INDEX `student_note_orgId_idx`(`orgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_note` ADD CONSTRAINT `student_note_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `student`(`Student_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_note` ADD CONSTRAINT `student_note_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teacher`(`Teacher_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_note` ADD CONSTRAINT `student_note_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
