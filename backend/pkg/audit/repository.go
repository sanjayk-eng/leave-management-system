package audit

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ─────────────────────────────────────────────────────────────────────────────
// Repository interface — consumed by the async worker inside the Service.
// ─────────────────────────────────────────────────────────────────────────────

// Repository is the only persistence interface the audit service needs.
// Reads go straight through without touching the write channel.
type Repository interface {
	// Create inserts one audit entry. Called only from the background worker —
	// never from the request path.
	Create(ctx context.Context, entry *AuditEntry) error

	// GetActivity returns a paginated, filtered slice of ActivityEntry (read-side).
	// Reads go directly to the DB — they never route through the async Log() channel.
	GetActivity(ctx context.Context, filter ActivityFilter) ([]ActivityEntry, int, error)
}

// ─────────────────────────────────────────────────────────────────────────────
// Concrete repository — sqlx / PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────

type postgresRepository struct {
	db     *sqlx.DB
	logger *slog.Logger
}

// NewRepository returns a Repository backed by PostgreSQL.
func NewRepository(db *sqlx.DB, logger *slog.Logger) Repository {
	return &postgresRepository{db: db, logger: logger}
}

// Create inserts one audit log row into tbl_audit_log.
// The table is append-only; UPDATE/DELETE are revoked at the DB grant level.
func (r *postgresRepository) Create(ctx context.Context, e *AuditEntry) error {
	// Materialise description at write time — stored once, never re-derived.
	desc := e.Description
	if desc == "" {
		desc = BuildDescription(e)
	}

	oldVal, err := e.MarshalOldValue()
	if err != nil {
		return fmt.Errorf("audit.Create: marshal old_value: %w", err)
	}
	newVal, err := e.MarshalNewValue()
	if err != nil {
		return fmt.Errorf("audit.Create: marshal new_value: %w", err)
	}
	meta, err := e.MarshalMetadata()
	if err != nil {
		return fmt.Errorf("audit.Create: marshal metadata: %w", err)
	}

	const q = `
		INSERT INTO tbl_audit_log (
			actor_id, actor_name, actor_role,
			component, action,
			resource_type, resource_id, resource_name,
			old_value, new_value,
			description, metadata
		) VALUES (
			$1, $2, $3,
			$4, $5,
			$6, $7, $8,
			$9, $10,
			$11, $12
		)`

	_, err = r.db.ExecContext(ctx, q,
		e.ActorID, e.ActorName, e.ActorRole,
		e.Component, e.Action,
		e.ResourceType, e.ResourceID, e.ResourceName,
		nullableBytes(oldVal), nullableBytes(newVal),
		desc, nullableBytes(meta),
	)
	return err
}

// GetActivity returns a paginated, filtered activity feed.
// Callers control scope via ActivityFilter — no sorting option exposed because
// audit feeds are always newest-first.
func (r *postgresRepository) GetActivity(ctx context.Context, f ActivityFilter) ([]ActivityEntry, int, error) {
	// Clamp / default pagination
	page := f.Page
	if page < 1 {
		page = 1
	}
	pageSize := f.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	// Build dynamic WHERE clause
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if f.ResourceID != "" {
		where += fmt.Sprintf(" AND resource_id = $%d", argIdx)
		args = append(args, f.ResourceID)
		argIdx++
	}
	if f.ActorID != "" {
		where += fmt.Sprintf(" AND actor_id = $%d", argIdx)
		args = append(args, f.ActorID)
		argIdx++
	}
	if f.Component != "" {
		where += fmt.Sprintf(" AND component = $%d", argIdx)
		args = append(args, f.Component)
		argIdx++
	}
	if f.Action != "" {
		where += fmt.Sprintf(" AND action = $%d", argIdx)
		args = append(args, f.Action)
		argIdx++
	}
	if f.Search != "" {
		// Case-insensitive substring match across the three most-searched columns.
		// Using ILIKE with a parameterised pattern — never interpolated.
		pattern := "%" + f.Search + "%"
		where += fmt.Sprintf(
			" AND (actor_name ILIKE $%d OR description ILIKE $%d OR resource_name ILIKE $%d)",
			argIdx, argIdx+1, argIdx+2,
		)
		args = append(args, pattern, pattern, pattern)
		argIdx += 3
	}

	// Count query for pagination metadata
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM tbl_audit_log %s`, where)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("audit.GetActivity count: %w", err)
	}

	// Data query
	dataQuery := fmt.Sprintf(`
		SELECT
			id, actor_name, actor_role,
			component, action,
			resource_type, resource_name,
			description, created_at
		FROM tbl_audit_log
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)

	args = append(args, pageSize, offset)

	rows, err := r.db.QueryxContext(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("audit.GetActivity query: %w", err)
	}
	defer rows.Close()

	var entries []ActivityEntry
	for rows.Next() {
		var ae ActivityEntry
		if err := rows.StructScan(&ae); err != nil {
			return nil, 0, fmt.Errorf("audit.GetActivity scan: %w", err)
		}
		entries = append(entries, ae)
	}
	if entries == nil {
		entries = []ActivityEntry{}
	}

	return entries, total, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// nullableBytes wraps a []byte as a typed nil so sqlx passes SQL NULL for empty slices.
func nullableBytes(b []byte) interface{} {
	if len(b) == 0 {
		return nil
	}
	return b
}

// ActivityEntryID returns a deterministic zero UUID used in tests when the
// DB-generated id is not meaningful.
func ActivityEntryID() uuid.UUID { return uuid.Nil }
