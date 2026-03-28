/*
  Warnings:

  - The primary key for the `enrollment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `OrgId` on the `enrollment` table. All the data in the column will be lost.
  - Added the required column `Course_id` to the `enrollment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `enrollment` DROP FOREIGN KEY `fk_enrollment_org`;

-- AlterTable
ALTER TABLE `enrollment` DROP PRIMARY KEY,
    DROP COLUMN `OrgId`,
    ADD COLUMN `Course_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`user_Academy_id`, `Course_id`);

-- CreateIndex
CREATE INDEX `fk_enrollment_course` ON `enrollment`(`Course_id`);

-- AddForeignKey
ALTER TABLE `enrollment` ADD CONSTRAINT `fk_enrollment_course` FOREIGN KEY (`Course_id`) REFERENCES `course`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
