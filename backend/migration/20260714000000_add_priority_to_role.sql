-- +goose Up
-- Add priority column to Tbl_Role.
-- Higher number = higher seniority.
-- This is the single source of truth for role hierarchy — no hardcoding in Go.

ALTER TABLE Tbl_Role
    ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 0;

-- Set priority values matching the established hierarchy
UPDATE Tbl_Role SET priority = 1 WHERE type = 'INTERN';
UPDATE Tbl_Role SET priority = 2 WHERE type = 'EMPLOYEE';
UPDATE Tbl_Role SET priority = 3 WHERE type = 'MANAGER';
UPDATE Tbl_Role SET priority = 4 WHERE type = 'HR';
UPDATE Tbl_Role SET priority = 5 WHERE type = 'ADMIN';
UPDATE Tbl_Role SET priority = 6 WHERE type = 'SUPERADMIN';

-- Ensure priority is unique and non-zero after seeding
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_priority ON Tbl_Role(priority) WHERE priority > 0;

-- +goose Down
DROP INDEX IF EXISTS uq_role_priority;
ALTER TABLE Tbl_Role DROP COLUMN IF EXISTS priority;
