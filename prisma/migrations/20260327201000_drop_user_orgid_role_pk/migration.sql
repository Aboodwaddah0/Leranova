-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `fk_user_org`;

-- DropIndex
DROP INDEX `idx_user_org_id` ON `user`;

-- AlterTable
ALTER TABLE `user`
  DROP COLUMN `OrgId`,
  DROP COLUMN `role_pk`;
