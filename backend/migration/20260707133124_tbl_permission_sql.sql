-- +goose Up
-- ─────────────────────────────────────────────────────────────────────────────
-- Industry-Level RBAC Permission System
--
-- Tables
-- ──────
--  tbl_permission      — system-owned catalogue of every resource:action pair.
--                        Predefined. No user can INSERT or DELETE rows.
--                        Users only toggle tbl_role_permission.is_enabled.
--
--  tbl_role_permission — per-role permission assignment.
--                        scope             'own' | 'team' | 'all'
--                        require_seniority  actor must outrank the target
--                        is_enabled         THE ONLY column users can flip
--
-- Resource values (match Go constants in pkg/constant/rbsc/resource.go)
-- ──────────────────────────────────────────────────────────────────────
--  employee      → Tbl_Employee
--  leave         → Tbl_Leave
--  leave_balance → Tbl_Leave_balance + Tbl_Leave_adjustment
--  leave_report  → read-only reporting
--  payroll       → Tbl_Payroll_run + Tbl_Payslip
--  settings      → Tbl_Company_Settings + sub-management actions
--  designation   → Tbl_Designation
--  equipment     → tbl_equipment* (was 'asset' in old version — fixed)
--  permission    → tbl_permission + tbl_role_permission
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Enum: permission_resource ─────────────────────────────────────────────
CREATE TYPE permission_resource AS ENUM (
    'employee',
    'leave',
    'leave_balance',
    'leave_report',
    'payroll',
    'settings',
    'designation',
    'asset',
    'permission',
    'log'
);

-- ── 2. Enum: permission_action ───────────────────────────────────────────────
CREATE TYPE permission_action AS ENUM (
    -- universal CRUD
    'add',
    'read',
    'edit',
    'remove',

    -- employee lifecycle
    'change_password',
    'update_role',
    'assign_manager',
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
);

-- ── 3. tbl_permission ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tbl_permission (
    id          SERIAL               PRIMARY KEY,
    resource    permission_resource  NOT NULL,
    action      permission_action    NOT NULL,
    label       TEXT                 NOT NULL,
    description TEXT                 NOT NULL,
    is_visible  BOOLEAN              NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permission_resource_action UNIQUE (resource, action)
);

CREATE INDEX IF NOT EXISTS idx_permission_resource ON tbl_permission(resource);
CREATE INDEX IF NOT EXISTS idx_permission_action   ON tbl_permission(action);
CREATE INDEX IF NOT EXISTS idx_permission_visible  ON tbl_permission(is_visible);

-- ── 4. Seed tbl_permission ───────────────────────────────────────────────────
INSERT INTO tbl_permission (resource, action, label, description, is_visible) VALUES

    -- EMPLOYEE
    ('employee', 'add',                   'Add Employee',          'Create a new employee account in the system',                        TRUE),
    ('employee', 'read',                  'View Employees',        'View employee list and individual employee profiles',                TRUE),
    ('employee', 'edit',                  'Edit Employee',         'Update employee personal information (name, email, salary, dates)',  TRUE),
    ('employee', 'remove',                'Remove Employee',       'Permanently remove an employee record',                             TRUE),
    ('employee', 'change_password',       'Change Password',       'Reset or change an employee account password',                      TRUE),
    ('employee', 'update_role',           'Update Role',           'Change an employee role (e.g. EMPLOYEE → MANAGER)',                 TRUE),
    ('employee', 'assign_manager',        'Assign Manager',        'Link an employee to a manager in the reporting hierarchy',          TRUE),
    ('employee', 'activate',              'Activate Employee',     'Re-activate a deactivated employee account',                        TRUE),
    ('employee', 'deactivate',            'Deactivate Employee',   'Deactivate (soft-delete) an employee account',                      TRUE),
    ('employee', 'designation_management','Manage Designation',    'Assign or change an employee job designation',                      TRUE),

    -- LEAVE
    ('leave', 'apply',    'Apply Leave',    'Submit a leave request on behalf of self or a team member',      TRUE),
    ('leave', 'read',     'View Leaves',    'View leave requests (scope controls own / team / all)',          TRUE),
    ('leave', 'edit',     'Edit Leave',     'Edit a pending leave request before it is processed',            TRUE),
    ('leave', 'approve',  'Approve Leave',  'Approve a leave request in the approval workflow',               TRUE),
    ('leave', 'reject',   'Reject Leave',   'Reject a leave request in the approval workflow',                TRUE),
    ('leave', 'cancel',   'Cancel Leave',   'Cancel a pending leave request',                                 TRUE),
    ('leave', 'withdraw', 'Withdraw Leave', 'Initiate or confirm a leave withdrawal after approval',          TRUE),

    -- LEAVE BALANCE
    ('leave_balance', 'adjust', 'Adjust Leave Balance', 'Manually increase or decrease an employee leave balance',      TRUE),

    -- LEAVE REPORT
    ('leave_report', 'read', 'View Leave Reports', 'Access monthly, yearly, or date-range leave reports',              TRUE),

    -- PAYROLL
    ('payroll', 'read',     'View Payroll',     'View payslips and payroll run history',                               TRUE),
    ('payroll', 'run',      'Run Payroll',      'Generate a payroll preview for a given month and year',               TRUE),
    ('payroll', 'finalize', 'Finalize Payroll', 'Lock and finalize a payroll run, generating official payslips',       TRUE),

    -- SETTINGS
    ('settings', 'read',                'View Settings',         'View company settings, branding, and configuration',             TRUE),
    ('settings', 'edit',                'Edit Settings',         'Update company settings such as working days and branding',      TRUE),
    ('settings', 'manage_holidays',     'Manage Holidays',       'Add, view, or remove company holiday calendar entries',          TRUE),
    ('settings', 'manage_leave_policy', 'Manage Leave Policy',   'Create, update, or delete leave type definitions',               TRUE),
    ('settings', 'manage_leave_flow',   'Manage Approval Flow',  'Create, update, or delete leave approval workflow configurations',TRUE),
    ('settings', 'manage_birthdays',    'Manage Birthday Settings','Configure the birthday message template and notification schedule',TRUE),

    -- EQUIPMENT
    ('asset', 'add',    'Add asset',    'Add new asset or a new asset category',              TRUE),
    ('asset', 'read',   'View asset',   'View asset inventory and assignment history',             TRUE),
    ('asset', 'edit',   'Edit asset',   'Update asset details or category information',            TRUE),
    ('asset', 'remove', 'Remove asset', 'Delete asset or asset category records',              TRUE),
    ('asset', 'assign', 'Assign asset', 'Assign, reassign, or return asset to/from employees',    TRUE),

    -- PERMISSION (is_visible=FALSE: used by RBAC middleware, hidden from UI)
    ('permission', 'read', 'View Permissions',      'Read the permission catalogue and role-permission matrix',    TRUE),
    ('permission', 'edit', 'Edit Role Permissions', 'Toggle is_enabled on tbl_role_permission rows for any role', TRUE),

    -- LOGGING (is_visible=FALSE: used by RBAC middleware, hidden from UI)
    ('log', 'read', 'View System Logs', 'Read system activity logs and audit trail entries', TRUE)
ON CONFLICT (resource, action) DO UPDATE
    SET label       = EXCLUDED.label,
        description = EXCLUDED.description,
        is_visible  = EXCLUDED.is_visible,
        updated_at  = NOW();

-- ── 5. tbl_role_permission ───────────────────────────────────────────────────
--
--  scope             'own'  = actor acts only on their own records
--                    'team' = actor acts on records of employees they manage
--                    'all'  = actor acts on any record in the system
--
--  require_seniority  TRUE = actor role rank must be > target role rank
--                     Seniority: SUPERADMIN=6 HR=5 ADMIN=4 MANAGER=3 EMPLOYEE=2 INTERN=1
--
--  is_enabled         THE ONLY USER-EDITABLE FIELD.
--                     TRUE = permission granted. FALSE = revoked.
CREATE TABLE IF NOT EXISTS tbl_role_permission (
    role_id              INT     NOT NULL REFERENCES Tbl_Role(id)       ON DELETE CASCADE,
    permission_id        INT     NOT NULL REFERENCES tbl_permission(id) ON DELETE CASCADE,
    scope                TEXT    NOT NULL DEFAULT 'own'
        CHECK (scope IN ('own', 'team', 'all')),
    require_seniority    BOOLEAN NOT NULL DEFAULT FALSE,
    is_enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_perm_role       ON tbl_role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_permission ON tbl_role_permission(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_enabled    ON tbl_role_permission(is_enabled);

-- ── 6. Seed tbl_role_permission — default RBAC matrix ────────────────────────
--
-- Role IDs from Tbl_Role seed:
--   1=SUPERADMIN  2=HR  3=ADMIN  4=MANAGER  5=EMPLOYEE  6=INTERN

-- SUPERADMIN: all permissions, all scope, no seniority check
INSERT INTO tbl_role_permission (role_id, permission_id, scope, require_seniority, is_enabled)
SELECT 1, id, 'all', FALSE, TRUE
FROM tbl_permission
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HR: all employee/leave/settings ops, seniority required, no payroll run/finalize
INSERT INTO tbl_role_permission (role_id, permission_id, scope, require_seniority, is_enabled)
SELECT 2, p.id, v.scope, v.req_sen::BOOLEAN, TRUE
FROM (VALUES
    ('employee', 'add',                   'all',  TRUE),
    ('employee', 'read',                  'all',  TRUE),
    ('employee', 'edit',                  'all',  TRUE),
    ('employee', 'change_password',       'all',  TRUE),
    ('employee', 'update_role',           'all',  TRUE),
    ('employee', 'assign_manager',        'all',  TRUE),
    ('employee', 'activate',              'all',  TRUE),
    ('employee', 'deactivate',            'all',  TRUE),
    ('employee', 'designation_management','all',  TRUE),
    ('leave', 'apply',                    'own',  FALSE),
    ('leave',    'read',                  'all',  FALSE),
    ('leave',    'approve',               'all',  FALSE),
    ('leave',    'reject',                'all',  FALSE),
    ('leave',    'cancel',                'own',  FALSE),
    ('leave',    'withdraw',              'all',  FALSE),
    ('leave_balance', 'adjust',           'all',  FALSE),
    ('payroll',  'read',                  'all',  FALSE),
    ('settings', 'read',                  'all',  FALSE),
    ('settings', 'edit',                  'all',  FALSE),
    ('settings', 'manage_holidays',       'all',  FALSE),
    ('settings', 'manage_leave_policy',   'all',  FALSE),
    ('settings', 'manage_leave_flow',     'all',  FALSE),
    ('settings', 'manage_birthdays',      'all',  FALSE),
    ('asset', 'add',    'all', FALSE),
    ('asset', 'read',   'all', FALSE),
    ('asset', 'edit',   'all', FALSE),
    ('asset', 'remove', 'all', FALSE),
    ('asset', 'assign', 'all', FALSE),
    ('permission','read','all', FALSE),
    ('permission','edit','all', FALSE),
    ('log','read','all', FALSE),
    ('leave_report','read','all', FALSE)
) AS v(resource, action, scope, req_sen)
JOIN tbl_permission p ON p.resource::TEXT = v.resource AND p.action::TEXT = v.action
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ADMIN: HR + payroll:run + leave_balance:adjust + settings:edit + permission:edit
INSERT INTO tbl_role_permission (role_id, permission_id, scope, require_seniority, is_enabled)
SELECT 3, p.id, v.scope, v.req_sen::BOOLEAN, TRUE
FROM (VALUES
    ('employee', 'add',                   'all',  TRUE),
    ('employee', 'read',                  'all',  TRUE),
    ('employee', 'edit',                  'all',  TRUE),
    ('employee', 'change_password',       'all',  TRUE),
    ('employee', 'update_role',           'all',  TRUE),
    ('employee', 'assign_manager',        'all',  TRUE),
    ('employee', 'activate',              'all',  TRUE),
    ('employee', 'deactivate',            'all',  TRUE),
    ('employee', 'designation_management','all',  TRUE),
    ('leave','apply',    'own',  FALSE),
    ('leave','read',     'all',  FALSE),
    ('leave','edit',     'own',  FALSE),
    ('leave','approve',  'all',  FALSE),
    ('leave','reject',   'all',  FALSE),
    ('leave','cancel',   'all',  FALSE),
    ('leave','withdraw', 'all',  FALSE),
    ('leave_balance', 'read',             'all',  FALSE),
    ('leave_balance', 'adjust',           'all',  FALSE),
    ('leave_report',  'read',             'all',  FALSE),
    ('payroll',  'read',                  'all',  FALSE),
    ('payroll',  'run',                   'all',  FALSE),
    ('settings', 'read',                  'all',  FALSE),
    ('settings', 'edit',                  'all',  FALSE),
    ('settings', 'manage_holidays',       'all',  FALSE),
    ('settings', 'manage_leave_policy',   'all',  FALSE),
    ('settings', 'manage_leave_flow',     'all',  FALSE),
    ('settings', 'manage_birthdays',      'all',  FALSE),
    ('asset', 'add',    'all', FALSE),
    ('asset', 'read',   'all', FALSE),
    ('asset', 'edit',   'all', FALSE),
    ('asset', 'remove', 'all', FALSE),
    ('asset', 'assign', 'all', FALSE),
    ('permission', 'read',  'all', FALSE),
    ('permission', 'edit',  'all', FALSE),
    ('log', 'read',  'all', FALSE)
) AS v(resource, action, scope, req_sen)
JOIN tbl_permission p ON p.resource::TEXT = v.resource AND p.action::TEXT = v.action
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MANAGER: team reads/approvals, own leave ops
INSERT INTO tbl_role_permission (role_id, permission_id, scope, require_seniority, is_enabled)
SELECT 4, p.id, v.scope, FALSE, TRUE
FROM (VALUES
    ('employee',      'read',     'team'),
    ('leave',         'apply',    'own'),
    ('leave',         'read',     'team'),
    ('leave',         'edit',     'own'),
    ('leave',         'approve',  'team'),
    ('leave',         'reject',   'team'),
    ('leave',         'cancel',   'own'),
    ('leave',         'withdraw', 'own'),
    ('log',            'read',    'team'),
    ('leave_report',   'read',    'team')
) AS v(resource, action, scope)
JOIN tbl_permission p ON p.resource::TEXT = v.resource AND p.action::TEXT = v.action
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- EMPLOYEE: self-service only
INSERT INTO tbl_role_permission (role_id, permission_id, scope, require_seniority, is_enabled)
SELECT 5, p.id, v.scope, FALSE, TRUE
FROM (VALUES
    ('employee',      'read',     'own'),
    ('leave',         'apply',    'own'),
    ('leave',         'read',     'own'),
    ('leave',         'edit',     'own'),
    ('leave',         'cancel',   'own'),
    ('log',            'read',    'own'),
    ('leave_report',   'read',    'own')
) AS v(resource, action, scope)
JOIN tbl_permission p ON p.resource::TEXT = v.resource AND p.action::TEXT = v.action
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- INTERN: same as EMPLOYEE minus payroll read
INSERT INTO tbl_role_permission (role_id, permission_id, scope, require_seniority, is_enabled)
SELECT 6, p.id, v.scope, FALSE, TRUE
FROM (VALUES
    ('employee',      'read',     'own'),
    ('leave',         'apply',    'own'),
    ('leave',         'read',     'own'),
    ('leave',         'edit',     'own'),
    ('leave',         'cancel',   'own'),
    ('log',            'read',    'own'),
    ('leave_report',   'read',    'own')
) AS v(resource, action, scope)
JOIN tbl_permission p ON p.resource::TEXT = v.resource AND p.action::TEXT = v.action
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down
DROP TABLE  IF EXISTS tbl_role_permission;
DROP TABLE  IF EXISTS tbl_permission;
DROP TYPE   IF EXISTS permission_action;
DROP TYPE   IF EXISTS permission_resource;