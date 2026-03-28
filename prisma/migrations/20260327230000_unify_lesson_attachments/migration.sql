-- CreateTable
CREATE TABLE `lesson_attachment` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `lessonId` INTEGER NOT NULL,
  `fileUrl` VARCHAR(500) NOT NULL,
  `filePublicId` VARCHAR(255) NOT NULL,
  `fileResourceType` VARCHAR(50) NOT NULL,
  `mimeType` VARCHAR(100) NULL,
  `originalName` VARCHAR(255) NULL,
  `fileType` VARCHAR(50) NOT NULL,
  `sizeBytes` BIGINT NULL,
  `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  INDEX `idx_lesson_attachment_lesson_id`(`lessonId`),
  INDEX `idx_lesson_attachment_file_type`(`fileType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill old video data into lesson_attachment
INSERT INTO `lesson_attachment` (
  `lessonId`,
  `fileUrl`,
  `filePublicId`,
  `fileResourceType`,
  `mimeType`,
  `originalName`,
  `fileType`,
  `sizeBytes`,
  `createdAt`,
  `updatedAt`
)
SELECT
  `id` AS `lessonId`,
  `videoUrl` AS `fileUrl`,
  `videoPublicId` AS `filePublicId`,
  COALESCE(`videoResourceType`, 'video') AS `fileResourceType`,
  'video/*' AS `mimeType`,
  CONCAT('lesson-', `id`, '-video') AS `originalName`,
  'video' AS `fileType`,
  NULL AS `sizeBytes`,
  CURRENT_TIMESTAMP(0) AS `createdAt`,
  CURRENT_TIMESTAMP(0) AS `updatedAt`
FROM `lesson`
WHERE `videoUrl` IS NOT NULL AND `videoPublicId` IS NOT NULL;

-- AddForeignKey
ALTER TABLE `lesson_attachment`
ADD CONSTRAINT `fk_lesson_attachment_lesson`
FOREIGN KEY (`lessonId`) REFERENCES `lesson`(`id`)
ON DELETE CASCADE ON UPDATE RESTRICT;

-- AlterTable
ALTER TABLE `lesson`
  DROP COLUMN `videoUrl`,
  DROP COLUMN `videoPublicId`,
  DROP COLUMN `videoResourceType`;
