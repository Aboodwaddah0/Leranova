CREATE TABLE `lesson_progress` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `studentId` INT NOT NULL,
  `lessonId` INT NOT NULL,
  `isCompleted` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `uq_lesson_progress_student_lesson`(`studentId`, `lessonId`),
  INDEX `idx_lesson_progress_student`(`studentId`),
  INDEX `idx_lesson_progress_lesson`(`lessonId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `lesson_progress`
  ADD CONSTRAINT `fk_lesson_progress_student`
    FOREIGN KEY (`studentId`) REFERENCES `user`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_lesson_progress_lesson`
    FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT;
