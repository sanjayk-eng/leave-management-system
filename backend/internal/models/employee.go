package models

import (
	"time"

	"github.com/google/uuid"
)

type Employee struct {
	ID       uuid.UUID `db:"id"`
	FullName string    `db:"full_name"`
	Email    string    `db:"email"`
	RoleID   int       `db:"role_id"`
	Password string    `db:"password"`

	ManagerID     *uuid.UUID `db:"manager_id"`
	DesignationID *uuid.UUID `db:"designation_id"`

	Salary      *float64   `db:"salary"`
	BirthDate   *time.Time `db:"birth_date"`
	JoiningDate *time.Time `db:"joining_date"`
	EndingDate  *time.Time `db:"ending_date"`

	Status    string     `db:"status"`
	DeletedAt *time.Time `db:"deleted_at"`

	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

type UpdateEmployeeInput struct {
	FullName    *string    `json:"full_name" binding:"omitempty,min=2,max=100"`
	Email       *string    `json:"email" binding:"omitempty,email"`
	Salary      *float64   `json:"salary" binding:"omitempty,gte=0"`
	BirthDate   *time.Time `json:"birth_date,omitempty"`
	JoiningDate *time.Time `json:"joining_date,omitempty"`
	EndingDate  *time.Time `json:"ending_date,omitempty"`
}

// EmployeeInput is used for create employee (API input + validation).
type EmployeeInput struct {
	ID              *uuid.UUID `json:"id,omitempty"` // optional UUID
	FullName        string     `json:"full_name" validate:"required"`
	Email           string     `json:"email" validate:"required,email"`
	Role            string     `json:"role" validate:"required"`
	Password        string     `json:"password,omitempty"`       // optional - auto-generated if not provided
	ManagerID       *uuid.UUID `json:"manager_id,omitempty"`     // optional UUID
	DesignationID   *uuid.UUID `json:"designation_id,omitempty"` // optional UUID
	Salary          *float64   `json:"salary,omitempty"`         // optional
	JoiningDate     *time.Time `json:"joining_date,omitempty"`   // optional
	BirthDate       *time.Time `json:"birth_date,omitempty"`     // optional
	EndingDate      *time.Time `json:"ending_date,omitempty"`    // optional
	Status          *string    `json:"status,omitempty"`         // optional, new field
	CreatedAt       *time.Time `json:"created_at,omitempty"`     // optional
	UpdatedAt       *time.Time `json:"updated_at,omitempty"`     // optional
	DeletedAt       *time.Time `json:"deleted_at,omitempty"`
	ManagerName     *string    `json:"manager_name,omitempty"`     // optional
	DesignationName *string    `json:"designation_name,omitempty"` // optional
}

type RoleUpdateResult struct {
	EmployeeID string `json:"employee_id"`
	OldRole    string `json:"old_role"`
	NewRole    string `json:"new_role"`
}
type UpdateRoleInput struct {
	Role string `json:"role" binding:"required"`
}

type EmployeeAccessFilter struct {
	ActorID            uuid.UUID
	Scope              string      // "own" | "team" | "all"
	VisibleEmployeeIDs []uuid.UUID // populated only when Scope == "team"
	IncludeSalary      bool
}

// EmployeeFilterParams - Query parameters for filtering, sorting, and pagination
type EmployeeFilterParams struct {
	// Pagination
	Page     int `form:"page"`
	PageSize int `form:"page_size"`

	// Filters
	Search      string   `form:"search"`      // searches name, email, manager name
	Roles       []string `form:"role"`        // one or more: EMPLOYEE, MANAGER, HR, ADMIN, SUPERADMIN
	Designation string   `form:"designation"` // exact match on designation_name
	Status      string   `form:"status"`      // active / deactive
	Manager     string   `form:"manager"`     // exact match on manager full_name

	// Sorting
	SortBy    string `form:"sort_by"`    // name|email|joining_date|ending_date|salary|birth_date|manager_name|role|status
	SortOrder string `form:"sort_order"` // asc / desc
}

// TeamFilterParams - Query parameters for manager's team list
type TeamFilterParams struct {
	SortBy    string `form:"sort_by"`    // name|birth_date|joining_date|ending_date|email
	SortOrder string `form:"sort_order"` // asc / desc
}

// PaginatedEmployeeResponse - Response with pagination metadata
type PaginatedEmployeeResponse struct {
	Employees  []EmployeeResponse `json:"employees"`
	TotalCount int                `json:"total_count"`
	Page       int                `json:"page"`
	PageSize   int                `json:"page_size"`
	TotalPages int                `json:"total_pages"`
}

// EmployeeResponse is used for GET list and GET by ID (no password, safe for API response).
// Use this for GetAllEmployees, GetEmployeeByID, GetEmployeesByManagerID.
type EmployeeResponse struct {
	ID              uuid.UUID  `json:"id"`
	FullName        string     `json:"full_name"`
	Email           string     `json:"email"`
	Status          string     `json:"status"`
	Role            string     `json:"role"`
	ManagerID       *uuid.UUID `json:"manager_id,omitempty"`
	ManagerName     *string    `json:"manager_name,omitempty"`
	DesignationID   *uuid.UUID `json:"designation_id,omitempty"`
	DesignationName *string    `json:"designation_name,omitempty"`
	Salary          *float64   `json:"salary,omitempty"` // omitted for HR in list; present for admin/detail
	JoiningDate     *time.Time `json:"joining_date,omitempty"`
	BirthDate       *time.Time `json:"birth_date"`
	EndingDate      *time.Time `json:"ending_date,omitempty"`
	CreatedAt       *time.Time `json:"created_at,omitempty"`
	UpdatedAt       *time.Time `json:"updated_at,omitempty"`
}

type BirthdayEntry struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
}

// BirthdayEmployee holds minimal employee data for birthday processing.
type BirthdayEmployee struct {
	ID               string     `json:"id"`
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	BirthDate        *time.Time `json:"birth_date,omitempty"`
	Age              int        `json:"age"`
	Status           string     `json:"status"`
	RemainingDays    int        `json:"remaining_days"`
	RemainingHours   int        `json:"remaining_hours,omitempty"`
	RemainingMinutes int        `json:"remaining_minutes,omitempty"`
}

type UpdateManagerInput struct {
	ManagerID string `json:"manager_id" binding:"required"`
}

type ManagerUpdateResult struct {
	EmployeeID string `json:"employee_id"`
	ManagerID  string `json:"manager_id"`
}

type StatusUpdateResult struct {
	EmployeeID string `json:"employee_id"`
	NewStatus  string `json:"new_status"`
}
type UpdateDesignationInput struct {
	DesignationID *string `json:"designation_id"`
}

type DesignationUpdateResult struct {
	EmployeeID    string     `json:"employee_id"`
	DesignationID *uuid.UUID `json:"designation_id"`
	Removed       bool       `json:"-"`
}
