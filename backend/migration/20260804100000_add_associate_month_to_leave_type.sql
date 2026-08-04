-- +goose Up
-- Stores the proration anchor month (1-12) chosen by the admin when creating
-- the leave policy. NULL means the policy was created before this column existed
-- (treated as the month of created_at at runtime).
ALTER TABLE Tbl_Leave_type
ADD COLUMN associate_month INT DEFAULT NULL
    CONSTRAINT chk_associate_month CHECK (associate_month IS NULL OR (associate_month >= 1 AND associate_month <= 12));

-- +goose Down
ALTER TABLE Tbl_Leave_type
DROP COLUMN IF EXISTS associate_month;
