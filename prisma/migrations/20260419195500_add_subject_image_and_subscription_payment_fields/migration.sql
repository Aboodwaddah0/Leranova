ALTER TABLE `subject`
  ADD COLUMN `imageUrl` VARCHAR(500) NOT NULL DEFAULT '' AFTER `price`;

ALTER TABLE `student_subject_subscription`
  ADD COLUMN `paymentStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING' AFTER `paymentMethod`,
  ADD COLUMN `stripeSessionId` VARCHAR(500) NULL AFTER `paymentStatus`;

UPDATE `student_subject_subscription`
SET `paymentStatus` = CASE
  WHEN UPPER(`status`) IN ('SUCCESS', 'PAID') THEN 'PAID'
  ELSE 'PENDING'
END;

CREATE INDEX `idx_student_subject_subscription_payment_status`
  ON `student_subject_subscription`(`paymentStatus`);
