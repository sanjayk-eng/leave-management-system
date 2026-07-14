package service

import (
	"context"
	"net/http"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	accessrole "github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/Zenithive/LeaveManagementSystem/pkg/notification"
	notifmodels "github.com/Zenithive/LeaveManagementSystem/pkg/notification/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/security"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type EmployeeService interface {
	Create(ctx context.Context, actorRoleID int, input *models.EmployeeInput) error
	Update(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, employeeID string, req *models.UpdateEmployeeInput) error
}

type employeeService struct {
	DB              *sqlx.DB
	HrbcService     Hrbc
	Repo            repositories.EmployeeRepository
	NotificationSvc notification.Service
	RoleRepo        repositories.RoleRepository
	CommonRepo      repositories.Repository
}

func NewEmployeeService(
	db *sqlx.DB,
	hrbcService Hrbc,
	employeeRepo repositories.EmployeeRepository,
	notifSvc notification.Service,
	roleRepo repositories.RoleRepository,
	commonRepo repositories.Repository,
) EmployeeService {
	return &employeeService{
		DB:              db,
		HrbcService:     hrbcService,
		Repo:            employeeRepo,
		NotificationSvc: notifSvc,
		RoleRepo:        roleRepo,
		CommonRepo:      commonRepo, // BUG FIX: was never assigned, nil-panics on allocateLeaveBalance
	}
}

// ============================================================
// Create
// ============================================================

func (s *employeeService) Create(ctx context.Context, actorRoleID int, input *models.EmployeeInput) error {
	if err := s.validateEmailUnique(input.Email, nil); err != nil {
		return err
	}

	if err := s.validateBirthDate(input.BirthDate); err != nil {
		return err
	}

	if err := s.HrbcService.HasPriorityAllowByType(actorRoleID, input.Role); err != nil {
		return err
	}

	roleID, err := s.RoleRepo.GetRoleID(input.Role)
	if err != nil {
		return errors.CustomErr(http.StatusBadRequest, "role not found")
	}

	plainPassword, hashedPassword, err := s.generateCredentials()
	if err != nil {
		return err
	}

	if input.Salary == nil {
		input.Salary = new(float64) // defaults to 0.0
	}

	employee := &models.Employee{
		FullName:    input.FullName,
		Email:       input.Email,
		RoleID:      roleID,
		Password:    hashedPassword,
		Salary:      input.Salary,
		BirthDate:   input.BirthDate,
		JoiningDate: input.JoiningDate,
	}

	if err := database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		employeeID, err := s.Repo.Create(tx, employee)
		if err != nil {
			return err
		}
		return s.allocateLeaveBalance(tx, employeeID, input)
	}); err != nil {
		return err
	}

	s.NotificationSvc.Publish(notification.Event{
		Type: notification.EmployeeCreated,
		Data: &notifmodels.EmployeeNotificationData{
			EmployeeName:      input.FullName,
			EmployeeEmail:     input.Email,
			GeneratedPassword: plainPassword,
		},
	})

	return nil
}

func (s *employeeService) generateCredentials() (plain string, hashed string, err error) {
	plain, err = security.GenerateSecurePassword()
	if err != nil {
		return "", "", errors.CustomErr(http.StatusInternalServerError, "failed to generate password")
	}

	hashed, err = security.HashPassword(plain)
	if err != nil {
		return "", "", errors.CustomErr(http.StatusInternalServerError, "failed to hash password")
	}

	return plain, hashed, nil
}

func (s *employeeService) allocateLeaveBalance(tx *sqlx.Tx, employeeID uuid.UUID, input *models.EmployeeInput) error {
	leaveTypes, err := s.CommonRepo.GetAllLeaveType()
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to get leave types")
	}

	isJoiningThisYear := input.JoiningDate != nil && input.JoiningDate.Year() == time.Now().Year()

	for _, leaveType := range leaveTypes {
		if leaveType.IsEarly != nil && *leaveType.IsEarly {
			continue
		}

		entitlement := leaveType.DefaultEntitlement
		if input.Role == accessrole.ROLE_INTERN && leaveType.InternEntitlement != nil {
			entitlement = *leaveType.InternEntitlement
		}
		if isJoiningThisYear {
			entitlement = CalculateProratedLeave(entitlement, int(input.JoiningDate.Month()))
		}

		if err := s.CommonRepo.CreateLeaveBalance(tx, employeeID, leaveType.ID, entitlement); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to allocate leave balance")
		}
	}

	return nil
}

// ============================================================
// Update
// ============================================================

func (s *employeeService) Update(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, employeeID string, req *models.UpdateEmployeeInput) error {
	id, err := uuid.Parse(employeeID)
	if err != nil {
		return errors.CustomErr(http.StatusBadRequest, "invalid employee id")
	}

	employee, err := s.Repo.GetByID(id)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	if err := s.authorizeUpdate(actorUserID, actorRoleID, employee); err != nil {
		return err
	}

	if err := s.validateBirthDate(req.BirthDate); err != nil {
		return err
	}

	if err := s.validateEmailUnique(derefStr(req.Email), &employee.Email); err != nil {
		return err
	}

	s.mergeEmployee(employee, req)

	return database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		if err := s.Repo.Update(tx, employee); err != nil {
			return err
		}

		if req.JoiningDate != nil {
			return s.recalculateLeaveBalance(tx, employee.ID, employee.RoleID, employee.JoiningDate)
		}

		return nil
	})
}

func (s *employeeService) authorizeUpdate(actorUserID uuid.UUID, actorRoleID int, employee *models.Employee) error {
	if actorUserID == employee.ID {
		return nil // self-update always allowed
	}
	return s.HrbcService.HasPriorityAllow(actorRoleID, employee.RoleID)
}

const minEmployeeAgeYears = 16

func (s *employeeService) validateBirthDate(birthDate *time.Time) error {
	if birthDate == nil {
		return nil
	}

	today := time.Now().Truncate(24 * time.Hour)
	bd := birthDate.Truncate(24 * time.Hour)

	if !bd.Before(today) {
		return errors.CustomErr(http.StatusBadRequest, "birth date must be in past")
	}

	latestAllowed := today.AddDate(-minEmployeeAgeYears, 0, 0)
	if bd.After(latestAllowed) {
		return errors.CustomErr(http.StatusBadRequest, "employee must be at least 16 years old")
	}

	return nil
}

// validateEmailUnique checks newEmail isn't taken, skipping the check when
// it's empty or unchanged from currentEmail. Used by both Create (currentEmail=nil)
// and Update (currentEmail=&employee.Email).
func (s *employeeService) validateEmailUnique(newEmail string, currentEmail *string) error {
	if newEmail == "" {
		return nil
	}
	if currentEmail != nil && newEmail == *currentEmail {
		return nil
	}

	exists, err := s.Repo.CheckEmailExists(newEmail)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to check email")
	}
	if exists {
		return errors.CustomErr(http.StatusBadRequest, "email already exists")
	}
	return nil
}

func (s *employeeService) mergeEmployee(employee *models.Employee, req *models.UpdateEmployeeInput) {
	if req.FullName != nil {
		employee.FullName = *req.FullName
	}
	if req.Email != nil {
		employee.Email = *req.Email
	}
	if req.Salary != nil {
		employee.Salary = req.Salary
	}
	if req.JoiningDate != nil {
		employee.JoiningDate = req.JoiningDate
	}
	if req.BirthDate != nil {
		employee.BirthDate = req.BirthDate
	}
	if req.EndingDate != nil {
		employee.EndingDate = req.EndingDate
	}
}

func (s *employeeService) recalculateLeaveBalance(tx *sqlx.Tx, employeeID uuid.UUID, roleID int, joiningDate *time.Time) error {
	if joiningDate == nil {
		return nil
	}

	roleType, err := s.RoleRepo.GetRoleType(roleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch role")
	}

	return s.CommonRepo.RecalculateLeaveBalancesForJoiningDateChange(tx, employeeID, joiningDate, roleType, time.Now().Year())
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}