-- Add per-organization user sequence counter
ALTER TABLE `organization` ADD COLUMN `userSequence` INT NOT NULL DEFAULT 0;
