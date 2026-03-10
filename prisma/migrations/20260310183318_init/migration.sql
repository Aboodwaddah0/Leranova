-- CreateTable
CREATE TABLE `academy_user` (
    `user_academy_id` INTEGER NOT NULL,
    `OrgId` INTEGER NOT NULL,

    INDEX `fk_academy_user_org`(`OrgId`),
    PRIMARY KEY (`user_academy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role_in_chat` ENUM('member', 'admin', 'teacher', 'student') NULL DEFAULT 'member',
    `joined_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_chat_participants_chat_id`(`chat_id`),
    INDEX `idx_chat_participants_user_id`(`user_id`),
    UNIQUE INDEX `uq_chat_participant`(`chat_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `subject_id` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `type` ENUM('group', 'private') NOT NULL,
    `title` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_chats_created_by`(`created_by`),
    INDEX `idx_chats_organization_id`(`organization_id`),
    INDEX `idx_chats_subject_id`(`subject_id`),
    INDEX `idx_chats_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lesson_id` INTEGER NULL,
    `asset_id` INTEGER NULL,
    `User_id` INTEGER NOT NULL,
    `time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `content` TEXT NOT NULL,

    INDEX `idx_comment_asset_id`(`asset_id`),
    INDEX `idx_comment_lesson_id`(`lesson_id`),
    INDEX `idx_comment_user_id`(`User_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Org_id` INTEGER NOT NULL,
    `Name` VARCHAR(255) NOT NULL,
    `Description` TEXT NULL,
    `Thumbnail` VARCHAR(500) NULL,
    `Start` DATE NULL,
    `End` DATE NULL,

    INDEX `idx_course_org_id`(`Org_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enrollment` (
    `user_Academy_id` INTEGER NOT NULL,
    `OrgId` INTEGER NOT NULL,

    INDEX `fk_enrollment_org`(`OrgId`),
    PRIMARY KEY (`user_Academy_id`, `OrgId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lesson` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Subject_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,

    INDEX `idx_lesson_subject_id`(`Subject_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lesson_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Lesson_id` INTEGER NOT NULL,
    `Name` VARCHAR(255) NOT NULL,
    `Description` TEXT NULL,
    `Url` VARCHAR(500) NULL,
    `Files` VARCHAR(500) NULL,

    INDEX `idx_lesson_assets_lesson_id`(`Lesson_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `User_id` INTEGER NOT NULL,
    `Subject_id` INTEGER NOT NULL,
    `Numbers` DECIMAL(5, 2) NOT NULL,
    `time` DATE NULL,

    INDEX `idx_marks_subject_id`(`Subject_id`),
    INDEX `idx_marks_user_id`(`User_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(100) NULL,
    `file_size` BIGINT NULL,
    `uploaded_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_message_attachments_message_id`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER NOT NULL,
    `sender_user_id` INTEGER NOT NULL,
    `message_type` ENUM('text', 'image', 'file', 'voice') NULL DEFAULT 'text',
    `content` TEXT NOT NULL,
    `sent_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `edited_at` TIMESTAMP(0) NULL,
    `is_deleted` BOOLEAN NULL DEFAULT false,

    INDEX `idx_messages_chat_id`(`chat_id`),
    INDEX `idx_messages_sender_user_id`(`sender_user_id`),
    INDEX `idx_messages_sent_at`(`sent_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `User_id` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `Type` VARCHAR(100) NOT NULL,
    `Url` VARCHAR(500) NULL,
    `isSeen` BOOLEAN NULL DEFAULT false,

    INDEX `idx_notification_user_id`(`User_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(255) NOT NULL,
    `Email` VARCHAR(255) NOT NULL,
    `Password_Hashed` VARCHAR(255) NOT NULL,
    `Phone` VARCHAR(50) NULL,
    `Founded` DATE NULL,
    `Address` VARCHAR(255) NULL,
    `PhoneNumber` VARCHAR(50) NULL,
    `Description` TEXT NULL,
    `Role` ENUM('Academy', 'School') NOT NULL,

    UNIQUE INDEX `Email`(`Email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parent` (
    `Parent_id` INTEGER NOT NULL,
    `Work` VARCHAR(255) NULL,

    PRIMARY KEY (`Parent_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student` (
    `Student_id` INTEGER NOT NULL,
    `Parent_id` INTEGER NULL,
    `OrgId` INTEGER NOT NULL,
    `Course_id` INTEGER NULL,

    INDEX `idx_student_course_id`(`Course_id`),
    INDEX `idx_student_org_id`(`OrgId`),
    INDEX `idx_student_parent_id`(`Parent_id`),
    PRIMARY KEY (`Student_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Course_id` INTEGER NOT NULL,
    `Teacher_id` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `Description` TEXT NULL,

    INDEX `idx_subject_course_id`(`Course_id`),
    INDEX `idx_subject_teacher_id`(`Teacher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher` (
    `Teacher_id` INTEGER NOT NULL,
    `Work` VARCHAR(255) NULL,

    PRIMARY KEY (`Teacher_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(255) NOT NULL,
    `age` INTEGER NULL,
    `Gender` ENUM('Female', 'Male') NULL,
    `Email` VARCHAR(255) NOT NULL,
    `Password_Hashed` VARCHAR(255) NOT NULL,
    `role_pk` VARCHAR(100) NULL,
    `Address` VARCHAR(255) NULL,
    `Role` ENUM('Student', 'Parent', 'Admin', 'Academy', 'Teacher') NOT NULL,

    UNIQUE INDEX `Email`(`Email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `academy_user` ADD CONSTRAINT `fk_academy_user_org` FOREIGN KEY (`OrgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `academy_user` ADD CONSTRAINT `fk_academy_user_user` FOREIGN KEY (`user_academy_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `chat_participants` ADD CONSTRAINT `fk_chat_participants_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `chat_participants` ADD CONSTRAINT `fk_chat_participants_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `chats` ADD CONSTRAINT `fk_chats_created_by` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `chats` ADD CONSTRAINT `fk_chats_organization` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `chats` ADD CONSTRAINT `fk_chats_subject` FOREIGN KEY (`subject_id`) REFERENCES `subject`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `fk_comment_asset` FOREIGN KEY (`asset_id`) REFERENCES `lesson_assets`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `fk_comment_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `comment` ADD CONSTRAINT `fk_comment_user` FOREIGN KEY (`User_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `course` ADD CONSTRAINT `fk_course_org` FOREIGN KEY (`Org_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `enrollment` ADD CONSTRAINT `fk_enrollment_academy_user` FOREIGN KEY (`user_Academy_id`) REFERENCES `academy_user`(`user_academy_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `enrollment` ADD CONSTRAINT `fk_enrollment_org` FOREIGN KEY (`OrgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `lesson` ADD CONSTRAINT `fk_lesson_subject` FOREIGN KEY (`Subject_id`) REFERENCES `subject`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `lesson_assets` ADD CONSTRAINT `fk_lesson_assets_lesson` FOREIGN KEY (`Lesson_id`) REFERENCES `lesson`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `marks` ADD CONSTRAINT `fk_marks_subject` FOREIGN KEY (`Subject_id`) REFERENCES `subject`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `marks` ADD CONSTRAINT `fk_marks_user` FOREIGN KEY (`User_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `message_attachments` ADD CONSTRAINT `fk_message_attachments_message` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `fk_messages_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `fk_notification_user` FOREIGN KEY (`User_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `parent` ADD CONSTRAINT `fk_parent_user` FOREIGN KEY (`Parent_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `fk_student_course` FOREIGN KEY (`Course_id`) REFERENCES `course`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `fk_student_org` FOREIGN KEY (`OrgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `fk_student_parent` FOREIGN KEY (`Parent_id`) REFERENCES `parent`(`Parent_id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `student` ADD CONSTRAINT `fk_student_user` FOREIGN KEY (`Student_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subject` ADD CONSTRAINT `fk_subject_course` FOREIGN KEY (`Course_id`) REFERENCES `course`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subject` ADD CONSTRAINT `fk_subject_teacher` FOREIGN KEY (`Teacher_id`) REFERENCES `teacher`(`Teacher_id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `teacher` ADD CONSTRAINT `fk_teacher_user` FOREIGN KEY (`Teacher_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
