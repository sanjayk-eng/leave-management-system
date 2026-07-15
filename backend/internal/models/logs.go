// Package models — logs.go
//
// The old tbl_log / Common / LogResponse types have been removed.
// All audit logging now goes through pkg/audit.AuditEntry (write side)
// and pkg/audit.ActivityEntry (read side).
//
// This file is intentionally left empty (package declaration only) so that
// existing imports of the models package continue to compile.
package models
