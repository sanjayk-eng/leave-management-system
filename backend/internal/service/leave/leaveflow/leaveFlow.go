package leaveflow

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/internal/service"
	"github.com/Zenithive/LeaveManagementSystem/internal/service/leave/leaveprocess"
	"github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/Zenithive/LeaveManagementSystem/pkg/constant"
	"github.com/Zenithive/LeaveManagementSystem/pkg/notification"
	notifmodels "github.com/Zenithive/LeaveManagementSystem/pkg/notification/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type LeaveFlowService interface {
	Create(ctx context.Context, actorID uuid.UUID, actorRoleID int, leave *models.LeaveInput, actorRole string) error
	GetByID(ctx context.Context, leaveID string) (*models.Leave, error)
	ActionLeave(ctx context.Context, req models.ActionLeaveReq, leaveID string, empID uuid.UUID, role string) error
	GetLeaves(ctx context.Context, empID uuid.UUID, role string, month int, year int) (gin.H, error)
	GetMyLeave(empID uuid.UUID, month int, year int) (gin.H, error)
	CancleLeave(c context.Context, leaveId string, actorID uuid.UUID, actorRole string) (string, error)
	UpdateLeave(ctx context.Context, empID uuid.UUID, leaveId string, leave *models.LeaveInput, role string) error
}

type leaveFlow struct {
	DB                  *sqlx.DB
	LeaveValidationSvc  *LeaveValidationService
	Repo                repositories.LeaveFlowRepository
	CommRepo            *repositories.Repository
	LeavePolicyRepo     repositories.LeavePolicyRepository
	LeaveFlowLogRepo    repositories.LeaveFlowLog
	LeaveFlowLogService service.LeaveFlowLog
	LeavePolicyService  service.LeavePolicyService
	NotificationSvc     notification.Service      // nil-safe: notifications skipped if not wired
	AuditSvc            audit.Service             // nil-safe: audit skipped if not wired
	PermissionSvc       service.PermissionService // governs the leave/apply_on_behalf permission
	registry            *leaveprocess.ProcessorRegistry
	HrbcService         service.Hrbc
	EmployeeSvc         service.EmployeeService
}

func NewLeaveFlow(
	db *sqlx.DB,
	leaveFlowLogService service.LeaveFlowLog,
	leavePolicyService service.LeavePolicyService,
	leaveFlowRepo repositories.LeaveFlowRepository,
	leavePolicyRepo repositories.LeavePolicyRepository,
	leaveFlowLogRepo repositories.LeaveFlowLog,
	commRepo *repositories.Repository,
	notifSvc notification.Service,
	auditSvc audit.Service,
	permissionSvc service.PermissionService,
	hrbcService service.Hrbc,
	employeeSvc service.EmployeeService,
) LeaveFlowService {
	return &leaveFlow{
		DB:                  db,
		Repo:                leaveFlowRepo,
		CommRepo:            commRepo,
		LeaveValidationSvc:  NewLeaveValidationService(commRepo),
		LeavePolicyRepo:     leavePolicyRepo,
		LeaveFlowLogRepo:    leaveFlowLogRepo,
		LeaveFlowLogService: leaveFlowLogService,
		LeavePolicyService:  leavePolicyService,
		NotificationSvc:     notifSvc,
		AuditSvc:            auditSvc,
		PermissionSvc:       permissionSvc,
		registry:            leaveprocess.NewProcessorRegistry(),
		HrbcService:         hrbcService,
		EmployeeSvc:         employeeSvc,
	}
}

// ============================================================
// Create — now with apply-on-behalf support
// ============================================================

func (s *leaveFlow) Create(ctx context.Context, actorID uuid.UUID, actorRoleID int, leave *models.LeaveInput, actorRole string) error {

	if err := s.authorizeApplyOnBehalf(ctx, actorID, actorRoleID, leave.EmployeeID); err != nil {
		return err
	}

	LeaveTypeInfo, leaveTiming, err := s.ValidateLeave(ctx, leave)
	if err != nil {
		return err
	}
	leaveTypeRres, err := s.LeavePolicyService.GetByID(ctx, leave.LeaveTypeID)
	if err != nil {
		return err
	}

	var Days float64
	var leaveID uuid.UUID
	err = database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		leaveDays, err := service.CalculateWorkingDaysWithTiming(s.CommRepo, tx, leave.StartDate, leave.EndDate, LeaveTypeInfo.TimingID, leaveTiming)
		if err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}
		if leaveDays <= 0 {
			return errors.CustomErr(http.StatusBadRequest, "Calculated leave days must be greater than zero. Please check the dates and timing")
		}
		Days = leaveDays
		leave.Days = &Days

		if err := service.ValidateUnpaidLeaveApplication(s.CommRepo, tx, leave.EmployeeID, leave.LeaveTypeID); err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}

		validationParams := ValidateLeaveApplicationParams{
			EmployeeID:     leave.EmployeeID,
			LeaveTypeID:    leave.LeaveTypeID,
			StartDate:      leave.StartDate,
			EndDate:        leave.EndDate,
			LeaveDays:      leaveDays,
			ExcludeLeaveID: nil,
		}
		if err := s.LeaveValidationSvc.ValidateLeaveApplication(tx, validationParams, LeaveTypeInfo.LeaveType); err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}

		var leaveTimingStr *string
		if LeaveTypeInfo.LeaveType.IsEarly != nil && *LeaveTypeInfo.LeaveType.IsEarly && leave.LeaveTiming != nil {
			leaveTimingStr = leave.LeaveTiming
		}

		// actorID is persisted as applied_by — server-derived, never client input.
		id, err := s.Repo.InsertLeave(tx, leave, leaveTimingStr, actorID)
		if err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "Failed to apply leave: "+err.Error())
		}
		leaveID = id

		if err := s.LeaveFlowLogService.Create(ctx, tx, id, leaveTypeRres, actorRole); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}

	s.publishLeaveApplied(ctx, leave, leaveTypeRres.Name, Days, leaveID.String())

	if s.AuditSvc != nil {
		actorDetails, _ := s.CommRepo.GetEmployeeDetailsForNotification(actorID)

		newValue := map[string]interface{}{
			"leave_type": leaveTypeRres.Name,
			"start_date": leave.StartDate.Format("2006-01-02"),
			"end_date":   leave.EndDate.Format("2006-01-02"),
			"days":       Days,
			"reason":     leave.Reason,
		}
		resourceName := fmt.Sprintf("%s (%s → %s)", leaveTypeRres.Name,
			leave.StartDate.Format("2006-01-02"), leave.EndDate.Format("2006-01-02"))

		if actorID != leave.EmployeeID {
			targetDetails, _ := s.CommRepo.GetEmployeeDetailsForNotification(leave.EmployeeID)
			newValue["applied_on_behalf_of"] = targetDetails.FullName
			resourceName = targetDetails.FullName + " — " + resourceName
		}

		s.AuditSvc.Log(audit.AuditEntry{
			ActorID:      actorID,
			ActorName:    actorDetails.FullName,
			ActorRole:    actorRole,
			Component:    "leave",
			Action:       "leave.applied",
			ResourceType: "Leave",
			ResourceID:   leaveID.String(),
			ResourceName: resourceName,
			NewValue:     newValue,
		})
	}

	return nil
}

// authorizeApplyOnBehalf gates applying for someone else on the
// leave/apply_on_behalf permission and its scope (own/team/all) — the same
// scope model already governing employee visibility elsewhere.
func (s *leaveFlow) authorizeApplyOnBehalf(ctx context.Context, actorID uuid.UUID, actorRoleID int, targetEmployeeID uuid.UUID) error {
	if actorID == targetEmployeeID {
		return nil // always allowed to apply for yourself
	}
	res, err := s.EmployeeSvc.GetEmployeeByID(targetEmployeeID)
	if err != nil {
		return err
	}

	perm, err := s.PermissionSvc.Check(ctx, actorRoleID, "leave", "apply_on_behalf")
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to resolve apply-on-behalf permission")
	}
	if !perm.Allowed {
		return errors.CustomErr(http.StatusForbidden, "you do not have permission to apply leave on behalf of others")
	}

	if err := s.HrbcService.HasPriorityAllowByType(actorRoleID, res.Role); err != nil {
		return err
	}
	return nil
}

// ============================================================
// ActionLeave / CancleLeave / GetLeaves / GetMyLeave / GetByID / UpdateLeave
// — unchanged from the version you shared; included here for completeness
// of the file. Only Create, the struct, and the constructor changed.
// ============================================================

func (s *leaveFlow) ActionLeave(ctx context.Context, req models.ActionLeaveReq, leaveID string, empID uuid.UUID, role string) error {
	leave, err := s.GetByID(ctx, leaveID)
	if err != nil {
		return err
	}
	if leave.EmployeeID == empID {
		return errors.CustomErr(http.StatusForbidden, "You cannot process your own leave request")
	}
	leaveLogFlow, err := s.LeaveFlowLogService.GetByLeaveID(ctx, uuid.MustParse(leaveID))
	if err != nil {
		return err
	}
	if err := s.ActionValidator(ctx, leaveLogFlow, role, req.Action, leave.Status); err != nil {
		return err
	}

	leavePolicy, err := s.LeavePolicyRepo.GetById(ctx, strconv.Itoa(leave.LeaveTypeID))
	if err != nil {
		return errors.CustomErr(500, "Failed to fetch leave type: "+err.Error())
	}

	processor, err := s.registry.Resolve(strings.ToUpper(req.Action))
	if err != nil {
		return err
	}

	approverDetails, _ := s.CommRepo.GetEmployeeDetailsForNotification(empID)

	lctx := &leaveprocess.LeaveActionContext{
		ApproverID:    empID,
		Role:          role,
		Remarks:       req.Remarks,
		Leave:         leave,
		Flow:          leaveLogFlow,
		LeaveType:     leavePolicy,
		FlowLogRepo:   s.LeaveFlowLogRepo,
		CommRepo:      s.CommRepo,
		LeaveFlowRepo: s.Repo,
	}

	if err := database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		return processor.Process(ctx, tx, lctx)
	}); err != nil {
		return err
	}

	action := strings.ToUpper(req.Action)
	switch action {
	case "APPROVE":
		s.publishLeaveAction(ctx, notification.LeaveApproved, leave, approverDetails.FullName, approverDetails.Email, role, leaveID)
	case "REJECT":
		s.publishLeaveAction(ctx, notification.LeaveRejected, leave, approverDetails.FullName, approverDetails.Email, role, leaveID)
	case "WITHDRAW":
		updated, _ := s.GetByID(ctx, leaveID)
		if updated != nil && updated.Status == constant.LEAVE_WITHDRAWN {
			s.publishLeaveAction(ctx, notification.LeaveWithdrawn, leave, approverDetails.FullName, approverDetails.Email, role, leaveID)
		} else {
			s.publishLeaveAction(ctx, notification.LeaveWithdrawalPending, leave, approverDetails.FullName, approverDetails.Email, role, leaveID)
		}
	}

	if s.AuditSvc != nil {
		auditAction := map[string]string{
			"APPROVE":  "leave.approved",
			"REJECT":   "leave.rejected",
			"WITHDRAW": "leave.withdrawn",
		}[action]
		if auditAction == "" {
			auditAction = "leave." + strings.ToLower(action)
		}

		leaveTypeName := leavePolicy.Name

		s.AuditSvc.Log(audit.AuditEntry{
			ActorID:      empID,
			ActorName:    approverDetails.FullName,
			ActorRole:    role,
			Component:    "leave",
			Action:       auditAction,
			ResourceType: "Leave",
			ResourceID:   leaveID,
			ResourceName: fmt.Sprintf("%s (%s → %s)", leaveTypeName,
				leave.StartDate.Format("2006-01-02"),
				leave.EndDate.Format("2006-01-02")),
			NewValue: map[string]interface{}{
				"action":     action,
				"remarks":    req.Remarks,
				"leave_type": leaveTypeName,
				"status":     leave.Status,
			},
		})
	}

	return nil
}

func (s *leaveFlow) CancleLeave(ctx context.Context, leaveId string, actorID uuid.UUID, actorRole string) (string, error) {
	leave, err := s.Repo.GetByID(ctx, leaveId)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", errors.CustomErr(http.StatusNotFound, "Leave not found")
		}
		return "", errors.CustomErr(http.StatusInternalServerError, "Failed to fetch leave: "+err.Error())
	}
	switch leave.Status {
	case constant.LEAVE_APPLOVED:
		return "", errors.CustomErr(http.StatusBadRequest, "Cannot cancel approved leave. Please contact your manager or admin")
	case constant.LEAVE_REJECTED:
		return "", errors.CustomErr(http.StatusBadRequest, "Leave is already rejected")
	case constant.LEAVE_CANCELLED:
		return "", errors.CustomErr(http.StatusBadRequest, "Leave is already cancelled")
	}
	if err := s.Repo.UpdateLeaveStatus(leaveId, constant.LEAVE_CANCELLED); err != nil {
		return "", errors.CustomErr(http.StatusInternalServerError, "Failed to cancel leave: "+err.Error())
	}

	s.publishLeaveAction(ctx, notification.LeaveCancelled, leave, "", "", "", leaveId)

	if s.AuditSvc != nil {
		actorDetails, _ := s.CommRepo.GetEmployeeDetailsForNotification(actorID)
		leaveTypeName := ""
		if lt, err := s.LeavePolicyRepo.GetById(ctx, strconv.Itoa(leave.LeaveTypeID)); err == nil {
			leaveTypeName = lt.Name
		}
		s.AuditSvc.Log(audit.AuditEntry{
			ActorID:      actorID,
			ActorName:    actorDetails.FullName,
			ActorRole:    actorRole,
			Component:    "leave",
			Action:       "leave.cancelled",
			ResourceType: "Leave",
			ResourceID:   leaveId,
			ResourceName: fmt.Sprintf("%s (%s → %s)", leaveTypeName,
				leave.StartDate.Format("2006-01-02"),
				leave.EndDate.Format("2006-01-02")),
			OldValue: map[string]interface{}{"status": leave.Status},
			NewValue: map[string]interface{}{"status": constant.LEAVE_CANCELLED},
		})
	}

	return leaveId, nil
}

func (s *leaveFlow) GetLeaves(ctx context.Context, empID uuid.UUID, role string, month int, year int) (gin.H, error) {
	var (
		result []models.LeaveResponse
		err    error
	)
	switch role {
	case accessrole.ROLE_EMPLOYEE, accessrole.ROLE_INTERN:
		result, err = s.Repo.GetAllEmployeeLeaveByMonthYear(empID, month, year)
	case accessrole.ROLE_MANAGER:
		result, err = s.Repo.GetAllleavebaseonassignManagerByMonthYear(empID, month, year)
	case accessrole.ROLE_ADMIN, accessrole.ROLE_HR, accessrole.ROLE_SUPER_ADMIN:
		result, err = s.Repo.GetAllLeaveByMonthYear(month, year)
	default:
		return nil, errors.CustomErr(http.StatusForbidden, "invalid role")
	}

	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch leaves")
	}

	if result == nil {
		result = []models.LeaveResponse{}
	}
	for i := range result {
		flow, err := s.LeaveFlowLogService.GetByLeaveID(ctx, uuid.MustParse(result[i].ID))
		if err != nil {
			return nil, err
		}
		if flow != nil {
			result[i].ApprovalLog = flow.ApprovalLog
		}
	}

	return gin.H{
		"message": "Leaves fetched successfully",
		"role":    role,
		"month":   month,
		"year":    year,
		"summary": models.BuildLeaveCountSummary(result),
		"data":    result,
	}, nil
}

func (s *leaveFlow) GetMyLeave(empID uuid.UUID, month int, year int) (gin.H, error) {
	result, err := s.Repo.GetMyLeavesByMonthYear(empID, month, year)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "Failed to fetch my leaves: "+err.Error())
	}
	if result == nil {
		result = []models.LeaveResponse{}
	}

	return gin.H{
		"message": "My leaves fetched successfully",
		"user_id": empID,
		"month":   month,
		"year":    year,
		"summary": models.BuildLeaveCountSummary(result),
		"data":    result,
	}, nil
}

func (s *leaveFlow) GetByID(ctx context.Context, leaveID string) (*models.Leave, error) {
	leave, err := s.Repo.GetByID(ctx, leaveID)
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, err.Error())
	}
	return leave, err
}

func (s *leaveFlow) UpdateLeave(ctx context.Context, empID uuid.UUID, leaveId string, leave *models.LeaveInput, role string) error {
	leaveUUID, err := uuid.Parse(leaveId)
	if err != nil {
		return errors.CustomErr(http.StatusBadRequest, "invalid leave ID")
	}

	LeaveTypeInfo, leaveTiming, err := s.ValidateLeave(ctx, leave)
	if err != nil {
		return err
	}
	leaveTypeRes, err := s.LeavePolicyService.GetByID(ctx, leave.LeaveTypeID)
	if err != nil {
		return err
	}

	var Days float64
	err = database.ExecuteTransaction(ctx, s.DB, func(tx *sqlx.Tx) error {
		leaveDays, err := service.CalculateWorkingDaysWithTiming(s.CommRepo, tx, leave.StartDate, leave.EndDate, LeaveTypeInfo.TimingID, leaveTiming)
		if err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}
		if leaveDays <= 0 {
			return errors.CustomErr(http.StatusBadRequest, "Calculated leave days must be greater than zero. Please check the dates and timing")
		}
		leave.Days = &leaveDays
		Days = leaveDays

		if err := service.ValidateUnpaidLeaveApplication(s.CommRepo, tx, leave.EmployeeID, leave.LeaveTypeID); err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}

		validationParams := ValidateLeaveApplicationParams{
			EmployeeID:     leave.EmployeeID,
			LeaveTypeID:    leave.LeaveTypeID,
			StartDate:      leave.StartDate,
			EndDate:        leave.EndDate,
			LeaveDays:      leaveDays,
			ExcludeLeaveID: &leaveUUID,
		}
		if err := s.LeaveValidationSvc.ValidateLeaveApplication(tx, validationParams, LeaveTypeInfo.LeaveType); err != nil {
			return errors.CustomErr(http.StatusBadRequest, err.Error())
		}

		var leaveTimingStr *string
		if LeaveTypeInfo.LeaveType.IsEarly != nil && *LeaveTypeInfo.LeaveType.IsEarly && leave.LeaveTiming != nil {
			leaveTimingStr = leave.LeaveTiming
		}

		if err = s.Repo.UpdateLeave(tx, leaveUUID, empID, leave, leaveTimingStr, leaveDays); err != nil {
			return errors.CustomErr(http.StatusInternalServerError, "failed to update leave: "+err.Error())
		}
		if err := s.LeaveFlowLogService.RegenerateApprovalLog(ctx, tx, leaveUUID, leaveTypeRes, role); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return err
	}

	s.publishLeaveApplied(ctx, leave, leaveTypeRes.Name, Days, leaveUUID.String())

	if s.AuditSvc != nil {
		actorDetails, _ := s.CommRepo.GetEmployeeDetailsForNotification(empID)
		s.AuditSvc.Log(audit.AuditEntry{
			ActorID:      empID,
			ActorName:    actorDetails.FullName,
			ActorRole:    role,
			Component:    "leave",
			Action:       "leave.updated",
			ResourceType: "Leave",
			ResourceID:   leaveUUID.String(),
			ResourceName: fmt.Sprintf("%s (%s → %s)", leaveTypeRes.Name,
				leave.StartDate.Format("2006-01-02"),
				leave.EndDate.Format("2006-01-02")),
			NewValue: map[string]interface{}{
				"leave_type": leaveTypeRes.Name,
				"start_date": leave.StartDate.Format("2006-01-02"),
				"end_date":   leave.EndDate.Format("2006-01-02"),
				"days":       Days,
				"reason":     leave.Reason,
			},
		})
	}

	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification helpers
// ─────────────────────────────────────────────────────────────────────────────

func (s *leaveFlow) publishLeaveApplied(ctx context.Context, leave *models.LeaveInput, leaveTypeName string, days float64, leaveID string) {
	if s.NotificationSvc == nil {
		return
	}
	employee, err := s.CommRepo.GetEmployeeDetailsForNotification(leave.EmployeeID)
	if err != nil {
		log.Println("failed to get emp details", err.Error())
		return
	}
	recipients, err := s.getRecipientsWaiting(ctx, leave.EmployeeID, leaveID)
	if err != nil {
		log.Println("failed to get all role base details info details", err.Error())
		return
	}

	s.NotificationSvc.Publish(notification.Event{
		Type: notification.LeaveApplied,
		Data: &notifmodels.LeaveNotificationData{
			LeaveID:       leaveID,
			LeaveType:     leaveTypeName,
			StartDate:     leave.StartDate,
			EndDate:       leave.EndDate,
			Days:          days,
			Reason:        leave.Reason,
			EmployeeID:    leave.EmployeeID.String(),
			EmployeeName:  employee.FullName,
			EmployeeEmail: employee.Email,
			Recipients:    recipients,
		},
	})
}

func (s *leaveFlow) publishLeaveAction(ctx context.Context, eventType notification.Type, leave *models.Leave, actorName, actorEmail, actorRole string, leaveID string) {
	if s.NotificationSvc == nil {
		return
	}

	employee, err := s.CommRepo.GetEmployeeDetailsForNotification(leave.EmployeeID)
	if err != nil {
		return
	}

	recipients, err := s.getRecipientsWaiting(ctx, leave.EmployeeID, leaveID)
	if err != nil {
		return
	}

	leaveTypeName := ""
	if lt, err := s.LeavePolicyRepo.GetById(ctx, strconv.Itoa(leave.LeaveTypeID)); err == nil {
		leaveTypeName = lt.Name
	}

	s.NotificationSvc.Publish(notification.Event{
		Type: eventType,
		Data: &notifmodels.LeaveNotificationData{
			LeaveID:   leave.ID.String(),
			LeaveType: leaveTypeName,
			StartDate: leave.StartDate,
			EndDate:   leave.EndDate,
			Days:      leave.Days,

			EmployeeID:    leave.EmployeeID.String(),
			EmployeeName:  employee.FullName,
			EmployeeEmail: employee.Email,

			ActorName:  actorName,
			ActorEmail: actorEmail,
			ActorRole:  actorRole,

			Recipients: recipients,
		},
	})
}

func (s *leaveFlow) getRecipientsWaiting(ctx context.Context, employeeID uuid.UUID, leaveID string) ([]models.Recipient, error) {
	flow, err := s.LeaveFlowLogService.GetByLeaveID(ctx, uuid.MustParse(leaveID))
	if err != nil {
		return nil, err
	}

	roleMap := make(map[string]struct{})
	for _, stage := range flow.ApprovalLog {
		if stage.State == models.WAITING || stage.State == models.SKIPPED {
			roleMap[string(stage.ApproverRole)] = struct{}{}
		}
	}

	roles := make([]string, 0, len(roleMap))
	for role := range roleMap {
		roles = append(roles, role)
	}

	if len(roles) == 0 {
		return nil, nil
	}

	return s.CommRepo.GetRecipientsByRoles(ctx, employeeID, roles)
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation orchestration
// ─────────────────────────────────────────────────────────────────────────────

func (s *leaveFlow) ValidateLeave(ctx context.Context, leave *models.LeaveInput) (*LeaveTypeInfo, time.Time, error) {
	var (
		leaveTiming time.Time
		err         error
	)

	if leave.LeaveTiming != nil {
		leaveTiming, err = service.ValidateLeaveTiming(*leave.LeaveTiming)
		if err != nil {
			return nil, time.Time{}, errors.CustomErr(http.StatusBadRequest, err.Error())
		}
	}

	if err := s.LeaveValidationSvc.ValidateLeaveTimingID(leave.LeaveTimingID); err != nil {
		return nil, time.Time{}, errors.CustomErr(http.StatusBadRequest, err.Error())
	}
	if err := s.LeaveValidationSvc.ValidateLeaveReason(leave.Reason); err != nil {
		return nil, time.Time{}, errors.CustomErr(http.StatusBadRequest, err.Error())
	}
	if err := s.LeaveValidationSvc.ValidateLeaveDates(leave.StartDate, leave.EndDate); err != nil {
		return nil, time.Time{}, errors.CustomErr(http.StatusBadRequest, err.Error())
	}

	leaveTypeInfo, err := s.LeaveValidationSvc.GetLeaveTypeAndResolveTimingID(leave.LeaveTypeID, leave.LeaveTimingID)
	if err != nil {
		return nil, time.Time{}, errors.CustomErr(http.StatusBadRequest, err.Error())
	}

	return leaveTypeInfo, leaveTiming, nil
}

func (s *leaveFlow) ActionValidator(ctx context.Context, flow *models.LeaveFlow, role string, action string, status string) error {
	action = strings.ToUpper(action)

	var stage *models.LeaveFlowStage
	for i := range flow.ApprovalLog {
		if string(flow.ApprovalLog[i].ApproverRole) == role {
			stage = &flow.ApprovalLog[i]
			break
		}
	}
	if stage == nil {
		return errors.CustomErr(http.StatusForbidden, "role not allowed for this flow")
	}

	switch action {
	case string(models.APPROVE):
		if status != string(constant.LEAVE_PENDING) {
			return errors.CustomErr(http.StatusBadRequest, "process only pending leave")
		}
		if stage.State != models.WAITING {
			return errors.CustomErr(http.StatusBadRequest, "approve allowed only in waiting state")
		}
		return nil

	case string(models.REJECT):
		if stage.State != models.WAITING {
			return errors.CustomErr(http.StatusBadRequest, "reject allowed only in waiting state")
		}
		return nil

	case "WITHDRAW":
		if status != string(constant.LEAVE_APPLOVED) && status != string(constant.LEAVE_WITHDRAWAL_PENDING) {
			return errors.CustomErr(http.StatusBadRequest, "withdraw allowed only after approval")
		}
		return nil

	default:
		return errors.CustomErr(http.StatusBadRequest, "invalid action")
	}
}
