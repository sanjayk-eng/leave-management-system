package handler

import (
	"github.com/Zenithive/LeaveManagementSystem/internal/config"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/internal/service"
	authsvc "github.com/Zenithive/LeaveManagementSystem/internal/service"
	"github.com/Zenithive/LeaveManagementSystem/internal/service/leave/leaveflow"
	"github.com/Zenithive/LeaveManagementSystem/pkg/notification"
	"github.com/go-playground/validator/v10"
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
	LeaveReportSvc           *service.LeaveReportService
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

) *HandlerFunc {
	return &HandlerFunc{
		Env:                      env,
		Query:                    query,
		Validator:                validator,
		AuthSvc:                  authsvc.New(query, env.SECRET_KEY), // created once here
		LeaveReportSvc:           service.NewLeaveReportService(query),
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
	}
}

// SetLeaveAccrualService attaches the accrual service after construction.
// Called from main.go after the service is created.
func (h *HandlerFunc) SetLeaveAccrualService(svc *service.LeaveAccrualService) {
	h.LeaveAccrual = svc
}
