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
	"github.com/Zenithive/LeaveManagementSystem/pkg/constant/rbsc"
	"github.com/Zenithive/LeaveManagementSystem/pkg/notification"
	notifmodels "github.com/Zenithive/LeaveManagementSystem/pkg/notification/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/security"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type EmployeeService interface {
	Create(ctx context.Context, actorRoleID int, input *models.EmployeeInput) error
	Update(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, employeeID string, req *models.UpdateEmployeeInput) error
	UpdatePassword(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, actorRoleName string, employeeID string, newPassword string) error
	UpdateRole(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, employeeID string, newRoleName string) (*models.RoleUpdateResult, error)
	GetEmployees(ctx context.Context, actorID uuid.UUID, actorRoleID int, params models.EmployeeFilterParams) (*models.PaginatedEmployeeResponse, error)
	GetEmployeeByID(empID uuid.UUID) (*models.EmployeeResponse, error)
	UpdateManager(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, employeeID string, managerIDStr string) (*models.ManagerUpdateResult, error)
	DeleteStatus(ctx context.Context, actorRoleID int, employeeID string) (*models.StatusUpdateResult, error)
}

const minPasswordLength = 8

type employeeService struct {
	DB              *sqlx.DB
	HrbcService     Hrbc
	Repo            repositories.EmployeeRepository
	NotificationSvc notification.Service
	RoleRepo        repositories.RoleRepository
	CommonRepo      repositories.Repository
	PermissionSvc   PermissionService
}

func NewEmployeeService(
	db *sqlx.DB,
	hrbcService Hrbc,
	employeeRepo repositories.EmployeeRepository,
	notifSvc notification.Service,
	roleRepo repositories.RoleRepository,
	commonRepo repositories.Repository,
	permissionSvc PermissionService,
) EmployeeService {
	return &employeeService{
		DB:              db,
		HrbcService:     hrbcService,
		Repo:            employeeRepo,
		NotificationSvc: notifSvc,
		RoleRepo:        roleRepo,
		CommonRepo:      commonRepo,
		PermissionSvc:   permissionSvc,
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

// ============================================================
// UpdatePassword
// ============================================================

func (s *employeeService) UpdatePassword(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, actorRoleName string, employeeID string, newPassword string) error {
	if err := validatePasswordStrength(newPassword); err != nil {
		return err
	}

	id, err := uuid.Parse(employeeID)
	if err != nil {
		return errors.CustomErr(http.StatusBadRequest, "invalid employee id")
	}

	employee, err := s.Repo.GetByID(id)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	if err := s.HrbcService.HasPriorityAllow(actorRoleID, employee.RoleID); err != nil {
		return err
	}

	hashedPassword, err := security.HashPassword(newPassword)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to hash password")
	}

	if err := s.Repo.UpdatePassword(ctx, id, hashedPassword); err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to update password")
	}

	s.publishPasswordChanged(actorUserID, actorRoleName, employee, newPassword)

	return nil
}

func validatePasswordStrength(password string) error {
	if len(password) < minPasswordLength {
		return errors.CustomErr(http.StatusBadRequest, "password must be at least 8 characters long")
	}
	return nil
}

// publishPasswordChanged fires the notification best-effort. The actor's
// email is looked up via the same Repo.GetByID used everywhere else in this
// service, instead of a one-off raw SQL query — and since `employee` was
// already fetched above, there's no second lookup for the target's own
// name/email like the old GetEmployeeDetailsForNotification call needed.
func (s *employeeService) publishPasswordChanged(actorUserID uuid.UUID, actorRoleName string, employee *models.Employee, newPassword string) {
	actorEmail := ""
	if actorUserID != uuid.Nil {
		if actor, err := s.Repo.GetByID(actorUserID); err == nil {
			actorEmail = actor.Email
		}
	}

	s.NotificationSvc.Publish(notification.Event{
		Type: notification.PasswordChanged,
		Data: &notifmodels.EmployeeNotificationData{
			EmployeeID:    employee.ID.String(),
			EmployeeName:  employee.FullName,
			EmployeeEmail: employee.Email,
			NewPassword:   newPassword,
			ActorEmail:    actorEmail,
			ActorRole:     actorRoleName,
		},
	})
}

// ============================================================
// UpdateRole
// ============================================================

func (s *employeeService) UpdateRole(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, employeeID string, newRoleName string) (*models.RoleUpdateResult, error) {
	empID, err := uuid.Parse(employeeID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, "invalid employee id")
	}

	newRoleID, err := s.RoleRepo.GetRoleID(newRoleName)
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, "invalid role")
	}

	currentRoleID, isManager, err := s.Repo.GetCurrentRoleAndManagerStatus(ctx, empID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch employee role: "+err.Error())
	}

	if err := s.authorizeRoleChange(actorUserID, actorRoleID, empID, currentRoleID, newRoleID); err != nil {
		return nil, err
	}

	if currentRoleID == newRoleID {
		return nil, errors.CustomErr(http.StatusBadRequest, "employee already has this role")
	}

	// Structural rule, not hierarchy: an employee with direct reports can't
	// lose their manager designation via a role change.
	if isManager && newRoleName != accessrole.ROLE_MANAGER {
		return nil, errors.CustomErr(http.StatusForbidden, "cannot change role of employee who is a manager with subordinates")
	}

	currentRoleName, err := s.RoleRepo.GetRoleType(currentRoleID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to resolve current role")
	}

	var updatedID string
	if err := database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		id, err := s.Repo.UpdateRole(tx, empID, newRoleID)
		if err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to update role: "+err.Error())
		}
		updatedID = id

		if err := s.CommonRepo.AdjustLeaveBalancesForRoleChange(tx, empID, currentRoleName, newRoleName, time.Now().Year()); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to adjust leave balances for role change: "+err.Error())
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return &models.RoleUpdateResult{
		EmployeeID: updatedID,
		OldRole:    currentRoleName,
		NewRole:    newRoleName,
	}, nil
}

func (s *employeeService) authorizeRoleChange(actorUserID uuid.UUID, actorRoleID int, targetEmployeeID uuid.UUID, currentRoleID, newRoleID int) error {
	if actorUserID == targetEmployeeID {
		isTop, err := s.HrbcService.IsHighestPriority(actorRoleID)
		if err != nil {
			return err
		}
		if !isTop {
			return errors.CustomErr(http.StatusForbidden, "you cannot change your own role")
		}
		return nil
	}

	if err := s.HrbcService.HasPriorityAllow(actorRoleID, currentRoleID); err != nil {
		return err
	}

	return s.HrbcService.HasPriorityAllow(actorRoleID, newRoleID)
}

func (s *employeeService) GetEmployees(ctx context.Context, actorID uuid.UUID, actorRoleID int, params models.EmployeeFilterParams) (*models.PaginatedEmployeeResponse, error) {
	access, err := s.buildEmployeeAccessFilter(ctx, actorID, actorRoleID)
	if err != nil {
		return nil, err
	}
	return s.Repo.GetAllEmployees(ctx, params, access)
}

func (s *employeeService) buildEmployeeAccessFilter(ctx context.Context, actorID uuid.UUID, actorRoleID int) (models.EmployeeAccessFilter, error) {
	readPerm, err := s.PermissionSvc.Check(ctx, actorRoleID, string(rbsc.ResourceEmployee), string(rbsc.ActionRead))
	if err != nil {
		return models.EmployeeAccessFilter{}, errors.CustomErr(http.StatusInternalServerError, "failed to resolve employee read permission")
	}
	if !readPerm.Allowed {
		return models.EmployeeAccessFilter{}, errors.CustomErr(http.StatusForbidden, "you do not have permission to view employees")
	}

	salaryPerm, err := s.PermissionSvc.Check(ctx, actorRoleID, "employee", "read_salary")
	if err != nil {
		return models.EmployeeAccessFilter{}, errors.CustomErr(http.StatusInternalServerError, "failed to resolve salary permission")
	}

	access := models.EmployeeAccessFilter{
		ActorID:       actorID,
		Scope:         readPerm.Scope,
		IncludeSalary: salaryPerm.Allowed,
	}

	if readPerm.Scope == "team" {
		ids, err := s.resolveTeamIDs(ctx, actorID)
		if err != nil {
			return models.EmployeeAccessFilter{}, err
		}
		access.VisibleEmployeeIDs = ids
	}

	return access, nil
}

func (s *employeeService) resolveTeamIDs(ctx context.Context, actorID uuid.UUID) ([]uuid.UUID, error) {
	hierarchy, err := s.Repo.GetOrgHierarchyMap(ctx)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to resolve team hierarchy")
	}

	visited := map[uuid.UUID]bool{actorID: true}
	queue := []uuid.UUID{actorID}

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		for _, reportID := range hierarchy[current] {
			if visited[reportID] {
				continue
			}
			visited[reportID] = true
			queue = append(queue, reportID)
		}
	}
	ids := make([]uuid.UUID, 0, len(visited))
	for id := range visited {
		ids = append(ids, id)
	}
	return ids, nil
}

func (s *employeeService) GetEmployeeByID(empID uuid.UUID) (*models.EmployeeResponse, error) {

	res, err := s.Repo.GetEmployeeByID(empID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, err.Error())
	}
	return res, nil
}

// ============================================================
// UpdateManager
// ============================================================

func (s *employeeService) UpdateManager(ctx context.Context, actorUserID uuid.UUID, actorRoleID int, employeeID string, managerIDStr string) (*models.ManagerUpdateResult, error) {
	empID, err := uuid.Parse(employeeID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, "invalid employee id")
	}

	managerID, err := uuid.Parse(managerIDStr)
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, "invalid manager id")
	}

	if empID == managerID {
		return nil, errors.CustomErr(http.StatusBadRequest, "cannot assign employee as their own manager")
	}

	targetEmp, err := s.Repo.GetByID(empID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	if err := s.HrbcService.HasPriorityAllow(actorRoleID, targetEmp.RoleID); err != nil {
		return nil, err
	}

	if actorUserID == managerID {
		isTop, err := s.HrbcService.IsHighestPriority(actorRoleID)
		if err != nil {
			return nil, err
		}
		if !isTop {
			return nil, errors.CustomErr(http.StatusForbidden, "you cannot assign yourself as a manager to others")
		}
	}

	if err := s.validateManagerCandidate(managerID); err != nil {
		return nil, err
	}

	if err := s.Repo.UpdateManager(ctx, empID, managerID); err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to update manager: "+err.Error())
	}

	return &models.ManagerUpdateResult{
		EmployeeID: empID.String(),
		ManagerID:  managerID.String(),
	}, nil
}

func (s *employeeService) validateManagerCandidate(managerID uuid.UUID) error {
	manager, err := s.Repo.GetByID(managerID)
	if err != nil {
		return errors.CustomErr(http.StatusNotFound, "manager not found")
	}

	if manager.Status != "active" {
		return errors.CustomErr(http.StatusForbidden, "manager is deactivated")
	}

	roleType, err := s.RoleRepo.GetRoleType(manager.RoleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to resolve manager role")
	}
	if roleType != accessrole.ROLE_MANAGER {
		return errors.CustomErr(http.StatusBadRequest, "assigned employee is not a manager")
	}

	return nil
}

func (s *employeeService) DeleteStatus(ctx context.Context, actorRoleID int, employeeID string) (*models.StatusUpdateResult, error) {
	empID, err := uuid.Parse(employeeID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, "invalid employee id")
	}

	targetEmp, err := s.Repo.GetByID(empID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusNotFound, "employee not found")
	}

	if err := s.HrbcService.HasPriorityAllow(actorRoleID, targetEmp.RoleID); err != nil {
		return nil, err
	}

	var newStatus string
	if err := database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		var txErr error
		newStatus, txErr = s.CommonRepo.DeleteEmployeeStatus(tx, empID)
		return txErr
	}); err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to update employee status: "+err.Error())
	}

	return &models.StatusUpdateResult{
		EmployeeID: empID.String(),
		NewStatus:  newStatus,
	}, nil
}


