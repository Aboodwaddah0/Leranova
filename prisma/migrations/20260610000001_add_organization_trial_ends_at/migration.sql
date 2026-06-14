-- Add trialEndsAt to organization table for the 14-day free trial flow
ALTER TABLE `organization` ADD COLUMN `trialEndsAt` DATETIME(0) NULL;

-- CreateIndex
CREATE INDEX `idx_organization_trial_ends_at` ON `organization`(`trialEndsAt`);
