package migrations

// ─────────────────────────────────────────────────────────────────────────────
// Migration: Industry-Level RBAC Permission System
//
// Tables created
// ──────────────
//  tbl_permission        — system-owned catalogue of every resource:action pair.
//                          Predefined. No user can add/delete rows.
//                          Users can only toggle tbl_role_permission.is_enabled.
//
//  tbl_role_permission   — per-role permission assignment.
//                          Each row = a role has a permission, with:
//                            scope             'own' | 'team' | 'all'
//                            require_seniority  actor must outrank the target
//                            is_enabled         the only field roles can flip TRUE/FALSE
//
// Resource → DB enum value (matches Go constants in pkg/constant/rbsc/resource.go)
// ──────────────────────────────────────────────────────────────────────────────
//  employee      → Tbl_Employee  (CRUD + lifecycle ops)
//  leave         → Tbl_Leave     (apply / approve / reject / cancel / withdraw / edit)
//  leave_balance → Tbl_Leave_balance + Tbl_Leave_adjustment
//  leave_report  → read-only reporting endpoint
//  payroll       → Tbl_Payroll_run + Tbl_Payslip
//  settings      → Tbl_Company_Settings + all sub-management actions
//  designation   → Tbl_Designation  (has real CRUD routes — was missing before)
//  equipment     → tbl_equipment + tbl_equipment_category + tbl_equipment_assignment
//                  (was 'asset' in the old migration — fixed to match Go constant)
//  permission    → tbl_permission + tbl_role_permission
//
// Changes vs the previous migration
// ─────────────────────────────────
//  • Removed 'asset' → replaced with 'equipment' (matches ResourceEquipment constant)
//  • Removed 'company_setting' → merged into 'settings' (codebase only uses one)
//  • Added 'designation' resource (real CRUD endpoints existed but had no permission)
//  • Added 'activate' / 'deactivate' actions (toggle employee status ≠ remove)
//  • Added 'finalize' action (FinalizePayroll is irreversible, distinct from 'run')
//  • Renamed settings sub-actions to verb-first: manage_holidays, manage_leave_policy,
//    manage_leave_flow, manage_birthdays  (was: holidays_management etc.)
//  • Removed duplicate 'settings/holidays_management' seed row
//  • Added 'label' column (human-readable name for UI)
//  • Added 'is_visible' column (FALSE = internal permission, hidden from UI)
//  • tbl_role_permission.is_enabled = the ONLY column users can change (TRUE/FALSE)
// ─────────────────────────────────────────────────────────────────────────────

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upTblPermissionSql, downTblPermissionSql)
}

func upTblPermissionSql(ctx context.Context, tx *sql.Tx) error {
	stmts := []string{

		// ── 1. Enum: permission_resource ──────────────────────────────────────
		`CREATE TYPE permission_resource AS ENUM (
			'employee',
			'leave',
			'leave_balance',
			'leave_report',
			'payroll',
			'settings',
			'designation',
			'equipment',
			'permission'
		)`,

		// ── 2. Enum: permission_action ────────────────────────────────────────
		`CREATE TYPE permission_action AS ENUM (
			-- universal CRUD
			'add',
			'read',
			'edit',
			'remove',

			-- employee lifecycle
			'change_password',
			'update_role',
			'assign_manager',
			'unassign_manager',
			'activate',
			'deactivate',
			'designation_management',

			-- leave workflow
			'apply',
			'approve',
			'reject',
			'cancel',
			'withdraw',

			-- balance
			'adjust',

			-- payroll
			'run',
			'finalize',

			-- settings sub-actions
			'manage_holidays',
			'manage_leave_policy',
			'manage_leave_flow',
			'manage_birthdays',

			-- equipment
			'assign'
		)`,

		// ── 3. tbl_permission ─────────────────────────────────────────────────
		// System-owned catalogue. Rows are seeded here and cannot be
		// created or deleted by any user through the API.
		// The only user-facing operation is toggling is_enabled in tbl_role_permission.
		`CREATE TABLE IF NOT EXISTS tbl_permission (
			id          SERIAL               PRIMARY KEY,
			resource    permission_resource  NOT NULL,
			action      permission_action    NOT NULL,

			-- Human-readable name shown in the permissions UI
			label       TEXT                 NOT NULL,

			-- Tooltip / help text shown alongside the toggle in the UI
			description TEXT                 NOT NULL,

			-- FALSE = internal system permission hidden from the UI
			-- (e.g. permission:read used only by the RBAC middleware itself)
			is_visible  BOOLEAN              NOT NULL DEFAULT TRUE,

			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

			CONSTRAINT uq_permission_resource_action UNIQUE (resource, action)
		)`,

		`CREATE INDEX IF NOT EXISTS idx_permission_resource ON tbl_permission(resource)`,
		`CREATE INDEX IF NOT EXISTS idx_permission_action   ON tbl_permission(action)`,
		`CREATE INDEX IF NOT EXISTS idx_permission_visible  ON tbl_permission(is_visible)`,

		// ── 4. Seed tbl_permission ────────────────────────────────────────────
		`INSERT INTO tbl_permission (resource, action, label, description, is_visible) VALUES

			-- ── EMPLOYEE ───────────────────────────────────────────────────────
			('employee', 'add',
				'Add Employee',
				'Create a new employee account in the system',
				TRUE),
			('employee', 'read',
				'View Employees',
				'View employee list and individual employee profiles',
				TRUE),
			('employee', 'edit',
				'Edit Employee',
				'Update employee personal information (name, email, salary, dates)',
				TRUE),
			('employee', 'remove',
				'Remove Employee',
				'Permanently remove an employee record',
				TRUE),
			('employee', 'change_password',
				'Change Password',
				'Reset or change an employee account password',
				TRUE),
			('employee', 'update_role',
				'Update Role',
				'Change an employee role (e.g. EMPLOYEE → MANAGER)',
				TRUE),
			('employee', 'assign_manager',
				'Assign Manager',
				'Link an employee to a manager in the reporting hierarchy',
				TRUE),
			('employee', 'unassign_manager',
				'Unassign Manager',
				'Remove the manager link from an employee',
				TRUE),
			('employee', 'activate',
				'Activate Employee',
				'Re-activate a deactivated employee account',
				TRUE),
			('employee', 'deactivate',
				'Deactivate Employee',
				'Deactivate (soft-delete) an employee account',
				TRUE),
			('employee', 'designation_management',
				'Manage Designation',
				'Assign or change an employee job designation',
				TRUE),

			-- ── LEAVE ──────────────────────────────────────────────────────────
			('leave', 'apply',
				'Apply Leave',
				'Submit a leave request on behalf of self or a team member',
				TRUE),
			('leave', 'read',
				'View Leaves',
				'View leave requests (scope controls own / team / all)',
				TRUE),
			('leave', 'edit',
				'Edit Leave',
				'Edit a pending leave request before it is processed',
				TRUE),
			('leave', 'approve',
				'Approve Leave',
				'Approve a leave request in the approval workflow',
				TRUE),
			('leave', 'reject',
				'Reject Leave',
				'Reject a leave request in the approval workflow',
				TRUE),
			('leave', 'cancel',
				'Cancel Leave',
				'Cancel a pending leave request',
				TRUE),
			('leave', 'withdraw',
				'Withdraw Leave',
				'Initiate or confirm a leave withdrawal after approval',
				TRUE),

			-- ── LEAVE BALANCE ──────────────────────────────────────────────────
			('leave_balance', 'read',
				'View Leave Balance',
				'View leave balance for self or other employees',
				TRUE),
			('leave_balance', 'adjust',
				'Adjust Leave Balance',
				'Manually increase or decrease an employee leave balance',
				TRUE),

			-- ── LEAVE REPORT ───────────────────────────────────────────────────
			('leave_report', 'read',
				'View Leave Reports',
				'Access monthly, yearly, or date-range leave reports',
				TRUE),

			-- ── PAYROLL ────────────────────────────────────────────────────────
			('payroll', 'read',
				'View Payroll',
				'View payslips and payroll run history',
				TRUE),
			('payroll', 'run',
				'Run Payroll',
				'Generate a payroll preview for a given month and year',
				TRUE),
			('payroll', 'finalize',
				'Finalize Payroll',
				'Lock and finalize a payroll run, generating official payslips',
				TRUE),

			-- ── SETTINGS ───────────────────────────────────────────────────────
			('settings', 'read',
				'View Settings',
				'View company settings, branding, and configuration',
				TRUE),
			('settings', 'edit',
				'Edit Settings',
				'Update company settings such as working days and branding',
				TRUE),
			('settings', 'manage_holidays',
				'Manage Holidays',
				'Add, view, or remove company holiday calendar entries',
				TRUE),
			('settings', 'manage_leave_policy',
				'Manage Leave Policy',
				'Create, update, or delete leave type definitions',
				TRUE),
			('settings', 'manage_leave_flow',
				'Manage Approval Flow',
				'Create, update, or delete leave approval workflow configurations',
				TRUE),
			('settings', 'manage_birthdays',
				'Manage Birthday Settings',
				'Configure the birthday message template and notification schedule',
				TRUE),

			-- ── DESIGNATION ────────────────────────────────────────────────────
			('designation', 'add',
				'Add Designation',
				'Create a new job designation',
				TRUE),
			('designation', 'read',
				'View Designations',
				'List all job designations',
				TRUE),
			('designation', 'edit',
				'Edit Designation',
				'Update an existing job designation name or description',
				TRUE),
			('designation', 'remove',
				'Remove Designation',
				'Delete a job designation',
				TRUE),

			-- ── EQUIPMENT ──────────────────────────────────────────────────────
			('equipment', 'add',
				'Add Equipment',
				'Add new equipment or a new equipment category',
				TRUE),
			('equipment', 'read',
				'View Equipment',
				'View equipment inventory and assignment history',
				TRUE),
			('equipment', 'edit',
				'Edit Equipment',
				'Update equipment details or category information',
				TRUE),
			('equipment', 'remove',
				'Remove Equipment',
				'Delete equipment or equipment category records',
				TRUE),
			('equipment', 'assign',
				'Assign Equipment',
				'Assign, reassign, or return equipment to/from employees',
				TRUE),

			-- ── PERMISSION ─────────────────────────────────────────────────────
			-- is_visible=FALSE: used only by the RBAC middleware, not shown in UI
			('permission', 'read',
				'View Permissions',
				'Read the permission catalogue and role-permission matrix',
				FALSE),
			('permission', 'edit',
				'Edit Role Permissions',
				'Toggle is_enabled on tbl_role_permission rows for any role',
				TRUE)

		ON CONFLICT (resource, action) DO UPDATE
			SET label       = EXCLUDED.label,
			    description = EXCLUDED.description,
			    is_visible  = EXCLUDED.is_visible,
			    updated_at  = NOW()`,

		// ── 5. tbl_role_permission ────────────────────────────────────────────
		//
		// Bridge table: one row per (role, permission) pair.
		//
		// Columns
		// ───────
		//  role_id             FK → Tbl_Role(id)       — which role
		//  permission_id       FK → tbl_permission(id) — which permission
		//
		//  scope               'own'  = actor can only act on their own records
		//                      'team' = actor can act on records of employees
		//                               they directly manage
		//                      'all'  = actor can act on any record in the system
		//
		//  require_seniority   TRUE = the actor's role rank must be strictly
		//                      higher than the target employee's role rank.
		//                      Prevents HR from editing SUPERADMIN, etc.
		//                      Seniority rank (higher = more senior):
		//                        SUPERADMIN=6, HR=5, ADMIN=4,
		//                        MANAGER=3, EMPLOYEE=2, INTERN=1
		//
		//  is_enabled          THE ONLY COLUMN A USER CAN CHANGE.
		//                      TRUE  = this role currently has this permission.
		//                      FALSE = permission is revoked for this role.
		//                      Defaults match the seeded RBAC matrix below.
		//                      Changing scope/require_seniority requires a
		//                      code-level migration — they are not user-editable.
		`CREATE TABLE IF NOT EXISTS tbl_role_permission (
			role_id              INT     NOT NULL
				REFERENCES Tbl_Role(id)       ON DELETE CASCADE,
			permission_id        INT     NOT NULL
				REFERENCES tbl_permission(id) ON DELETE CASCADE,

			scope                TEXT    NOT NULL DEFAULT 'own'
				CHECK (scope IN ('own', 'team', 'all')),

			require_seniority    BOOLEAN NOT NULL DEFAULT FALSE,

			-- The ONLY field that can be toggled by a user with permission:edit
			is_enabled           BOOLEAN NOT NULL DEFAULT TRUE,

			created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

			PRIMARY KEY (role_id, permission_id)
		)`,

		`CREATE INDEX IF NOT EXISTS idx_role_perm_role       ON tbl_role_permission(role_id)`,
		`CREATE INDEX IF NOT EXISTS idx_role_perm_permission  ON tbl_role_permission(permission_id)`,
		`CREATE INDEX IF NOT EXISTS idx_role_perm_enabled     ON tbl_role_permission(is_enabled)`,

		// ── 6. Seed tbl_role_permission — default RBAC matrix ─────────────────
		//
		// Role IDs from Tbl_Role seed (schema.sql):
		//   1 = SUPERADMIN
		//   2 = HR
		//   3 = ADMIN
		//   4 = MANAGER
		//   5 = EMPLOYEE
		//   6 = INTERN
		//
		// Permission IDs are resolved by sub-select — never hard-coded.
		// is_enabled defaults to TRUE for all rows seeded here.

		// ── SUPERADMIN: all permissions, all scope, no seniority check ─────────
		`INSERT INTO tbl_role_permission
			(role_id, permission_id, scope, require_seniority, is_enabled)
		SELECT
			1,       -- SUPERADMIN
			id,
			'all',
			FALSE,
			TRUE
		FROM tbl_permission
		ON CONFLICT (role_id, permission_id) DO NOTHING`,

		// ── HR ────────────────────────────────────────────────────────────────
		// Manages people + leave + settings. Cannot run/finalize payroll.
		// require_seniority=TRUE blocks editing users of equal or higher rank.
		`INSERT INTO tbl_role_permission
			(role_id, permission_id, scope, require_seniority, is_enabled)
		SELECT
			2,       -- HR
			p.id,
			v.scope,
			v.req_sen,
			TRUE
		FROM (VALUES
			-- employee
			('employee', 'add',                   'all',  TRUE),
			('employee', 'read',                  'all',  TRUE),
			('employee', 'edit',                  'all',  TRUE),
			('employee', 'change_password',        'all',  TRUE),
			('employee', 'update_role',            'all',  TRUE),
			('employee', 'assign_manager',         'all',  TRUE),
			('employee', 'unassign_manager',       'all',  TRUE),
			('employee', 'activate',               'all',  TRUE),
			('employee', 'deactivate',             'all',  TRUE),
			('employee', 'designation_management', 'all',  TRUE),
			-- leave
			('leave', 'read',     'all',  FALSE),
			('leave', 'approve',  'all',  FALSE),
			('leave', 'reject',   'all',  FALSE),
			('leave', 'cancel',   'all',  FALSE),
			('leave', 'withdraw', 'all',  FALSE),
			-- leave balance
			('leave_balance', 'read', 'all', FALSE),
			-- leave report
			('leave_report',  'read', 'all', FALSE),
			-- payroll: HR can view only
			('payroll', 'read', 'own', FALSE),
			-- settings
			('settings', 'read',                'all', FALSE),
			('settings', 'manage_holidays',     'all', FALSE),
			('settings', 'manage_leave_policy', 'all', FALSE),
			('settings', 'manage_leave_flow',   'all', FALSE),
			('settings', 'manage_birthdays',    'all', FALSE),
			-- designation
			('designation', 'add',    'all', FALSE),
			('designation', 'read',   'all', FALSE),
			('designation', 'edit',   'all', FALSE),
			('designation', 'remove', 'all', FALSE),
			-- equipment
			('equipment', 'add',    'all', FALSE),
			('equipment', 'read',   'all', FALSE),
			('equipment', 'edit',   'all', FALSE),
			('equipment', 'remove', 'all', FALSE),
			('equipment', 'assign', 'all', FALSE),
			-- permission: view only
			('permission', 'read', 'all', FALSE)
		) AS v(resource, action, scope, req_sen)
		JOIN tbl_permission p ON p.resource::TEXT = v.resource
		                     AND p.action::TEXT    = v.action
		ON CONFLICT (role_id, permission_id) DO NOTHING`,

		// ── ADMIN ─────────────────────────────────────────────────────────────
		// Overlaps HR but also gets: payroll run, leave_balance adjust,
		// settings edit, permission edit.
		// Does NOT get: payroll finalize (SUPERADMIN only).
		`INSERT INTO tbl_role_permission
			(role_id, permission_id, scope, require_seniority, is_enabled)
		SELECT
			3,       -- ADMIN
			p.id,
			v.scope,
			v.req_sen,
			TRUE
		FROM (VALUES
			-- employee
			('employee', 'add',                   'all',  TRUE),
			('employee', 'read',                  'all',  TRUE),
			('employee', 'edit',                  'all',  TRUE),
			('employee', 'change_password',        'all',  TRUE),
			('employee', 'update_role',            'all',  TRUE),
			('employee', 'assign_manager',         'all',  TRUE),
			('employee', 'unassign_manager',       'all',  TRUE),
			('employee', 'activate',               'all',  TRUE),
			('employee', 'deactivate',             'all',  TRUE),
			('employee', 'designation_management', 'all',  TRUE),
			-- leave
			('leave', 'read',     'all',  FALSE),
			('leave', 'approve',  'all',  FALSE),
			('leave', 'reject',   'all',  FALSE),
			('leave', 'cancel',   'all',  FALSE),
			('leave', 'withdraw', 'all',  FALSE),
			-- leave balance
			('leave_balance', 'read',   'all', FALSE),
			('leave_balance', 'adjust', 'all', FALSE),
			-- leave report
			('leave_report',  'read',   'all', FALSE),
			-- payroll: admin can run previews; finalize is SUPERADMIN only
			('payroll', 'read', 'all',  FALSE),
			('payroll', 'run',  'all',  FALSE),
			-- settings: admin gets full settings including branding
			('settings', 'read',                'all', FALSE),
			('settings', 'edit',                'all', FALSE),
			('settings', 'manage_holidays',     'all', FALSE),
			('settings', 'manage_leave_policy', 'all', FALSE),
			('settings', 'manage_leave_flow',   'all', FALSE),
			('settings', 'manage_birthdays',    'all', FALSE),
			-- designation
			('designation', 'add',    'all', FALSE),
			('designation', 'read',   'all', FALSE),
			('designation', 'edit',   'all', FALSE),
			('designation', 'remove', 'all', FALSE),
			-- equipment
			('equipment', 'add',    'all', FALSE),
			('equipment', 'read',   'all', FALSE),
			('equipment', 'edit',   'all', FALSE),
			('equipment', 'remove', 'all', FALSE),
			('equipment', 'assign', 'all', FALSE),
			-- permission: admin can view and edit role permissions
			('permission', 'read', 'all', FALSE),
			('permission', 'edit', 'all', FALSE)
		) AS v(resource, action, scope, req_sen)
		JOIN tbl_permission p ON p.resource::TEXT = v.resource
		                     AND p.action::TEXT    = v.action
		ON CONFLICT (role_id, permission_id) DO NOTHING`,

		// ── MANAGER ───────────────────────────────────────────────────────────
		// Operates on their own team (scope='team') for reads/actions.
		// Personal leave operations use scope='own'.
		`INSERT INTO tbl_role_permission
			(role_id, permission_id, scope, require_seniority, is_enabled)
		SELECT
			4,       -- MANAGER
			p.id,
			v.scope,
			FALSE,
			TRUE
		FROM (VALUES
			('employee',      'read',          'team'),
			('leave',         'apply',         'own'),
			('leave',         'read',          'team'),
			('leave',         'edit',          'own'),
			('leave',         'approve',       'team'),
			('leave',         'reject',        'team'),
			('leave',         'cancel',        'own'),
			('leave',         'withdraw',      'own'),
			('leave_balance', 'read',          'team'),
			('payroll',       'read',          'own'),
			('designation',   'read',          'all')
		) AS v(resource, action, scope)
		JOIN tbl_permission p ON p.resource::TEXT = v.resource
		                     AND p.action::TEXT    = v.action
		ON CONFLICT (role_id, permission_id) DO NOTHING`,

		// ── EMPLOYEE ──────────────────────────────────────────────────────────
		// Self-service only — scope='own' on all personal data.
		`INSERT INTO tbl_role_permission
			(role_id, permission_id, scope, require_seniority, is_enabled)
		SELECT
			5,       -- EMPLOYEE
			p.id,
			v.scope,
			FALSE,
			TRUE
		FROM (VALUES
			('employee',      'read',    'own'),
			('leave',         'apply',   'own'),
			('leave',         'read',    'own'),
			('leave',         'edit',    'own'),
			('leave',         'cancel',  'own'),
			('leave',         'withdraw','own'),
			('leave_balance', 'read',    'own'),
			('payroll',       'read',    'own'),
			('designation',   'read',    'all')
		) AS v(resource, action, scope)
		JOIN tbl_permission p ON p.resource::TEXT = v.resource
		                     AND p.action::TEXT    = v.action
		ON CONFLICT (role_id, permission_id) DO NOTHING`,

		// ── INTERN ────────────────────────────────────────────────────────────
		// Same self-service scope as EMPLOYEE.
		// Payroll read excluded — interns do not see salary payslips by default.
		`INSERT INTO tbl_role_permission
			(role_id, permission_id, scope, require_seniority, is_enabled)
		SELECT
			6,       -- INTERN
			p.id,
			v.scope,
			FALSE,
			TRUE
		FROM (VALUES
			('employee',      'read',    'own'),
			('leave',         'apply',   'own'),
			('leave',         'read',    'own'),
			('leave',         'edit',    'own'),
			('leave',         'cancel',  'own'),
			('leave_balance', 'read',    'own'),
			('designation',   'read',    'all')
		) AS v(resource, action, scope)
		JOIN tbl_permission p ON p.resource::TEXT = v.resource
		                     AND p.action::TEXT    = v.action
		ON CONFLICT (role_id, permission_id) DO NOTHING`,
	}

	for i, stmt := range stmts {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("upTblPermissionSql stmt[%d]: %w", i, err)
		}
	}
	return nil
}

func downTblPermissionSql(ctx context.Context, tx *sql.Tx) error {
	stmts := []string{
		`DROP TABLE IF EXISTS tbl_role_permission`,
		`DROP TABLE IF EXISTS tbl_permission`,
		`DROP TYPE  IF EXISTS permission_action`,
		`DROP TYPE  IF EXISTS permission_resource`,
	}
	for i, stmt := range stmts {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("downTblPermissionSql stmt[%d]: %w", i, err)
		}
	}
	return nil
}
