-- +goose Up
ALTER TABLE Tbl_Leave_type
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- +goose Down
ALTER TABLE Tbl_Leave_type
DROP COLUMN IF EXISTS is_active;
