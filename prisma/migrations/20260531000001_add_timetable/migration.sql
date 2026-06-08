CREATE TABLE `timetable_slot` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `orgId` INT NOT NULL,
  `trackId` INT NOT NULL,
  `courseId` INT NOT NULL,
  `teacherId` INT NULL,
  `dayOfWeek` INT NOT NULL,
  `startTime` VARCHAR(5) NOT NULL,
  `endTime` VARCHAR(5) NOT NULL,
  `roomNumber` VARCHAR(50) NULL,
  `academicYearId` INT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `uq_timetable_class_day_time`(`trackId`, `dayOfWeek`, `startTime`),
  INDEX `idx_timetable_org`(`orgId`),
  INDEX `idx_timetable_track`(`trackId`),
  INDEX `idx_timetable_teacher`(`teacherId`),
  INDEX `idx_timetable_academic_year`(`academicYearId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `timetable_slot` ADD CONSTRAINT `fk_timetable_org`     FOREIGN KEY (`orgId`)          REFERENCES `organization`(`id`)  ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `timetable_slot` ADD CONSTRAINT `fk_timetable_track`   FOREIGN KEY (`trackId`)         REFERENCES `course`(`id`)        ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `timetable_slot` ADD CONSTRAINT `fk_timetable_course`  FOREIGN KEY (`courseId`)        REFERENCES `subject`(`id`)       ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `timetable_slot` ADD CONSTRAINT `fk_timetable_teacher` FOREIGN KEY (`teacherId`)       REFERENCES `teacher`(`Teacher_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `timetable_slot` ADD CONSTRAINT `fk_timetable_year`    FOREIGN KEY (`academicYearId`) REFERENCES `academic_year`(`id`)  ON DELETE SET NULL ON UPDATE RESTRICT;
