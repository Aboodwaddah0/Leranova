/*
  Warnings:

  - A unique constraint covering the columns `[registrationNumber]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `registrationNumber` VARCHAR(50) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_registrationNumber_key` ON `user`(`registrationNumber`);
