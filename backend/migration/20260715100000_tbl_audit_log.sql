-- +goose Up
-- +goose StatementBegin

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit Log System
--
-- Design decisions:
--   • Partitioned by created_at (monthly range) so large tables stay indexable.
--   • No FK constraints — the audit trail must outlive deleted users/records.
--   • REVOKE UPDATE / DELETE at the DB level — append-only is enforced by Postgres,
--     not application discipline.
--   • description is stored pre-rendered — never reconstructed from JSONB at read time.
--   • old_value / new_value are JSONB for flexibility; only populated when state
--     actually changed (not for pure creates/deletes where one side is empty).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Parent partitioned table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tbl_audit_log (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    -- WHO
    actor_id      UUID        NOT NULL,
    actor_name    TEXT        NOT NULL,
    actor_role    TEXT        NOT NULL DEFAULT 'System',
    -- WHAT
    component     TEXT        NOT NULL,  -- dot-namespaced domain, e.g. "designation"
    action        TEXT        NOT NULL,  -- dot-namespaced action, e.g. "designation.created"
    -- ON WHAT
    resource_type TEXT        NOT NULL,
    resource_id   TEXT        NOT NULL,
    resource_name TEXT        NOT NULL,
    -- DIFF (JSONB; NULL for pure create/delete where one side is inherently empty)
    old_value     JSONB,
    new_value     JSONB,
    -- DISPLAY
    description   TEXT        NOT NULL, -- pre-rendered human-readable sentence
    -- TRACE
    metadata      JSONB,               -- optional extra fields (IP, request_id, etc.)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ── 2. Bootstrap first two monthly partitions ─────────────────────────────────
--    The cron job (see pkg/audit/partition_cron.go) handles future months.
CREATE TABLE IF NOT EXISTS tbl_audit_log_2026_07
    PARTITION OF tbl_audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS tbl_audit_log_2026_08
    PARTITION OF tbl_audit_log
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE IF NOT EXISTS tbl_audit_log_2026_09
    PARTITION OF tbl_audit_log
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- ── 3. Indexes — covering the feed's actual query patterns ────────────────────
-- "Show me the history of resource X"
CREATE INDEX IF NOT EXISTS idx_audit_resource
    ON tbl_audit_log (resource_id, created_at DESC);

-- "Show me everything actor Y did"
CREATE INDEX IF NOT EXISTS idx_audit_actor
    ON tbl_audit_log (actor_id, created_at DESC);

-- "Show me all designation events" / component-level queries
CREATE INDEX IF NOT EXISTS idx_audit_component_action
    ON tbl_audit_log (component, action, created_at DESC);

-- Ad-hoc JSON search on metadata
CREATE INDEX IF NOT EXISTS idx_audit_metadata_gin
    ON tbl_audit_log USING GIN (metadata);

-- ── 4. Append-only enforcement — REVOKE mutating privileges ───────────────────
--    The application role must not be able to UPDATE or DELETE audit rows.
--    Replace 'lms_app' with your actual DB application user if different.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'lms_app'
    ) THEN
        EXECUTE 'REVOKE UPDATE, DELETE ON tbl_audit_log FROM lms_app';
    END IF;
END;
$$;

-- +goose StatementEnd


-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS tbl_audit_log CASCADE;
-- +goose StatementEnd
