package repositories

import (
	"database/sql"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type EmployeeRepository interface {
	CheckEmailExists(email string) (bool, error)
	Create(tx *sqlx.Tx, employee *models.Employee) (uuid.UUID, error)
	Update(tx *sqlx.Tx, employee *models.Employee) error
	GetByID(id uuid.UUID) (*models.Employee, error)
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
