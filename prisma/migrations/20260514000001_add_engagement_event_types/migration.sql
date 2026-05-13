-- AlterTable: extend xp_event_type enum with engagement event types
ALTER TABLE `xp_event` MODIFY COLUMN `eventType` ENUM('LESSON_COMPLETE','QUIZ_PASS','QUIZ_PERFECT','DAILY_LOGIN','FLASHCARD_SESSION','MINDMAP_SESSION','CHATBOT_SESSION') NOT NULL;
