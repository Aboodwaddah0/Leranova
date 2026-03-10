CREATE DATABASE IF NOT EXISTS learnova;
USE learnova;

-- =========================================
-- 1) USER
-- =========================================
CREATE TABLE User (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    age INT NULL,
    Gender ENUM('Female', 'Male') NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Password_Hashed VARCHAR(255) NOT NULL,
    role_pk VARCHAR(100) NULL,
    Address VARCHAR(255) NULL,
    Role ENUM('Student', 'Parent', 'Admin', 'Academy', 'Teacher') NOT NULL
);

-- =========================================
-- 2) ORGANIZATION
-- =========================================
CREATE TABLE Organization (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Password_Hashed VARCHAR(255) NOT NULL,
    Phone VARCHAR(50) NULL,
    Founded DATE NULL,
    Address VARCHAR(255) NULL,
    PhoneNumber VARCHAR(50) NULL,
    Description TEXT NULL,
    Role ENUM('Academy', 'School') NOT NULL
);

-- =========================================
-- 3) PARENT
-- =========================================
CREATE TABLE Parent (
    Parent_id INT PRIMARY KEY,
    Work VARCHAR(255) NULL,
    CONSTRAINT fk_parent_user
        FOREIGN KEY (Parent_id) REFERENCES User(id)
        ON DELETE CASCADE
);

-- =========================================
-- 4) TEACHER
-- =========================================
CREATE TABLE Teacher (
    Teacher_id INT PRIMARY KEY,
    Work VARCHAR(255) NULL,
    CONSTRAINT fk_teacher_user
        FOREIGN KEY (Teacher_id) REFERENCES User(id)
        ON DELETE CASCADE
);

-- =========================================
-- 5) COURSE
-- =========================================
CREATE TABLE Course (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Org_id INT NOT NULL,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NULL,
    Thumbnail VARCHAR(500) NULL,
    Start DATE NULL,
    End DATE NULL,

    CONSTRAINT fk_course_org
        FOREIGN KEY (Org_id) REFERENCES Organization(id)
        ON DELETE CASCADE
);

-- =========================================
-- 6) STUDENT
-- =========================================
CREATE TABLE Student (
    Student_id INT PRIMARY KEY,
    Parent_id INT NULL,
    OrgId INT NOT NULL,
    Course_id INT NULL,

    CONSTRAINT fk_student_user
        FOREIGN KEY (Student_id) REFERENCES User(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_student_parent
        FOREIGN KEY (Parent_id) REFERENCES Parent(Parent_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_student_org
        FOREIGN KEY (OrgId) REFERENCES Organization(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_student_course
        FOREIGN KEY (Course_id) REFERENCES Course(id)
        ON DELETE SET NULL
);

-- =========================================
-- 7) ACADEMY_USER
-- يمثل ربط المستخدم بالمؤسسة
-- =========================================
CREATE TABLE Academy_User (
    user_academy_id INT PRIMARY KEY,
    OrgId INT NOT NULL,

    CONSTRAINT fk_academy_user_user
        FOREIGN KEY (user_academy_id) REFERENCES User(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_academy_user_org
        FOREIGN KEY (OrgId) REFERENCES Organization(id)
        ON DELETE CASCADE
);

-- =========================================
-- 8) ENROLLMENT
-- =========================================
CREATE TABLE Enrollment (
    user_Academy_id INT NOT NULL,
    OrgId INT NOT NULL,
    PRIMARY KEY (user_Academy_id, OrgId),

    CONSTRAINT fk_enrollment_academy_user
        FOREIGN KEY (user_Academy_id) REFERENCES Academy_User(user_academy_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_enrollment_org
        FOREIGN KEY (OrgId) REFERENCES Organization(id)
        ON DELETE CASCADE
);

-- =========================================
-- 9) SUBJECT
-- =========================================
CREATE TABLE Subject (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Course_id INT NOT NULL,
    Teacher_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    Description TEXT NULL,

    CONSTRAINT fk_subject_course
        FOREIGN KEY (Course_id) REFERENCES Course(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_subject_teacher
        FOREIGN KEY (Teacher_id) REFERENCES Teacher(Teacher_id)
        ON DELETE CASCADE
);

-- =========================================
-- 10) LESSON
-- =========================================
CREATE TABLE Lesson (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Subject_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,

    CONSTRAINT fk_lesson_subject
        FOREIGN KEY (Subject_id) REFERENCES Subject(id)
        ON DELETE CASCADE
);

-- =========================================
-- 11) LESSON_ASSETS
-- =========================================
CREATE TABLE Lesson_Assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Lesson_id INT NOT NULL,
    Name VARCHAR(255) NOT NULL,
    Description TEXT NULL,
    Url VARCHAR(500) NULL,
    Files VARCHAR(500) NULL,

    CONSTRAINT fk_lesson_assets_lesson
        FOREIGN KEY (Lesson_id) REFERENCES Lesson(id)
        ON DELETE CASCADE
);

-- =========================================
-- 12) COMMENT
-- =========================================
CREATE TABLE Comment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lesson_id INT NULL,
    asset_id INT NULL,
    User_id INT NOT NULL,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,

    CONSTRAINT fk_comment_lesson
        FOREIGN KEY (lesson_id) REFERENCES Lesson(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_asset
        FOREIGN KEY (asset_id) REFERENCES Lesson_Assets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comment_user
        FOREIGN KEY (User_id) REFERENCES User(id)
        ON DELETE CASCADE
);

-- =========================================
-- 13) MARKS
-- =========================================
CREATE TABLE Marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    User_id INT NOT NULL,
    Subject_id INT NOT NULL,
    Numbers DECIMAL(5,2) NOT NULL,
    time DATE NULL,

    CONSTRAINT fk_marks_user
        FOREIGN KEY (User_id) REFERENCES User(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_marks_subject
        FOREIGN KEY (Subject_id) REFERENCES Subject(id)
        ON DELETE CASCADE
);

-- =========================================
-- 14) NOTIFICATION
-- =========================================
CREATE TABLE Notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    User_id INT NOT NULL,
    content TEXT NOT NULL,
    Type VARCHAR(100) NOT NULL,
    Url VARCHAR(500) NULL,
    isSeen BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (User_id) REFERENCES User(id)
        ON DELETE CASCADE
);

-- =========================================
-- 15) CHAT SYSTEM
-- group chat لكل subject
-- private chat بين الطالب والمعلم
-- =========================================
CREATE TABLE chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    subject_id INT NULL,
    created_by INT NOT NULL,
    type ENUM('group', 'private') NOT NULL,
    title VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chats_organization
        FOREIGN KEY (organization_id) REFERENCES Organization(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_chats_subject
        FOREIGN KEY (subject_id) REFERENCES Subject(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_chats_created_by
        FOREIGN KEY (created_by) REFERENCES User(id)
        ON DELETE CASCADE
);

-- =========================================
-- 16) CHAT PARTICIPANTS
-- =========================================
CREATE TABLE chat_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    user_id INT NOT NULL,
    role_in_chat ENUM('member', 'admin', 'teacher', 'student') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_participants_chat
        FOREIGN KEY (chat_id) REFERENCES chats(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_chat_participants_user
        FOREIGN KEY (user_id) REFERENCES User(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_chat_participant UNIQUE (chat_id, user_id)
);

-- =========================================
-- 17) MESSAGES
-- =========================================
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'voice') DEFAULT 'text',
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL,
    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_messages_chat
        FOREIGN KEY (chat_id) REFERENCES chats(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_user_id) REFERENCES User(id)
        ON DELETE CASCADE
);

-- =========================================
-- 18) MESSAGE ATTACHMENTS
-- =========================================
CREATE TABLE message_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NULL,
    file_size BIGINT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_message_attachments_message
        FOREIGN KEY (message_id) REFERENCES messages(id)
        ON DELETE CASCADE
);

-- =========================================
-- 19) Indexes
-- =========================================
CREATE INDEX idx_student_parent_id ON Student(Parent_id);
CREATE INDEX idx_student_org_id ON Student(OrgId);
CREATE INDEX idx_student_course_id ON Student(Course_id);

CREATE INDEX idx_course_org_id ON Course(Org_id);

CREATE INDEX idx_subject_course_id ON Subject(Course_id);
CREATE INDEX idx_subject_teacher_id ON Subject(Teacher_id);

CREATE INDEX idx_lesson_subject_id ON Lesson(Subject_id);

CREATE INDEX idx_lesson_assets_lesson_id ON Lesson_Assets(Lesson_id);

CREATE INDEX idx_comment_lesson_id ON Comment(lesson_id);
CREATE INDEX idx_comment_asset_id ON Comment(asset_id);
CREATE INDEX idx_comment_user_id ON Comment(User_id);

CREATE INDEX idx_marks_user_id ON Marks(User_id);
CREATE INDEX idx_marks_subject_id ON Marks(Subject_id);

CREATE INDEX idx_notification_user_id ON Notification(User_id);

CREATE INDEX idx_chats_organization_id ON chats(organization_id);
CREATE INDEX idx_chats_subject_id ON chats(subject_id);
CREATE INDEX idx_chats_type ON chats(type);

CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_user_id ON messages(sender_user_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);