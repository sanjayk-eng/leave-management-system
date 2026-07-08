package migrations

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
	statements := []string{

		// Enum: permission_resource
		`CREATE TYPE permission_resource AS ENUM (
			'employee',
			'leave',
			'leave_balance',
			'payroll',
			'settings',
			'company_setting',
			'asset',
			'leave_report',
			'permission'
		)`,

		// Enum: permission_action
		`CREATE TYPE permission_action AS ENUM (
			'add',
			'read',
			'edit',
			'remove',
			'change_password',
			'update_role',
			'assign_manager',
			'unassign_manager',
			'designation_management',
			'apply',
			'approve',
			'reject',
			'cancel',
			'withdraw',
			'adjust',
			'run',
			'birthdays_management',
			'holidays_management',
			'leave_policy_management',
			'leave_flow_management',
			'assign'
		)`,

		// Permission Table
		`CREATE TABLE IF NOT EXISTS tbl_permission (
			id          SERIAL PRIMARY KEY,
			resource    permission_resource NOT NULL,
			action      permission_action NOT NULL,
			description TEXT,

			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

			CONSTRAINT uq_tbl_permission_resource_action
				UNIQUE (resource, action)
		)`,

		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_tbl_permission_resource
			ON tbl_permission(resource)`,

		`CREATE INDEX IF NOT EXISTS idx_tbl_permission_action
			ON tbl_permission(action)`,


		// Seed Permissions
		`INSERT INTO tbl_permission (resource, action, description) VALUES

			-- Employee Management
			('employee', 'add',                    'Add a new employee record'),
			('employee', 'read',                   'View employee information'),
			('employee', 'edit',                   'Edit employee information'),
			('employee', 'remove',                 'Remove an employee record'),
			('employee', 'change_password',        'Change employee account password'),
			('employee', 'update_role',            'Update employee role assignment'),
			('employee', 'assign_manager',         'Assign a manager to an employee'),
			('employee', 'unassign_manager',       'Remove manager assignment from an employee'),
			('employee', 'designation_management', 'Manage employee designation assignment'),


			-- Leave Management
			('leave', 'apply',    'Submit a leave request'),
			('leave', 'read',     'View leave request details'),
			('leave', 'edit',     'Edit leave request information'),
			('leave', 'approve',  'Approve a leave request'),
			('leave', 'reject',   'Reject a leave request'),
			('leave', 'cancel',   'Cancel a leave request'),
			('leave', 'withdraw', 'Withdraw a leave request'),


			-- Leave Balance
			('leave_balance', 'adjust', 'Adjust employee leave balance'),


			-- Payroll Management
			('payroll', 'read', 'View payroll information'),
			('payroll', 'run',  'Process payroll operations'),


			-- Settings Management
			('settings', 'birthdays_management',    'Manage employee birthday settings'),
			('settings', 'holidays_management',     'Manage holiday calendar settings'),
			('settings', 'leave_policy_management', 'Manage leave policy configuration'),
			('settings', 'leave_flow_management',   'Manage leave approval workflow'),



			-- Asset Management
			('asset', 'add',    'Add a new asset record'),
			('asset', 'read',   'View asset information'),
			('asset', 'edit',   'Edit asset information'),
			('asset', 'remove', 'Remove an asset record'),
			('asset', 'assign', 'Assign asset to an employee'),


			-- Holiday Management
			('settings', 'holidays_management', 'Manage holiday calendar settings'),


			-- Leave Report
			('leave_report', 'read', 'View leave management reports'),


			-- Permission Management
			('permission', 'read', 'View available permissions'),
			('permission', 'edit', 'Edit permission details')

		ON CONFLICT (resource, action) DO NOTHING`,
	}

	for _, stmt := range statements {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("upTblPermissionSql: %w", err)
		}
	}

	return nil
}


func downTblPermissionSql(ctx context.Context, tx *sql.Tx) error {
	statements := []string{
		`DROP TABLE IF EXISTS tbl_permission`,
		`DROP TYPE IF EXISTS permission_action`,
		`DROP TYPE IF EXISTS permission_resource`,
	}

	for _, stmt := range statements {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("downTblPermissionSql: %w", err)
		}
	}

	return nil
}