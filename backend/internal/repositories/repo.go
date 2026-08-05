package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type EmployeeAuthData struct {
	ID       string `db:"id"`
	Email    string `db:"email"`
	Password string `db:"password"`
	Role     string `db:"role"`
	Status   string `db:"status"`
}

type Repository struct {
	DB *sqlx.DB
}

func InitializeRepo(db *sqlx.DB) *Repository {
	return &Repository{
		DB: db,
	}
}
func (r *Repository) GetEmployeeByEmail(email string) (EmployeeAuthData, error) {
	var emp EmployeeAuthData

	query := `
		SELECT 
			e.id,
			e.email,
			e.password,
			r.type AS role,
			e.status
		FROM Tbl_Employee e
		JOIN Tbl_Role r ON e.role_id = r.id
		WHERE e.email = $1 AND e.status = 'active'
		LIMIT 1
	`

	err := r.DB.Get(&emp, query, email)
	return emp, err
}

// ------------------ GET ADMIN AND EMPLOYEE EMAIL ------------------

func (r *Repository) GetAdminAndEmployeeEmail(id uuid.UUID) ([]string, error) {
	var recipients []string
	var managerEmail string
	err := r.DB.Get(&managerEmail, `
			SELECT e2.email 
			FROM Tbl_Employee e1
			JOIN Tbl_Employee e2 ON e1.manager_id = e2.id
			WHERE e1.id = $1
		`, id)
	if err == nil && managerEmail != "" {
		recipients = append(recipients, managerEmail)
	}
	var adminEmails []string
	r.DB.Select(&adminEmails, `
			SELECT e.email 
			FROM Tbl_Employee e
			JOIN Tbl_Role r ON e.role_id = r.id
			WHERE r.type IN ('ADMIN', 'SUPERADMIN', 'HR') AND e.status = 'active'
		`)
	recipients = append(recipients, adminEmails...)

	return recipients, nil
}

func (r *Repository) GetEmployeeDetailsForNotification(id uuid.UUID) (empDetails struct {
	Email    string `db:"email"`
	FullName string `db:"full_name"`
}, err error) {
	err = r.DB.Get(&empDetails, "SELECT email, full_name FROM Tbl_Employee WHERE id=$1", id)
	return empDetails, err
}

func (r *Repository) DeleteEmployeeStatus(tx *sqlx.Tx, id uuid.UUID) (string, error) {
	// Get current status
	var currentStatus string
	err := tx.QueryRow(`SELECT status FROM Tbl_Employee WHERE id = $1`, id).Scan(&currentStatus)
	if err != nil {
		return "", fmt.Errorf("employee not found: %w", err)
	}

	// Toggle logic
	newStatus := "active"
	if currentStatus == "active" {
		newStatus = "deactive"
	}

	// Update employee status
	_, err = tx.Exec(`
        UPDATE Tbl_Employee SET status = $1, updated_at = NOW() WHERE id = $2
    `, newStatus, id)
	if err != nil {
		return "", err
	}

	// When deactivating: restore all assigned equipment back to the pool
	if newStatus == "deactive" {
		if err := r.restoreEmployeeEquipment(tx, id); err != nil {
			return "", err
		}
	}

	return newStatus, nil
}

// restoreEmployeeEquipment removes all equipment assignments for an employee
// by reusing RemoveEquipment for each distinct equipment assigned to them.
func (r *Repository) restoreEmployeeEquipment(tx *sqlx.Tx, employeeID uuid.UUID) error {
	// Fetch distinct equipment IDs assigned to this employee
	rows, err := tx.Query(`
		SELECT DISTINCT equipment_id FROM tbl_equipment_assignment WHERE employee_id = $1
	`, employeeID)
	if err != nil {
		return fmt.Errorf("failed to fetch assignments: %w", err)
	}
	defer rows.Close()

	var equipmentIDs []uuid.UUID
	for rows.Next() {
		var eqID uuid.UUID
		if err := rows.Scan(&eqID); err != nil {
			return fmt.Errorf("failed to scan equipment id: %w", err)
		}
		equipmentIDs = append(equipmentIDs, eqID)
	}

	for _, eqID := range equipmentIDs {
		req := models.RemoveAssignmentRequest{
			EmployeeID:  employeeID,
			EquipmentID: eqID,
		}
		if err := r.RemoveEquipment(tx, req); err != nil {
			return err
		}
	}

	return nil
}

// ------------------ GET ROLE ID ------------------
func (r *Repository) GetRoleID(role string) (string, error) {
	var id string
	err := r.DB.QueryRow(`SELECT id FROM Tbl_Role WHERE type=$1`, role).Scan(&id)
	return id, err
}

// ------------------ GET ALL ROLES ------------------
func (r *Repository) GetAllRoles() ([]models.Role, error) {
	var roles []models.Role
	err := r.DB.Select(&roles, `SELECT id, type, priority FROM Tbl_Role ORDER BY priority`)
	return roles, err
}

// ------------------ GET CURRENT ROLE NAME ------------------
func (r *Repository) GetEmployeeCurrentRole(empID string) (string, error) {
	var role string
	err := r.DB.QueryRow(`
        SELECT R.TYPE
        FROM TBL_EMPLOYEE E
        JOIN TBL_ROLE R ON E.ROLE_ID = R.ID
        WHERE E.ID = $1
    `, empID).Scan(&role)
	return role, err
}

// ------------------ UPDATE ROLE ------------------
func (r *Repository) UpdateEmployeeRole(tx *sqlx.Tx, empID uuid.UUID, newRole string) (string, error) {
	var id string
	query := `
        UPDATE TBL_EMPLOYEE
        SET ROLE_ID = (SELECT ID FROM TBL_ROLE WHERE TYPE=$1),
            UPDATED_AT = NOW()
        WHERE ID = $2
        RETURNING ID;
    `
	err := tx.QueryRow(query, newRole, empID).Scan(&id)
	return id, err
}

// ------------------ CHECK MANAGER EXISTS ------------------
func (r *Repository) ManagerExists(id uuid.UUID) (bool, error) {
	var exists bool
	err := r.DB.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM TBL_EMPLOYEE WHERE ID=$1)`,
		id,
	).Scan(&exists)
	return exists, err
}

// ------------------ UPDATE MANAGER ------------------
func (r *Repository) UpdateManager(empID, managerID uuid.UUID) error {
	_, err := r.DB.Exec(`
        UPDATE TBL_EMPLOYEE
        SET MANAGER_ID=$1, UPDATED_AT=NOW()
        WHERE ID=$2
    `, managerID, empID)
	return err
}

func (r *Repository) GetEmployeeCurrentRoleAndManagerStatus(empID uuid.UUID) (string, bool, error) {
	var role string
	var count int
	query := `
	SELECT r.type, 
	       (SELECT COUNT(*) FROM Tbl_Employee e2 WHERE e2.manager_id=e.id) AS sub_count
	FROM Tbl_Employee e
	JOIN Tbl_Role r ON e.role_id=r.id
	WHERE e.id=$1
	`
	err := r.DB.QueryRow(query, empID).Scan(&role, &count)
	if err != nil {
		return "", false, err
	}
	return role, count > 0, nil
}

func (r *Repository) GetAllFinalizedPayslips() (*sql.Rows, error) {
	query := `
	SELECT 
	    p.id AS payslip_id,
	    e.id AS employee_id,
	    e.full_name,
	    e.email,
	    pr.month,
	    pr.year,
	    p.basic_salary,
	    p.working_days,
		p.paid_leaves,
	    p.unpaid_leaves,
	    COALESCE(p.early_leaves, 0) AS early_leaves,
	    p.deduction_amount,
	    p.net_salary,
	    COALESCE(p.pdf_path, '') AS pdf_path,
	    CONCAT('₹', p.basic_salary, ' - ₹', p.deduction_amount, ' = ₹', p.net_salary) AS calculation,
	    p.created_at
	FROM Tbl_Payslip p
	JOIN Tbl_Employee e ON p.employee_id = e.id
	JOIN Tbl_Payroll_Run pr ON pr.id = p.payroll_run_id
	WHERE pr.status = 'FINALIZED'
	ORDER BY pr.year DESC, pr.month DESC, e.full_name ASC;
	`
	return r.DB.Query(query)
}

func (r *Repository) GetFinalizedPayslipsByEmployee(id uuid.UUID) (*sql.Rows, error) {
	query := `
	SELECT 
	    p.id AS payslip_id,
	    e.id AS employee_id,
	    e.full_name,
	    e.email,
	    pr.month,
	    pr.year,
	    p.basic_salary,
	    p.working_days,
		p.paid_leaves,
	    p.unpaid_leaves,
	    COALESCE(p.early_leaves, 0) AS early_leaves,
	    p.deduction_amount,
	    p.net_salary,
	    COALESCE(p.pdf_path, '') AS pdf_path,
	    CONCAT('₹', p.basic_salary, ' - ₹', p.deduction_amount, ' = ₹', p.net_salary) AS calculation,
	    p.created_at
	FROM Tbl_Payslip p
	JOIN Tbl_Employee e ON p.employee_id = e.id
	JOIN Tbl_Payroll_Run pr ON pr.id = p.payroll_run_id
	WHERE pr.status = 'FINALIZED' AND e.id = $1
	ORDER BY pr.year DESC, pr.month DESC;
	`
	return r.DB.Query(query, id)
}

// ------------------ GET EMPLOYEE BY ID ------------------
// Returns EmployeeResponse (no password). Use for API and internal checks (role, email, salary).
func (r *Repository) GetEmployeeByID(empID uuid.UUID) (*models.EmployeeResponse, error) {
	var emp models.EmployeeResponse
	query := `
        SELECT 
            e.id, e.full_name, e.email, e.status,
            r.type AS role, e.manager_id, e.designation_id,
            e.salary, e.joining_date, e.birth_date, e.ending_date,
            e.created_at, e.updated_at,
            m.full_name AS manager_name,
            d.designation_name
        FROM Tbl_Employee e
        JOIN Tbl_Role r ON e.role_id = r.id
        LEFT JOIN Tbl_Employee m ON e.manager_id = m.id
        LEFT JOIN Tbl_Designation d ON e.designation_id = d.id
        WHERE e.id = $1
    `
	err := r.DB.QueryRow(query, empID).Scan(
		&emp.ID,
		&emp.FullName,
		&emp.Email,
		&emp.Status,
		&emp.Role,
		&emp.ManagerID,
		&emp.DesignationID,
		&emp.Salary,
		&emp.JoiningDate,
		&emp.BirthDate,
		&emp.EndingDate,
		&emp.CreatedAt,
		&emp.UpdatedAt,
		&emp.ManagerName,
		&emp.DesignationName,
	)
	if err != nil {
		return nil, err
	}
	return &emp, nil
}

// ------------------ UPDATE EMPLOYEE INFO ------------------
func (r *Repository) UpdateEmployeeInfo(empID uuid.UUID, fullName, email string, salary *float64, joiningDate, birthDate, endingDate *time.Time) error {
	_, err := r.DB.Exec(`
        UPDATE Tbl_Employee
        SET full_name = $1, email = $2, salary = $3, joining_date = $4, birth_date = $5, ending_date = $6, updated_at = NOW()
        WHERE id = $7
    `, fullName, email, salary, joiningDate, birthDate, endingDate, empID)
	return err
}

// UpdateEmployeeInfoTx is the transaction-aware version of UpdateEmployeeInfo.
func (r *Repository) UpdateEmployeeInfoTx(tx *sqlx.Tx, empID uuid.UUID, fullName, email string, salary *float64, joiningDate, birthDate, endingDate *time.Time) error {
	_, err := tx.Exec(`
        UPDATE Tbl_Employee
        SET full_name = $1, email = $2, salary = $3, joining_date = $4, birth_date = $5, ending_date = $6, updated_at = NOW()
        WHERE id = $7
    `, fullName, email, salary, joiningDate, birthDate, endingDate, empID)
	return err
}

// ------------------ UPDATE EMPLOYEE PASSWORD ------------------
func (r *Repository) UpdateEmployeePassword(empID uuid.UUID, hashedPassword string) error {
	_, err := r.DB.Exec(`
        UPDATE Tbl_Employee
        SET password = $1, updated_at = NOW()
        WHERE id = $2
    `, hashedPassword, empID)
	return err
}

func (r *Repository) CheckManagerPermission() (bool, error) {
	var exists bool
	query := `SELECT allow_manager_add_leave FROM Tbl_Company_Settings LIMIT 1`

	err := r.DB.QueryRow(query).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// ------------------ GET EMPLOYEES BY MANAGER ID ------------------
func (r *Repository) GetEmployeesByManagerID(managerID uuid.UUID, params models.TeamFilterParams) ([]models.EmployeeResponse, error) {
	orderBy := resolveEmployeeSort(params.SortBy, params.SortOrder)

	query := fmt.Sprintf(`
        SELECT
            e.id, e.full_name, e.email, e.status,
            r.type AS role, e.manager_id, e.designation_id,
            e.salary, e.joining_date, e.birth_date, e.ending_date,
            e.created_at, e.updated_at,
            m.full_name AS manager_name,
            d.designation_name
        FROM Tbl_Employee e
        JOIN Tbl_Role r ON e.role_id = r.id
        LEFT JOIN Tbl_Employee m ON e.manager_id = m.id
        LEFT JOIN Tbl_Designation d ON e.designation_id = d.id
        WHERE e.manager_id = $1
        ORDER BY %s
    `, orderBy)

	rows, err := r.DB.Query(query, managerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	employees := []models.EmployeeResponse{}
	for rows.Next() {
		var emp models.EmployeeResponse
		if err := rows.Scan(
			&emp.ID, &emp.FullName, &emp.Email, &emp.Status,
			&emp.Role, &emp.ManagerID, &emp.DesignationID,
			&emp.Salary, &emp.JoiningDate, &emp.BirthDate, &emp.EndingDate,
			&emp.CreatedAt, &emp.UpdatedAt,
			&emp.ManagerName, &emp.DesignationName,
		); err != nil {
			return nil, err
		}
		employees = append(employees, emp)
	}
	return employees, nil
}

func (r *Repository) GetRecipientsByRoles(ctx context.Context, employeeID uuid.UUID, roles []string) ([]models.Recipient, error) {

	query := `
	WITH manager_recipient AS (
		SELECT
			m.id,
			m.full_name,
			m.email,
			'MANAGER' AS role
		FROM Tbl_Employee e
		JOIN Tbl_Employee m
			ON e.manager_id = m.id
		WHERE e.id = $1
	),

	role_recipients AS (
		SELECT
			e.id,
			e.full_name,
			e.email,
			r.type AS role
		FROM Tbl_Employee e
		JOIN Tbl_Role r
			ON e.role_id = r.id
		WHERE r.type = ANY($2)
		  AND r.type <> 'MANAGER'
		  AND e.status = 'active'
		  AND e.deleted_at IS NULL
	)

	SELECT * FROM manager_recipient
	WHERE 'MANAGER' = ANY($2)

	UNION ALL

	SELECT * FROM role_recipients
	`

	var recipients []models.Recipient

	err := r.DB.SelectContext(
		ctx,
		&recipients,
		query,
		employeeID,
		pq.Array(roles),
	)

	return recipients, err
}

func (r *Repository) IsHolidayDate(date time.Time) (bool, error) {
	var count int

	err := r.DB.QueryRow(`
		SELECT COUNT(*)
		FROM Tbl_Holiday
		WHERE date::date = $1::date
	`, date).Scan(&count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}
func (r *Repository) GetByFilterHolidayBetweenTwoDates(tx *sqlx.Tx, start, end time.Time) ([]time.Time, error) {
	var holidays []time.Time

	query := `
		SELECT date
		FROM Tbl_Holiday
		WHERE date BETWEEN $1 AND $2
	`

	err := tx.Select(&holidays, query, start, end)
	return holidays, err
}

func (r *Repository) GetAllActiveEmployeesWithRoles(tx *sqlx.Tx) ([]models.ActiveEmployeeRole, error) {
	var employees []models.ActiveEmployeeRole
	err := tx.Select(&employees, `
		SELECT e.id, r.type AS role, e.joining_date
		FROM Tbl_Employee e
		JOIN Tbl_Role r ON e.role_id = r.id
		WHERE e.status = 'active'
	`)
	return employees, err
}

// GetAllLeaveTypesWithEntitlements fetches all non-early, active leave types with their entitlements.
// Early leave types (is_early = true) and inactive types are excluded — they have no balance bucket.
func (r *Repository) GetAllLeaveTypesWithEntitlements() ([]models.LeaveTypeData, error) {
	var leaveTypes []models.LeaveTypeData
	query := `
		SELECT 
			lt.id AS leave_type_id,
			lt.name AS leave_type_name,
			COALESCE(lt.default_entitlement, 0) AS default_entitlement,
			lt.intern_entitlement,
			lt.associate_month
		FROM Tbl_Leave_Type lt
		WHERE (lt.is_early IS NULL OR lt.is_early = FALSE)
		  AND lt.is_active = TRUE
		ORDER BY lt.id
	`
	err := r.DB.Select(&leaveTypes, query)
	return leaveTypes, err
}

// GetLeaveBalancesByEmployeeAndYear fetches leave balances for a specific employee and year
func (r *Repository) GetLeaveBalancesByEmployeeAndYear(employeeID uuid.UUID, year int) ([]models.BalanceData, error) {
	var balanceRecords []models.BalanceData
	query := `
		SELECT 
			leave_type_id,
			COALESCE(opening, 0) AS opening,
			COALESCE(accrued, 0) AS accrued,
			COALESCE(used, 0) AS used,
			COALESCE(adjusted, 0) AS adjusted,
			COALESCE(closing, 0) AS closing
		FROM Tbl_Leave_balance
		WHERE employee_id = $1 AND year = $2
	`
	err := r.DB.Select(&balanceRecords, query, employeeID, year)

	return balanceRecords, err
}

func (r *Repository) GetTotalPaidLeaveBalance(tx *sqlx.Tx, employeeID uuid.UUID) (float64, error) {
	var totalBalance float64
	err := tx.Get(&totalBalance, `
		SELECT COALESCE(SUM(lb.closing), 0)
		FROM Tbl_Leave_balance lb
		JOIN Tbl_Leave_Type lt ON lb.leave_type_id = lt.id
		WHERE lb.employee_id = $1
		  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
		  AND lt.is_paid = TRUE
		  AND lt.is_active = TRUE
		  AND (lt.is_early IS NULL OR lt.is_early = FALSE)
		  AND lt.is_work_from_home = FALSE
	`, employeeID)
	return totalBalance, err
}

func (r *Repository) GetTotalPendingPaidLeaveDays(tx *sqlx.Tx, employeeID uuid.UUID) (float64, error) {
	var totalPendingDays float64
	err := tx.Get(&totalPendingDays, `
		SELECT COALESCE(SUM(l.days), 0)
		FROM Tbl_Leave l
		JOIN Tbl_Leave_Type lt ON l.leave_type_id = lt.id
		WHERE l.employee_id = $1
		  AND l.status IN ('Pending', 'MANAGER_APPROVED')
		  AND EXTRACT(YEAR FROM l.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
		  AND lt.is_paid = TRUE
		  AND lt.is_active = TRUE
		  AND (lt.is_early IS NULL OR lt.is_early = FALSE)
		  AND lt.is_work_from_home = FALSE
	`, employeeID)
	return totalPendingDays, err
}

// CreateLeaveBalanceForAdjustment creates a new leave balance record
func (r *Repository) CreateLeaveBalanceForAdjustment(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeID int, year int, defaultEntitlement float64) (models.LeaveBalanceForAdjustment, error) {
	var balance models.LeaveBalanceForAdjustment
	err := tx.QueryRow(`
		INSERT INTO Tbl_Leave_balance
		(employee_id, leave_type_id, year, opening, accrued, used, adjusted, closing, created_at, updated_at)
		VALUES ($1,$2,$3,$4,0,0,0,$4,NOW(),NOW())
		RETURNING id, opening, accrued, used, adjusted, closing, employee_id, leave_type_id, year
	`, employeeID, leaveTypeID, year, defaultEntitlement).
		Scan(&balance.ID, &balance.Opening, &balance.Accrued, &balance.Used, &balance.Adjusted, &balance.Closing, &balance.EmployeeID, &balance.LeaveTypeID, &balance.Year)
	return balance, err
}

// UpdateLeaveBalanceAdjustment updates adjusted and closing values for leave balance

func (r *Repository) UpdateLeaveBalanceByEmployeeId(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeId int, Days float64) error {
	query := `UPDATE Tbl_Leave_balance SET used = used + $3, closing = closing - $3, updated_at = NOW() WHERE employee_id=$1 AND leave_type_id=$2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`
	_, err := tx.Exec(query, employeeID, leaveTypeId, Days)
	return err
}
func (r *Repository) UpdateWidthrowLeaveBalanceByEmployeeId(tx *sqlx.Tx, employeeID uuid.UUID, leaveTypeId int, Days float64) error {
	query := `UPDATE Tbl_Leave_balance SET used = used - $3, closing = closing + $3, updated_at = NOW() WHERE employee_id=$1 AND leave_type_id=$2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`
	_, err := tx.Exec(query, employeeID, leaveTypeId, Days)
	return err
}

func (r *Repository) RemoveEquipment(tx *sqlx.Tx, req models.RemoveAssignmentRequest) error {
	var (
		assignmentID uuid.UUID
		quantity     int
	)
	err := tx.QueryRow(`
		SELECT id, quantity
		FROM tbl_equipment_assignment
		WHERE equipment_id = $1
		  AND employee_id = $2
		ORDER BY assigned_at DESC
		LIMIT 1
	`, req.EquipmentID, req.EmployeeID).Scan(&assignmentID, &quantity)
	if err != nil {
		// No assignment found — nothing to remove.
		return nil
	}

	if _, err := tx.Exec(`DELETE FROM tbl_equipment_assignment WHERE id = $1`, assignmentID); err != nil {
		return fmt.Errorf("failed to remove assignment: %w", err)
	}

	if _, err := tx.Exec(`
		UPDATE tbl_equipment
		SET remaining_quantity = remaining_quantity + $1
		WHERE id = $2
	`, quantity, req.EquipmentID); err != nil {
		return fmt.Errorf("failed to restore equipment quantity: %w", err)
	}

	return nil
}
