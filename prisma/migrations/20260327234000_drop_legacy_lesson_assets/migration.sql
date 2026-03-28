-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `fk_comment_asset`;

-- DropIndex
DROP INDEX `idx_comment_asset_id` ON `comment`;

-- AlterTable
ALTER TABLE `comment` DROP COLUMN `asset_id`;

-- DropTable
DROP TABLE `lesson_assets`;
