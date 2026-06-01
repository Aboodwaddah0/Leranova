-- Add isPublished flag so org admin controls student visibility
ALTER TABLE `student_certificate` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT FALSE;

-- Add termId so school certs are scoped to a term
ALTER TABLE `student_certificate` ADD COLUMN `termId` INTEGER NULL;
ALTER TABLE `student_certificate` ADD CONSTRAINT `fk_cert_term` FOREIGN KEY (`termId`) REFERENCES `term`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
CREATE INDEX `idx_cert_term` ON `student_certificate`(`termId`);
CREATE INDEX `idx_cert_published` ON `student_certificate`(`isPublished`);
