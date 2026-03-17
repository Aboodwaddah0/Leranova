-- CreateTable
CREATE TABLE `lesson_rag_asset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lessonId` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `extractedText` LONGTEXT NULL,
    `sourceName` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_lesson_rag_asset_lesson_id`(`lessonId`),
    INDEX `idx_lesson_rag_asset_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lesson_rag_asset` ADD CONSTRAINT `fk_lesson_rag_asset_lesson` FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
