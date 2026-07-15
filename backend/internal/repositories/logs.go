// Package repositories — logs.go
//
// The old AddLog / GetLogs methods (backed by the removed tbl_log table) have
// been deleted.  All audit persistence now lives in pkg/audit.postgresRepository
// which is consumed only by pkg/audit.Service (the async worker).
//
// This file is intentionally left empty (package declaration only) so that
// existing imports of the repositories package continue to compile.
package repositories
