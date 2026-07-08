package models

import "time"

// ─────────────────────────────────────────────────────────────────────────────
// Permission — maps tbl_permission
// System-owned catalogue. Users never create or delete these rows.
// ─────────────────────────────────────────────────────────────────────────────

// Permission is the DB model for a single tbl_permission row.
type Permission struct {
	ID          int       `db:"id"          json:"id"`
	Resource    string    `db:"resource"    json:"resource"`
	Action      string    `db:"action"      json:"action"`
	Label       string    `db:"label"       json:"label"`
	Description string    `db:"description" json:"description"`
	IsVisible   bool      `db:"is_visible"  json:"is_visible"`
	CreatedAt   time.Time `db:"created_at"  json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"  json:"updated_at"`
}

// ─────────────────────────────────────────────────────────────────────────────
// RolePermission — maps tbl_role_permission
// One row per (role, permission) pair.
// is_enabled is the ONLY field a user can change (toggle TRUE / FALSE).
// scope and require_seniority are seeded by migrations and are read-only from API.
// ─────────────────────────────────────────────────────────────────────────────

// RolePermission is the DB model for a tbl_role_permission row.
type RolePermission struct {
	RoleID              int       `db:"role_id"            json:"role_id"`
	PermissionID        int       `db:"permission_id"      json:"permission_id"`
	Scope               string    `db:"scope"              json:"scope"`
	RequireSeniority    bool      `db:"require_seniority"  json:"require_seniority"`
	IsEnabled           bool      `db:"is_enabled"         json:"is_enabled"`
	CreatedAt           time.Time `db:"created_at"         json:"created_at"`
	UpdatedAt           time.Time `db:"updated_at"         json:"updated_at"`
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response models
// ─────────────────────────────────────────────────────────────────────────────

// PermissionRow is one permission entry inside a resource group, as returned
// to the frontend. It combines tbl_permission metadata with the role's
// current is_enabled state from tbl_role_permission.
type PermissionRow struct {
	PermissionID     int    `db:"permission_id"     json:"permission_id"`
	Action           string `db:"action"            json:"action"`
	Label            string `db:"label"             json:"label"`
	Description      string `db:"description"       json:"description"`
	Scope            string `db:"scope"             json:"scope"`
	RequireSeniority bool   `db:"require_seniority" json:"require_seniority"`
	IsEnabled        bool   `db:"is_enabled"        json:"is_enabled"`
}

// ResourceGroup groups all permissions for one resource.
// This is the best shape for a frontend permissions page:
// render one card / accordion per resource, with toggles inside.
//
// Example response:
//
//	{
//	  "resource": "leave",
//	  "permissions": [
//	    { "action": "apply",   "is_enabled": true,  "scope": "own" },
//	    { "action": "approve", "is_enabled": true,  "scope": "team" },
//	    { "action": "reject",  "is_enabled": false, "scope": "team" }
//	  ]
//	}
type ResourceGroup struct {
	Resource    string          `json:"resource"`
	Permissions []PermissionRow `json:"permissions"`
}

// RolePermissionResponse is the full GET response for one role.
//
//	{
//	  "role_id":   3,
//	  "role_name": "ADMIN",
//	  "resources": [ ...ResourceGroup... ]
//	}
type RolePermissionResponse struct {
	RoleID    int             `json:"role_id"`
	RoleName  string          `json:"role_name"`
	Resources []ResourceGroup `json:"resources"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Request models
// ─────────────────────────────────────────────────────────────────────────────

// TogglePermissionInput is the request body for
// PATCH /api/permissions/roles/:role_id
// The user sends an array of { permission_id, is_enabled } pairs.
// Only is_enabled is writable — scope and require_seniority are ignored even
// if the client sends them.
type TogglePermissionInput struct {
	Permissions []PermissionToggle `json:"permissions" validate:"required,min=1,dive"`
}

// PermissionToggle is a single toggle item inside TogglePermissionInput.
type PermissionToggle struct {
	PermissionID int  `json:"permission_id" validate:"required,min=1"`
	IsEnabled    bool `json:"is_enabled"`
}
