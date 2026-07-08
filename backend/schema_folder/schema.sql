-- =====================================================
-- COMPLETE DATABASE SCHEMA - HR & LEAVE MANAGEMENT SYSTEM
-- =====================================================
-- Database: PostgreSQL
-- Last Updated: July 8, 2026
-- Total Tables: 23  (added tbl_permission + tbl_role_permission)
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TBL_ROLE - User Roles
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Role (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO Tbl_Role (type) VALUES 
    ('SUPERADMIN'),
    ('HR'),
    ('ADMIN'),
    ('MANAGER'),
    ('EMPLOYEE'),
    ('INTERN')
ON CONFLICT (type) DO NOTHING;

-- =====================================================
-- 2. TBL_DESIGNATION - Job Designations
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Designation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    designation_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- =====================================================
-- 3. TBL_EMPLOYEE - Core Employee Information
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Employee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role_id INT NOT NULL REFERENCES Tbl_Role(id),
    password TEXT NOT NULL,
    manager_id UUID REFERENCES Tbl_Employee(id),  -- Self-referencing for hierarchy
    designation_id UUID REFERENCES Tbl_Designation(id) ON DELETE SET NULL,
    salary NUMERIC,
    birth_date DATE DEFAULT NULL,
    joining_date DATE,
    ending_date DATE DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active/deactive
    deleted_at TIMESTAMP NULL,  -- Soft delete
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. TBL_LEAVE_TYPE - Leave Type Master
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Leave_Type (
    id SERIAL PRIMARY KEY,

    -- Leave Type Information
    name TEXT NOT NULL,

    -- Whether leave is paid or unpaid
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,

    -- Default yearly entitlement
    default_entitlement INT NOT NULL DEFAULT 0,

    -- Override entitlement for interns
    intern_entitlement INT DEFAULT NULL,

    -- Allows early leave (partial day)
    is_early BOOLEAN NOT NULL DEFAULT FALSE,

    -- Indicates this leave type is Work From Home
    is_work_from_home BOOLEAN NOT NULL DEFAULT FALSE,

    -- Approval workflow assigned to this leave type
    approval_flow_id UUID NULL,

    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_leave_type_approval_flow
        FOREIGN KEY (approval_flow_id)
        REFERENCES leave_approval_flow(id)
        ON DELETE SET NULL
);

-- =====================================================
-- 5. TBL_HALF - Leave Timing Master (Full/Half Day)
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Half (
    id INT PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,  -- FIRST_HALF / SECOND_HALF / FULL
    timing TEXT NOT NULL,        -- e.g. 10:00-13:30 or FULL_DAY
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default timing values
INSERT INTO Tbl_Half (id, type, timing) VALUES
    (1, 'FIRST_HALF',  '10:00-13:30'),
    (2, 'SECOND_HALF', '13:30-19:00'),
    (3, 'FULL',        '10:00-19:00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. TBL_LEAVE - Leave Applications
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Leave (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES Tbl_Employee(id),
    leave_type_id INT NOT NULL REFERENCES Tbl_Leave_type(id),
    half_id INT DEFAULT 3 REFERENCES Tbl_Half(id),  -- Default: FULL day
    leave_timing TEXT DEFAULT NULL,  -- Optional timing for early leave
    start_date DATE,
    end_date DATE,
    days NUMERIC,
    status TEXT,
    applied_by UUID REFERENCES Tbl_Employee(id),  -- Who applied (can be manager)
    approved_by UUID REFERENCES Tbl_Employee(id),
    reason TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status constraint
    CONSTRAINT chk_leave_status CHECK (
        status IN (
            'Pending',
            'APPROVED',
            'REJECTED',
            'CANCELLED',
            'WITHDRAWAL_PENDING',
            'WITHDRAWN'
        )
    )
);

-- =====================================================
-- 7. TBL_LEAVE_BALANCE - Leave Balance Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Leave_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES Tbl_Employee(id),
    leave_type_id INT NOT NULL REFERENCES Tbl_Leave_type(id),
    year INT,
    opening NUMERIC,   -- Opening balance
    accrued NUMERIC,   -- Accrued during year
    used NUMERIC,      -- Used leaves
    adjusted NUMERIC,  -- Manual adjustments
    closing NUMERIC,   -- Closing balance = opening + accrued - used + adjusted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_leave_balance UNIQUE (employee_id, leave_type_id, year)
);

-- =====================================================
-- 8. TBL_LEAVE_ACCRUAL_LOG - Monthly Accrual Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Leave_accrual_log (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   UUID    NOT NULL REFERENCES Tbl_Employee(id),
    leave_type_id INT     NOT NULL REFERENCES Tbl_Leave_type(id),
    month         INT     NOT NULL,  -- 1-12
    year          INT     NOT NULL,
    days_credited NUMERIC NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevents double-crediting the same employee+type+month+year
    CONSTRAINT uq_accrual_log UNIQUE (employee_id, leave_type_id, month, year)
);

-- =====================================================
-- 9. TBL_LEAVE_ADJUSTMENT - Manual Leave Adjustments
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Leave_adjustment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES Tbl_Employee(id),
    leave_type_id INT NOT NULL REFERENCES Tbl_Leave_type(id),
    quantity NUMERIC,
    reason TEXT,
    year INT,
    created_by UUID REFERENCES Tbl_Employee(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. TBL_HOLIDAY - Company Holidays
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Holiday (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL UNIQUE,
    day TEXT NOT NULL,
    type TEXT NOT NULL,  -- HOLIDAY or OPTIONAL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. TBL_PAYROLL_RUN - Monthly Payroll Processing
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Payroll_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INT,
    year INT,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 12. TBL_PAYSLIP - Employee Payslips
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Payslip (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES Tbl_Payroll_run(id),
    employee_id UUID NOT NULL REFERENCES Tbl_Employee(id),
    basic_salary NUMERIC,
    working_days INT,
    unpaid_leaves NUMERIC,  -- Changed from INT to NUMERIC for half-day support
    paid_leaves INT,
    early_leaves NUMERIC DEFAULT 0,  -- Early leave count (display only, no deduction)
    deduction_amount NUMERIC,
    net_salary NUMERIC,
    pdf_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One payslip per employee per payroll run
    CONSTRAINT uq_payroll_employee UNIQUE (payroll_run_id, employee_id)
);

-- =====================================================
-- 13. TBL_EQUIPMENT_CATEGORY - Equipment Categories
-- =====================================================
CREATE TABLE IF NOT EXISTS tbl_equipment_category (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================
-- 14. TBL_EQUIPMENT - Equipment Inventory
-- =====================================================
CREATE TABLE IF NOT EXISTS tbl_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category_id UUID NOT NULL REFERENCES tbl_equipment_category(id) ON DELETE RESTRICT,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,  -- Can multiple employees use?
    purchase_date DATE,
    price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    total_quantity INT NOT NULL CHECK (total_quantity >= 0),
    remaining_quantity INT NOT NULL CHECK (
        remaining_quantity >= 0 AND 
        remaining_quantity <= total_quantity
    ),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================
-- 15. TBL_EQUIPMENT_ASSIGNMENT - Equipment Assignment History
-- =====================================================
CREATE TABLE IF NOT EXISTS tbl_equipment_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES tbl_equipment(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES Tbl_Employee(id) ON DELETE RESTRICT,
    assigned_by UUID NOT NULL REFERENCES Tbl_Employee(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    assigned_at TIMESTAMP NOT NULL DEFAULT now(),
    returned_at TIMESTAMP  -- NULL = still assigned
);

-- =====================================================
-- 16. TBL_COMPANY_SETTINGS - Global Company Configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Company_Settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    working_days_per_month INT NOT NULL DEFAULT 22,
    allow_manager_add_leave BOOLEAN NOT NULL DEFAULT FALSE,
    company_name VARCHAR(255) DEFAULT 'DEMO',
    logo_path TEXT DEFAULT '',
    primary_color VARCHAR(7) DEFAULT '#2980b9',
    secondary_color VARCHAR(7) DEFAULT '#2ecc71',
    -- Supports placeholders: {name}, {date}, {age}
    birthday_message_template TEXT NOT NULL DEFAULT 'Happy Birthday {name}! 🎉 Wishing you a wonderful day and a fantastic year ahead!',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO Tbl_Company_Settings (id, working_days_per_month, allow_manager_add_leave, company_name, primary_color, secondary_color)
VALUES (gen_random_uuid(), 22, false, 'DEMO', '#2980b9', '#2ecc71')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 17. TBL_LOG - System Activity Logging
-- =====================================================
CREATE TABLE IF NOT EXISTS tbl_log (
    id SERIAL PRIMARY KEY,
    from_user_id UUID NOT NULL,  -- No FK for flexibility
    action VARCHAR(255) NOT NULL,
    component VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 18. TBL_AUDIT - Detailed Audit Trail
-- =====================================================
CREATE TABLE IF NOT EXISTS Tbl_Audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES Tbl_Employee(id),
    action TEXT,
    entity TEXT,
    entity_id UUID,
    metadata JSONB,  -- JSON data for additional information
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 19. TBL_LEAVE_APPROVAL_FLOW - Approval Workflow Engine
-- =====================================================
CREATE TABLE leave_approval_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    is_system BOOLEAN DEFAULT false,

    flow JSONB NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO leave_approval_flow (
    name,
    is_system,
    flow
)
VALUES (
    'Default Flows',
    true,
    '[
        {"stage_no": 1, "approver_role": "MANAGER"},
        {"stage_no": 2, "approver_role": "ADMIN"},
        {"stage_no": 3, "approver_role": "HR"},
        {"stage_no": 4, "approver_role": "SUPERADMIN"}
    ]'::jsonb
);
-- =====================================================
-- 20. TBL_LEAVE_FFLOW - Approval Workflow log Engine
-- =====================================================

CREATE TABLE IF NOT EXISTS Tbl_Leave_Flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_id UUID NOT NULL,
    approval_log JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- =====================================================
-- 21. RBAC — Permission Catalogue + Role Matrix
-- =====================================================

-- Enum: every protectable domain entity
-- Matches Go constants in pkg/constant/rbsc/resource.go
CREATE TYPE permission_resource AS ENUM (
    'employee',
    'leave',
    'leave_balance',
    'leave_report',
    'payroll',
    'settings',
    'designation',
    'equipment',
    'permission'
);

-- Enum: every allowed operation verb
-- Matches Go constants in pkg/constant/rbsc/actor.go
CREATE TYPE permission_action AS ENUM (
    -- universal CRUD
    'add', 'read', 'edit', 'remove',
    -- employee lifecycle
    'change_password', 'update_role',
    'assign_manager', 'unassign_manager',
    'activate', 'deactivate',
    'designation_management',
    -- leave workflow
    'apply', 'approve', 'reject', 'cancel', 'withdraw',
    -- balance
    'adjust',
    -- payroll
    'run', 'finalize',
    -- settings sub-actions
    'manage_holidays', 'manage_leave_policy',
    'manage_leave_flow', 'manage_birthdays',
    -- equipment
    'assign'
);

-- tbl_permission
-- System-owned catalogue. Rows are seeded by migration.
-- No user can INSERT or DELETE rows.
-- Users only toggle tbl_role_permission.is_enabled.
CREATE TABLE IF NOT EXISTS tbl_permission (
    id          SERIAL               PRIMARY KEY,
    resource    permission_resource  NOT NULL,
    action      permission_action    NOT NULL,
    label       TEXT                 NOT NULL,   -- human-readable, shown in UI
    description TEXT                 NOT NULL,   -- tooltip / help text
    is_visible  BOOLEAN              NOT NULL DEFAULT TRUE,
        -- FALSE = internal permission hidden from the UI
        -- (e.g. permission:read used only by the RBAC middleware)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_permission_resource_action UNIQUE (resource, action)
);

CREATE INDEX IF NOT EXISTS idx_permission_resource ON tbl_permission(resource);
CREATE INDEX IF NOT EXISTS idx_permission_action   ON tbl_permission(action);
CREATE INDEX IF NOT EXISTS idx_permission_visible  ON tbl_permission(is_visible);

-- tbl_role_permission
-- Bridge table: one row per (role, permission) pair.
--
-- Columns:
--   scope             'own'  — actor acts only on their own records
--                     'team' — actor acts on records of employees they manage
--                     'all'  — actor acts on any record in the system
--   require_seniority  TRUE = actor's role rank must be > target's role rank
--                      Seniority: SUPERADMIN=6 HR=5 ADMIN=4 MANAGER=3 EMPLOYEE=2 INTERN=1
--   is_enabled        THE ONLY COLUMN A USER CAN CHANGE (TRUE / FALSE toggle).
--                     scope and require_seniority require a code migration to change.
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

CREATE INDEX IF NOT EXISTS idx_role_perm_role      ON tbl_role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_permission ON tbl_role_permission(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_enabled    ON tbl_role_permission(is_enabled);

COMMENT ON TABLE tbl_permission IS
    'System-owned permission catalogue. Seeded by migration. Users cannot add or remove rows.';
COMMENT ON TABLE tbl_role_permission IS
    'Per-role permission assignments. is_enabled is the only user-editable column.';
COMMENT ON COLUMN tbl_role_permission.scope IS
    '''own'' = own records only | ''team'' = managed employees | ''all'' = entire system';
COMMENT ON COLUMN tbl_role_permission.require_seniority IS
    'TRUE = actor role rank must be strictly higher than the target employee role rank';
COMMENT ON COLUMN tbl_role_permission.is_enabled IS
    'THE ONLY USER-EDITABLE FIELD. TRUE = permission granted. FALSE = permission revoked.';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================


-- Employee indexes
CREATE INDEX IF NOT EXISTS idx_employee_email ON Tbl_Employee(email);
CREATE INDEX IF NOT EXISTS idx_employee_manager ON Tbl_Employee(manager_id);
CREATE INDEX IF NOT EXISTS idx_employee_role ON Tbl_Employee(role_id);
CREATE INDEX IF NOT EXISTS idx_employee_designation ON Tbl_Employee(designation_id);
CREATE INDEX IF NOT EXISTS idx_employee_status ON Tbl_Employee(status);

-- Leave indexes
CREATE INDEX IF NOT EXISTS idx_leave_employee ON Tbl_Leave(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON Tbl_Leave(status);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON Tbl_Leave(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_type ON Tbl_Leave(leave_type_id);

-- Leave balance indexes
CREATE INDEX IF NOT EXISTS idx_leave_balance_employee ON Tbl_Leave_balance(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balance_year ON Tbl_Leave_balance(year);

-- Leave accrual log indexes
CREATE INDEX IF NOT EXISTS idx_accrual_log_employee   ON Tbl_Leave_accrual_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_accrual_log_month_year ON Tbl_Leave_accrual_log(year, month);

-- Payslip indexes
CREATE INDEX IF NOT EXISTS idx_payslip_employee ON Tbl_Payslip(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslip_payroll ON Tbl_Payslip(payroll_run_id);

-- Equipment indexes
CREATE INDEX IF NOT EXISTS idx_equipment_category ON tbl_equipment(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignment_employee ON tbl_equipment_assignment(employee_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assignment_equipment ON tbl_equipment_assignment(equipment_id);

-- Log indexes
CREATE INDEX IF NOT EXISTS idx_log_user ON tbl_log(from_user_id);
CREATE INDEX IF NOT EXISTS idx_log_created ON tbl_log(created_at);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_actor ON Tbl_Audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON Tbl_Audit(entity, entity_id);

-- Permission indexes are defined inline with the table above.

-- =====================================================
-- COMMENTS ON TABLES
-- =====================================================

COMMENT ON TABLE Tbl_Role IS 'User roles: SUPERADMIN, HR, ADMIN, MANAGER, EMPLOYEE, INTERN';
COMMENT ON TABLE Tbl_Employee IS 'Core employee information with hierarchical structure';
COMMENT ON TABLE Tbl_Designation IS 'Job designations/positions';
COMMENT ON TABLE Tbl_Leave_type IS 'Leave type definitions with paid/unpaid and early leave support';
COMMENT ON TABLE Tbl_Half IS 'Leave timing master: FIRST_HALF, SECOND_HALF, FULL';
COMMENT ON TABLE Tbl_Leave IS 'Leave applications with approval workflow';
COMMENT ON TABLE Tbl_Leave_balance IS 'Annual leave balance tracking per employee';
COMMENT ON TABLE Tbl_Leave_accrual_log IS 'Monthly accrual log — prevents double-crediting per employee/type/month/year';
COMMENT ON TABLE Tbl_Leave_adjustment IS 'Manual leave balance adjustments';
COMMENT ON TABLE Tbl_Holiday IS 'Company holidays calendar';
COMMENT ON TABLE Tbl_Payroll_run IS 'Monthly payroll processing runs';
COMMENT ON TABLE Tbl_Payslip IS 'Individual employee payslips with leave deductions';
COMMENT ON TABLE tbl_equipment_category IS 'Equipment categories';
COMMENT ON TABLE tbl_equipment IS 'Equipment inventory with quantity tracking';
COMMENT ON TABLE tbl_equipment_assignment IS 'Equipment assignment history';
COMMENT ON TABLE Tbl_Company_Settings IS 'Global company configuration and branding';
COMMENT ON TABLE tbl_log IS 'System activity logging';
COMMENT ON TABLE Tbl_Audit IS 'Detailed audit trail with JSON metadata';
COMMENT ON TABLE tbl_permission IS 'System-owned permission catalogue — seeded by migration, read-only from API';
COMMENT ON TABLE tbl_role_permission IS 'Per-role permission matrix — is_enabled is the only user-editable column';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
