-- Add explicit course kind to separate SCHOOL classes from ACADEMY tracks.
ALTER TABLE `course`
  ADD COLUMN `kind` ENUM('CLASS', 'TRACK') NOT NULL DEFAULT 'TRACK' AFTER `Name`;

-- Backfill existing data based on organization role.
UPDATE `course` c
JOIN `organization` o ON o.`id` = c.`Org_id`
SET c.`kind` = 'CLASS'
WHERE o.`Role` = 'SCHOOL';

UPDATE `course` c
JOIN `organization` o ON o.`id` = c.`Org_id`
SET c.`kind` = 'TRACK'
WHERE o.`Role` = 'ACADEMY';

CREATE INDEX `idx_course_kind` ON `course`(`kind`);

-- Subject-level pricing for academy material subscriptions.
ALTER TABLE `subject`
  ADD COLUMN `isPaid` BOOLEAN NOT NULL DEFAULT false AFTER `name`,
  ADD COLUMN `price` DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER `isPaid`;

CREATE INDEX `idx_subject_is_paid` ON `subject`(`isPaid`);

-- Per-student, per-subject subscription/payment record.
CREATE TABLE `student_subject_subscription` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_Academy_id` INT NOT NULL,
  `Subject_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `paymentMethod` VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  `status` VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
  `paidAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_student_subject_subscription` (`user_Academy_id`, `Subject_id`),
  INDEX `idx_student_subject_subscription_user` (`user_Academy_id`),
  INDEX `idx_student_subject_subscription_subject` (`Subject_id`),
  INDEX `idx_student_subject_subscription_status` (`status`),
  CONSTRAINT `fk_student_subject_subscription_academy_user`
    FOREIGN KEY (`user_Academy_id`) REFERENCES `academy_user`(`user_academy_id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_student_subject_subscription_subject`
    FOREIGN KEY (`Subject_id`) REFERENCES `subject`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
