-- DropForeignKey
ALTER TABLE `term_edit_audit` DROP FOREIGN KEY `fk_term_audit_org`;

-- DropForeignKey
ALTER TABLE `term_edit_audit` DROP FOREIGN KEY `fk_term_audit_user`;

-- CreateTable
CREATE TABLE `lesson_ai_content` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lessonId` INTEGER NOT NULL,
    `flashcards` JSON NOT NULL,
    `mindmap` JSON NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `lesson_ai_content_lessonId_key`(`lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lesson_ai_content` ADD CONSTRAINT `fk_lesson_ai_content_lesson` FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `term_edit_audit` ADD CONSTRAINT `fk_term_audit_user` FOREIGN KEY (`updatedByUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
