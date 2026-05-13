-- CreateTable
CREATE TABLE `student_achievement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `achievementKey` VARCHAR(100) NOT NULL,
    `xpAwarded` INTEGER NOT NULL,
    `unlockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `student_achievement_studentId_idx`(`studentId`),
    UNIQUE INDEX `student_achievement_studentId_achievementKey_key`(`studentId`, `achievementKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_mission_progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `missionKey` VARCHAR(100) NOT NULL,
    `type` ENUM('DAILY', 'WEEKLY') NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `goal` INTEGER NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `periodStart` DATETIME(3) NOT NULL,
    `xpAwarded` INTEGER NOT NULL DEFAULT 0,

    INDEX `student_mission_progress_studentId_idx`(`studentId`),
    UNIQUE INDEX `student_mission_progress_studentId_missionKey_periodStart_key`(`studentId`, `missionKey`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_achievement` ADD CONSTRAINT `student_achievement_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_mission_progress` ADD CONSTRAINT `student_mission_progress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
