-- Normalize any existing values to uppercase first
UPDATE `lesson_attachment`
SET `fileType` = UPPER(`fileType`)
WHERE `fileType` IS NOT NULL;

-- Map unknown/legacy values to OTHER
UPDATE `lesson_attachment`
SET `fileType` = 'OTHER'
WHERE `fileType` NOT IN ('PDF', 'DOCX', 'TXT', 'IMAGE', 'VIDEO', 'AUDIO', 'OTHER');

-- Alter column to ENUM
ALTER TABLE `lesson_attachment`
MODIFY `fileType` ENUM('PDF', 'DOCX', 'TXT', 'IMAGE', 'VIDEO', 'AUDIO', 'OTHER') NOT NULL;
