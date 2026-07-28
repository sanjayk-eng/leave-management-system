package handler

import (
	"github.com/Zenithive/LeaveManagementSystem/internal/config"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/internal/service"
	authsvc "github.com/Zenithive/LeaveManagementSystem/internal/service"
	"github.com/Zenithive/LeaveManagementSystem/internal/service/leave/leaveflow"
	leavereport "github.com/Zenithive/LeaveManagementSystem/internal/service/leavereport"
	"github.com/Zenithive/LeaveManagementSystem/pkg/actor"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/notification"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// HandlerFunc holds all dependencies injected at startup.
// handler must not create services or providers directly —
// all external dependencies come through here.
type HandlerFunc struct {
	Env                      *config.ENV
	Query                    *repositories.Repository
	Validator                *validator.Validate
	AuthSvc                  authsvc.AuthService
	LeaveAccrual             *service.LeaveAccrualService
	LeaveReportSvc           *leavereport.Service
	LeaveTypeSvc             *service.LeaveTypeService
	LeaveApproverFlowService service.LeaveApprovalFlowService
	LeavePolicyService       service.LeavePolicyService
	LeaveFlowService         leaveflow.LeaveFlowService
	LeaveFlowLogService      service.LeaveFlowLog
	NotificationSvc          notification.Service // async event bus — never nil after NewHandler
	Holidayservice           service.HolidayService
	PermissionSvc            service.PermissionService // RBAC permission toggle
	AssetService             service.AssetService
	EmployeeService          service.EmployeeService
	AuditSvc                 audit.Service // async audit log — never nil after NewHandler
	DesignationService       service.DesignationService
	leaveBalanceService      service.LeaveBalance
	LeaveTimingService       service.LeaveTimingService
}

// NewHandler constructs the handler with all required dependencies.
func NewHandler(
	env *config.ENV,
	query *repositories.Repository,
	validator *validator.Validate,
	leaveApproverFlowService service.LeaveApprovalFlowService,
	leavePolicyService service.LeavePolicyService,
	leaveFlowService leaveflow.LeaveFlowService,
	leaveFlowLogService service.LeaveFlowLog,
	notifSvc notification.Service,
	holidayservice service.HolidayService,
	permissionSvc service.PermissionService,
	assetService service.AssetService,
	employeeSvc service.EmployeeService,
	auditSvc audit.Service,
	designationSvc service.DesignationService,
	leaveBalanceService service.LeaveBalance,
	leaveTimingService service.LeaveTimingService,
) *HandlerFunc {
	return &HandlerFunc{
		Env:                      env,
		Query:                    query,
		Validator:                validator,
		AuthSvc:                  authsvc.New(query, env.SECRET_KEY), // created once here
		LeaveReportSvc:           leavereport.NewService(query),
		LeaveTypeSvc:             service.NewLeaveTypeService(query),
		LeaveApproverFlowService: leaveApproverFlowService,
		LeavePolicyService:       leavePolicyService,
		LeaveFlowService:         leaveFlowService,
		LeaveFlowLogService:      leaveFlowLogService,
		NotificationSvc:          notifSvc,
		Holidayservice:           holidayservice,
		PermissionSvc:            permissionSvc,
		AssetService:             assetService,
		EmployeeService:          employeeSvc,
		AuditSvc:                 auditSvc,
		DesignationService:       designationSvc,
		leaveBalanceService:      leaveBalanceService,
		LeaveTimingService:       leaveTimingService,
	}
}

// SetLeaveAccrualService attaches the accrual service after construction.
// Called from main.go after the service is created.
func (h *HandlerFunc) SetLeaveAccrualService(svc *service.LeaveAccrualService) {
	h.LeaveAccrual = svc
}

// ─────────────────────────────────────────────────────────────────────────────
// Actor resolution — shared by all mutating handlers.
//
// The handler is the only layer that touches *gin.Context.
// These two helpers produce an actor.Info and pass it down to services as
// plain (actorID, actorName, actorRole) values — services never see gin.Context.
//
// The name fallback performs a best-effort DB lookup when full_name is absent
// from the JWT (e.g. older tokens). It is injected via h.nameFallback so the
// pkg/actor package stays framework-agnostic.
// ─────────────────────────────────────────────────────────────────────────────

// nameFallback fetches full_name from the DB when the JWT context doesn't have it.
func (h *HandlerFunc) nameFallback(id uuid.UUID) (string, bool) {
	emp, err := h.Query.GetEmployeeByID(id)
	if err != nil || emp == nil {
		return "", false
	}
	return emp.FullName, true
}

// resolveActor resolves the request actor. Returns an error when user_id is
// missing/invalid — callers should respond 403.
func (h *HandlerFunc) resolveActor(c *gin.Context) (actor.Info, error) {
	return actor.Resolve(c, h.nameFallback)
}

// resolveActorBestEffort resolves the actor without ever returning an error.
// Use for operations that must proceed even if actor resolution fails.
func (h *HandlerFunc) resolveActorBestEffort(c *gin.Context) actor.Info {
	return actor.ResolveBestEffort(c, h.nameFallback)
}
