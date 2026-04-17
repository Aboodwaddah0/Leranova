-- Add payment fields to course table
ALTER TABLE `course` ADD COLUMN `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE `course` ADD COLUMN `isPaid` BOOLEAN NOT NULL DEFAULT FALSE;

-- Create student_course_payment table to track individual student payments for courses
CREATE TABLE `student_course_payment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_Academy_id` INT NOT NULL,
  `Course_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `paymentMethod` VARCHAR(50) NOT NULL DEFAULT 'STRIPE',
  `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  `stripePaymentIntentId` VARCHAR(500),
  `paidAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_course_payment` (`user_Academy_id`, `Course_id`),
  FOREIGN KEY `fk_student_course_payment_academy_user` (`user_Academy_id`) REFERENCES `academy_user` (`user_academy_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  FOREIGN KEY `fk_student_course_payment_course` (`Course_id`) REFERENCES `course` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  INDEX `idx_student_course_payment_user` (`user_Academy_id`),
  INDEX `idx_student_course_payment_course` (`Course_id`),
  INDEX `idx_student_course_payment_status` (`status`)
);

-- Create index for faster lookups
ALTER TABLE `course` ADD INDEX `idx_course_is_paid` (`isPaid`);
