package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type EmployeeRepository interface {
	CheckEmailExists(email string) (bool, error)
	Create(tx *sqlx.Tx, employee *models.Employee) (uuid.UUID, error)
	Update(tx *sqlx.Tx, employee *models.Employee) error
	GetByID(id uuid.UUID) (*models.Employee, error)
	UpdatePassword(ctx context.Context, id uuid.UUID, hashedPassword string) error
	GetCurrentRoleAndManagerStatus(ctx context.Context, empID uuid.UUID) (int, bool, error)
	UpdateRole(tx *sqlx.Tx, empID uuid.UUID, newRoleID int) (string, error)
	GetAllEmployees(ctx context.Context, params models.EmployeeFilterParams, access models.EmployeeAccessFilter) (*models.PaginatedEmployeeResponse, error)
	GetOrgHierarchyMap(ctx context.Context) (map[uuid.UUID][]uuid.UUID, error)
	GetEmployeeByID(empID uuid.UUID) (*models.EmployeeResponse, error)
}

type employeeRepository struct {
	db *sqlx.DB
}

func NewEmployeeRepository(db *sqlx.DB) EmployeeRepository {
	return &employeeRepository{
		db: db,
	}
}

func (r *employeeRepository) CheckEmailExists(email string) (bool, error) {
	var exists bool

	err := r.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM Tbl_Employee
			WHERE email = $1
		)
	`, email).Scan(&exists)

	if err != nil {
		return false, err
	}

	return exists, nil
}
func (r *employeeRepository) Create(tx *sqlx.Tx, employee *models.Employee) (uuid.UUID, error) {

	var id uuid.UUID

	err := tx.QueryRow(`
INSERT INTO Tbl_Employee (
	full_name,
	email,
	role_id,
	password,
	salary,
	birth_date,
	joining_date
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id
`,
		employee.FullName,
		employee.Email,
		employee.RoleID,
		employee.Password,
		employee.Salary,
		employee.BirthDate,
		employee.JoiningDate,
	).Scan(&id)

	return id, err
}

func (r *employeeRepository) Update(tx *sqlx.Tx, employee *models.Employee) error {

	_, err := tx.Exec(`
		UPDATE Tbl_Employee
		SET
			full_name = $2,
			email = $3,
			salary = $4,
			joining_date = $5,
			birth_date = $6,
			ending_date = $7,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`,
		employee.ID,
		employee.FullName,
		employee.Email,
		employee.Salary,
		employee.JoiningDate,
		employee.BirthDate,
		employee.EndingDate,
	)

	return err
}

func (r *employeeRepository) GetByID(id uuid.UUID) (*models.Employee, error) {
	var employee models.Employee

	err := r.db.Get(&employee, `
		SELECT
			id,
			full_name,
			email,
			role_id,
			password,
			manager_id,
			designation_id,
			salary,
			birth_date,
			joining_date,
			ending_date,
			status,
			deleted_at,
			created_at,
			updated_at
		FROM Tbl_Employee
		WHERE id = $1
		  AND deleted_at IS NULL
	`, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.CustomErr(http.StatusNotFound, "employee not found")
		}
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to get employee")
	}

	return &employee, nil
}

func (r *employeeRepository) UpdatePassword(ctx context.Context, id uuid.UUID, hashedPassword string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE Tbl_Employee SET password = $1, updated_at = NOW() WHERE id = $2`,
		hashedPassword, id,
	)
	if err != nil {
		return fmt.Errorf("UpdatePassword id=%s: %w", id, err)
	}

	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("UpdatePassword id=%s: employee not found", id)
	}

	return nil
}

func (r *employeeRepository) GetCurrentRoleAndManagerStatus(ctx context.Context, empID uuid.UUID) (int, bool, error) {
	var row struct {
		RoleID    int  `db:"role_id"`
		IsManager bool `db:"is_manager"`
	}

	query := `
SELECT
    e.role_id AS role_id,
    EXISTS (
        SELECT 1 FROM Tbl_Employee sub WHERE sub.manager_id = e.id
    ) AS is_manager
FROM Tbl_Employee e
WHERE e.id = $1
`
	if err := r.db.GetContext(ctx, &row, query, empID); err != nil {
		return 0, false, fmt.Errorf("GetCurrentRoleAndManagerStatus id=%s: %w", empID, err)
	}

	return row.RoleID, row.IsManager, nil
}

func (r *employeeRepository) UpdateRole(tx *sqlx.Tx, empID uuid.UUID, newRoleID int) (string, error) {
	res, err := tx.Exec(
		`UPDATE Tbl_Employee SET role_id = $1, updated_at = NOW() WHERE id = $2`,
		newRoleID, empID,
	)
	if err != nil {
		return "", fmt.Errorf("UpdateRole id=%s: %w", empID, err)
	}

	n, _ := res.RowsAffected()
	if n == 0 {
		return "", fmt.Errorf("UpdateRole id=%s: employee not found", empID)
	}

	return empID.String(), nil
}

// GetOrgHierarchyMap fetches every (id, manager_id) pair once and returns
// manager_id -> []direct_report_id, so the service can walk N-level team
// trees in Go instead of a recursive SQL CTE.
func (r *employeeRepository) GetOrgHierarchyMap(ctx context.Context) (map[uuid.UUID][]uuid.UUID, error) {
	var rows []struct {
		ID        uuid.UUID     `db:"id"`
		ManagerID uuid.NullUUID `db:"manager_id"`
	}

	err := r.db.SelectContext(ctx, &rows, `
		SELECT id, manager_id
		FROM Tbl_Employee
		WHERE deleted_at IS NULL
	`)
	if err != nil {
		return nil, fmt.Errorf("GetOrgHierarchyMap: %w", err)
	}

	hierarchy := make(map[uuid.UUID][]uuid.UUID, len(rows))
	for _, row := range rows {
		if !row.ManagerID.Valid {
			continue
		}
		hierarchy[row.ManagerID.UUID] = append(hierarchy[row.ManagerID.UUID], row.ID)
	}

	return hierarchy, nil
}

// GetAllEmployees returns a paginated, filtered, sorted list of employees.
// Visibility (own/team/all) and salary inclusion are both decided upstream
// by the service via permissions — this function only applies whatever
// access.Scope/IncludeSalary it's handed. No role names, no role logic here.
func (r *employeeRepository) GetAllEmployees(ctx context.Context, params models.EmployeeFilterParams, access models.EmployeeAccessFilter) (*models.PaginatedEmployeeResponse, error) {
	salaryCol := "NULL::double precision AS salary"
	if access.IncludeSalary {
		salaryCol = "e.salary"
	}

	conditions := []string{}
	args := []interface{}{}
	n := 1

	switch access.Scope {
	case "own":
		conditions = append(conditions, fmt.Sprintf("e.id = $%d", n))
		args = append(args, access.ActorID)
		n++
	case "team":
		if len(access.VisibleEmployeeIDs) == 0 {
			conditions = append(conditions, "1 = 0") // no visible reports -> sees nobody
			break
		}
		conditions = append(conditions, fmt.Sprintf("e.id = ANY($%d)", n))
		args = append(args, pq.Array(access.VisibleEmployeeIDs))
		n++
	case "all":
		// no restriction
	default:
		conditions = append(conditions, "1 = 0") // unknown/missing scope -> fail closed
	}

	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(e.full_name ILIKE $%d OR e.email ILIKE $%d OR m.full_name ILIKE $%d)", n, n, n))
		args = append(args, "%"+params.Search+"%")
		n++
	}
	if params.Status != "" {
		conditions = append(conditions, fmt.Sprintf("e.status = $%d", n))
		args = append(args, params.Status)
		n++
	}
	if len(params.Roles) > 0 {
		placeholders := make([]string, len(params.Roles))
		for i, role := range params.Roles {
			placeholders[i] = fmt.Sprintf("$%d", n)
			args = append(args, role)
			n++
		}
		conditions = append(conditions, fmt.Sprintf("r.type IN (%s)", strings.Join(placeholders, ",")))
	}
	if params.Designation != "" {
		conditions = append(conditions, fmt.Sprintf("d.designation_name = $%d", n))
		args = append(args, params.Designation)
		n++
	}
	if params.Manager != "" {
		conditions = append(conditions, fmt.Sprintf("m.full_name = $%d", n))
		args = append(args, params.Manager)
		n++
	}

	whereClause := buildWhere(conditions)

	baseJoins := `
		FROM Tbl_Employee e
		JOIN Tbl_Role r ON e.role_id = r.id
		LEFT JOIN Tbl_Employee m ON e.manager_id = m.id
		LEFT JOIN Tbl_Designation d ON e.designation_id = d.id
	`

	var totalCount int
	if err := r.db.GetContext(ctx, &totalCount, "SELECT COUNT(*) "+baseJoins+whereClause, args...); err != nil {
		return nil, fmt.Errorf("GetAllEmployees count: %w", err)
	}

	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 10
	}
	if params.PageSize > 100 {
		params.PageSize = 100
	}
	offset := (params.Page - 1) * params.PageSize
	orderBy := resolveEmployeeSort(params.SortBy, params.SortOrder)

	query := fmt.Sprintf(`
		SELECT
			e.id, e.full_name, e.email, e.status,
			r.type AS role, e.manager_id, e.designation_id,
			%s, e.joining_date, e.birth_date, e.ending_date,
			e.created_at, e.updated_at,
			m.full_name AS manager_name, d.designation_name
		%s%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, salaryCol, baseJoins, whereClause, orderBy, n, n+1)

	args = append(args, params.PageSize, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("GetAllEmployees select: %w", err)
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
			return nil, fmt.Errorf("GetAllEmployees scan: %w", err)
		}
		employees = append(employees, emp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("GetAllEmployees rows: %w", err)
	}

	totalPages := (totalCount + params.PageSize - 1) / params.PageSize

	return &models.PaginatedEmployeeResponse{
		Employees: employees, TotalCount: totalCount,
		Page: params.Page, PageSize: params.PageSize, TotalPages: totalPages,
	}, nil
}

func (r *employeeRepository) GetEmployeeByID(empID uuid.UUID) (*models.EmployeeResponse, error) {
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
	err := r.db.QueryRow(query, empID).Scan(
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

	return &emp, err
}
