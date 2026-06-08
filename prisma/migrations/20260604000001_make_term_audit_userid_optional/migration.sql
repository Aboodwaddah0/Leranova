-- Make term_edit_audit.updatedByUserId nullable so organization actors
-- (whose id is an org ID, not a user ID) can create terms without violating
-- the fk_term_audit_user foreign key constraint.

-- Drop the existing NOT NULL FK constraint
ALTER TABLE `term_edit_audit` MODIFY COLUMN `updatedByUserId` INT NULL;
