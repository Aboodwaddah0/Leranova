-- Drop login codes table and OAuth columns from organization and user.
DROP TABLE IF EXISTS `login_code`;

ALTER TABLE `organization`
  DROP INDEX `oauthId`,
  DROP COLUMN `oauthId`,
  DROP COLUMN `oauthProvider`;

ALTER TABLE `user`
  DROP INDEX `oauthId_user`,
  DROP COLUMN `oauthId`,
  DROP COLUMN `oauthProvider`;
