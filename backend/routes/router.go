package routes

import (
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/config"
	"github.com/Zenithive/LeaveManagementSystem/internal/handler"
	"github.com/Zenithive/LeaveManagementSystem/middleware"
	"github.com/Zenithive/LeaveManagementSystem/pkg/constant/rbsc"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, h *handler.HandlerFunc, env *config.ENV) {

	r.Use(cors.New(cors.Config{
		AllowOrigins:     env.ALLOWED_ORIGINS,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Authorization", "token"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// ----------------- Auth -----------------
	auth := r.Group("/api/auth")
	{
		auth.POST("/login", h.Login)
		auth.GET("/verify", h.VerifyToken)                           // Verify token validity
		auth.POST("/logout", middleware.AuthMiddleware(h), h.Logout) // Logout (requires valid token)
		auth.GET("/roles", h.GetAllRoles)                            // Get all available role types (public)
	}

	// ----------------- Employees -----------------
	employees := r.Group("/api/employee")
	employees.Use(middleware.AuthMiddleware(h)) // Protect employee routes
	{
		employees.GET("", middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionRead)), h.GetEmployee)                                     // List all employees (SUPER_ADMIN, ADMIN/HR)                                                                                                // Get manager's team members (MANAGER only)
		employees.GET("/:id", h.GetEmployeeById)                                                                                                                      // Get employee details (Self/Manager/Admin)
		employees.POST("", middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionAdd)), h.CreateEmployee)                                  // Create employee (SUPER_ADMIN, ADMIN/HR)
		employees.PATCH("/:id", middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionEdit)), h.UpdateEmployeeInfo)                        // Update employee info (SUPER_ADMIN, ADMIN/HR)
		employees.PATCH("/:id/password", middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionChangePassword)), h.UpdateEmployeePassword) // Update employee password (SUPER_ADMIN, ADMIN, HR)
		employees.PATCH("/:id/role", middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionUpdateRole)), h.UpdateEmployeeRole)             // Change employee role (SUPER_ADMIN, ADMIN/HR)
		employees.PATCH("/:id/manager", middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionAssignManager)), h.UpdateEmployeeManager)    // Set/change manager (SUPER_ADMIN, ADMIN/HR)
		employees.PUT("/deactivate/:id", middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionStateManage)), h.DeleteEmployeeStatus)
		// Deactivate/Activate employee (SUPER_ADMIN, ADMIN/HR)            // Get direct reports (Self/Manager/Admin)
		employees.GET("/birthdays/today", h.GetTodayBirthdays)
		employees.GET("/birthdays/upcomming", h.GetBirthdays) // filter_type=current_month
	}

	// ----------------- Leaves -----------------
	leaves := r.Group("/api/leaves")
	leaves.Use(middleware.AuthMiddleware(h))
	{
		leaves.POST("/apply", middleware.RequirePermission(h, string(rbsc.ResourceLeave), string(rbsc.ActionApply)), h.ApplyLeave)
		leaves.GET("/all", middleware.RequirePermission(h, string(rbsc.ResourceLeave), string(rbsc.ActionRead)), h.GetLeaves)
		leaves.POST("/:id/action", middleware.RequireLeaveAction(h), h.LeaveAction) // Approve/Reject/Withdraw leave
		leaves.DELETE("/:id/cancel", middleware.RequirePermission(h, string(rbsc.ResourceLeave), string(rbsc.ActionCancel)), h.CancelLeave)
		leaves.GET("/my-leaves", h.GetAllMyLeave)

		//leaves.PUT("/edit/:id", h.EditMyLeave)                                                                         // New Route
		leaves.POST("/admin-add/policy", middleware.RequirePermission(h, string(rbsc.ResourceSettings), string(rbsc.ActionManageLeavePolicy)), h.LeavePolicy)                // Admin creates leave policy
		leaves.PUT("/admin-update/policy/:id", middleware.RequirePermission(h, string(rbsc.ResourceSettings), string(rbsc.ActionManageLeavePolicy)), h.UpdateLeavePolicy)    // Admin, SuperAdmin, HR update leave policy
		leaves.DELETE("/admin-delete/policy/:id", middleware.RequirePermission(h, string(rbsc.ResourceSettings), string(rbsc.ActionManageLeavePolicy)), h.DeleteLeavePolicy) // Admin, SuperAdmin, HR delete leave policy
		leaves.GET("/Get-All-Leave-Policy", h.GetAllLeavePolicies)                                                                                                           // Get all leave policies                                                  // Manager gets team leave history
		// Get all leaves (filtered by role)
		leaves.GET("/Get-Leave-Report", middleware.RequirePermission(h, string(rbsc.ResourceLeaveReport), string(rbsc.ActionRead)), h.GetLeaveReport)     // Alias — same RBAC guard
		leaves.GET("/timming", h.GetLeaveTiming)                                                                                                          // Get all Leave Timing
		leaves.PUT("/timming", middleware.RequirePermission(h, string(rbsc.ResourceSettings), string(rbsc.ActionManageLeaveTiming)), h.UpdateLeaveTiming) // Update leave timing by super admin and admin
		leaves.PUT("edit/:id", middleware.RequirePermission(h, string(rbsc.ResourceLeave), string(rbsc.ActionApply)), h.EditLeave)                        // Cancel pending leave (Employee/Admin)
	}
	leaveLog := leaves.Group("/log")
	leaveLog.GET("/", h.GetLeaveLog)

	approver := leaves.Group("/approver-flow")
	approver.Use(middleware.AuthMiddleware(h), middleware.RequirePermission(h, string(rbsc.ResourceSettings), string(rbsc.ActionManageLeaveFlow)))
	{
		approver.POST("", h.CreateApprovelFlow)
		approver.GET("", h.GetAllApprovelFlow)
		approver.PUT("/:id", h.UpdateLeaveApprovelFlow)
		approver.DELETE("/:id", h.DeleteLeaveApprovelFlow)
	}

	// ----------------- Leave Balances -----------------
	leaveBalances := r.Group("/api/leave-balances")
	leaveBalances.Use(middleware.AuthMiddleware(h))
	{

		leaveBalances.GET("/employee/:id", h.GetLeaveBalances)                                                                                             // GET /api/employees/:id/leave-balances
		leaveBalances.POST("/:id/adjust", middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionAdjust)), h.AdjustLeaveBalance) // POST /api/leave-balances/:id/adjust
	}

	// ----------------- Admin: Leave Accrual -----------------
	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware(h))
	{
		// Manually trigger monthly leave accrual (SUPERADMIN only)
		// ?month=5&year=2026  (defaults to current month/year)
		admin.POST("/leave-accrual/run", h.TriggerLeaveAccrual)
	}

	// ----------------- Cron Jobs (No Auth - Token Protected) -----------------
	cron := r.Group("/api/cron")
	{
		// Daily leave Slack notification
		// GET /api/cron/daily-leave-slack?token=<CRON_SECRET_TOKEN>
		cron.GET("/daily-leave-slack", h.DailyLeaveSlackNotification)
	}

	// ----------------- Payroll -----------------
	payroll := r.Group("/api/payroll")
	payroll.Use(middleware.AuthMiddleware(h))
	{
		// Run payroll for a given month & year
		payroll.POST("/run", middleware.RequirePermission(h, string(rbsc.ResourcePayroll), string(rbsc.ActionPayrollManagment)), h.RunPayroll)
		// POST /api/payroll/run

		// Preview payslip PDF with dummy data (ADMIN/SUPERADMIN only, no DB record)
		payroll.GET("/payslips/preview", middleware.RequirePermission(h, string(rbsc.ResourcePayslip), string(rbsc.ActionRead)), h.PreviewPayslipPDF)

		// Finalize payroll for a specific payroll run ID
		payroll.POST("/:id/finalize", middleware.RequirePermission(h, string(rbsc.ResourcePayroll), string(rbsc.ActionPayrollManagment)), h.FinalizePayroll)
		// POST /api/payroll/{id}/finalize

		payroll.GET("/payslip", middleware.RequirePermission(h, string(rbsc.ResourcePayroll), string(rbsc.ActionPayrollManagment)), h.GetFinalizedPayslips)

		// Download payslip PDF for a specific employee payslip ID
		payroll.GET("/payslips/:id/pdf", middleware.RequirePermission(h, string(rbsc.ResourcePayslip), string(rbsc.ActionRead)), h.GetPayslipPDF)
		// GET /api/payroll/payslips/{id}/pdf
	}

	// ----------------- Settings -----------------
	settings := r.Group("/api/settings")
	settings.Use(middleware.AuthMiddleware(h), middleware.RequirePermission(h, string(rbsc.ResourceSettings), string(rbsc.ActionMangmentCompanyInfo))) // Only admin/superadmin
	{
		settings.GET("", h.GetCompanySettings)                      // Get current settings
		settings.PUT("", h.UpdateCompanySettings)                   // Update settings
		settings.GET("/birthday-preview", h.PreviewBirthdayMessage) // Preview rendered birthday message      // Get today's employee birthdays
	}
	holidays := r.Group("/api/settings/holidays")
	holidays.Use(middleware.AuthMiddleware(h))
	{
		holidays.POST("", middleware.RequirePermission(h, string(rbsc.ResourceSettings), string(rbsc.ActionManageHolidays)), h.AddHoliday)          // SUPERADMIN adds holiday
		holidays.GET("", h.GetHolidays)                                                                                                             // List all holidays
		holidays.DELETE("/:id", middleware.RequirePermission(h, string(rbsc.ResourceSettings), string(rbsc.ActionManageHolidays)), h.DeleteHoliday) // Remove holiday
	}

	// ----------------- Designations -----------------
	designations := r.Group("/api/designations")
	designations.Use(middleware.AuthMiddleware(h), middleware.RequirePermission(h, string(rbsc.ResourceEmployee), string(rbsc.ActionDesignationManage)))
	{
		designations.POST("", h.CreateDesignation)                                 // Create designation
		designations.GET("", h.GetAllDesignations)                                 // Get all designations
		designations.GET("/:id", h.GetDesignationByID)                             // Get by ID
		designations.PATCH("/:id", h.UpdateDesignation)                            // Update designation
		designations.DELETE("/:id", h.DeleteDesignation)                           // Delete designation
		designations.PATCH("/:id/assign-employee", h.AssignEmployee)               // Assign employee → designation
		designations.DELETE("/:id/assign-employee/:employee_id", h.RemoveEmployee) // Remove employee from designation
	}
	logs := r.Group("/api/logs")
	logs.Use((middleware.AuthMiddleware(h)), middleware.RequirePermission(h, string(rbsc.ResourceLog), string(rbsc.ActionRead)))
	{
		logs.GET("", h.GetActivityFeed)
		logs.GET("/meta", h.GetActivityMeta)
	}

	permissions := r.Group("/api/permissions")
	permissions.Use(middleware.AuthMiddleware(h))
	{
		permissions.GET("/roles/:role_id", middleware.RequirePermission(h, string(rbsc.ResourcePermission), string(rbsc.ActionRead)), h.GetRolePermissions)
		permissions.PATCH("/roles/:role_id", middleware.RequirePermission(h, string(rbsc.ResourcePermission), string(rbsc.ActionEdit)), h.UpdateRolePermissions)
	}
	// Category routes
	catagory := r.Group("/api/catagory")
	catagory.Use(middleware.AuthMiddleware(h))
	{

		catagory.POST("", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionAdd)), h.CreateCategory)
		catagory.GET("", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionRead)), h.GetCategory)
		catagory.DELETE("/:id", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionRemove)), h.DeleteCategory)
		catagory.PUT("/:id", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionEdit)), h.UpdateCategory)

		equipment := catagory.Group("/equipment")
		{
			equipment.POST("", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionAdd)), h.CreateAsset)                        // Create equipment (ADMIN, SUPERADMIN, HR)
			equipment.GET("", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionRead)), h.GetAsset)                           // Get all equipment (ADMIN, SUPERADMIN, HR)
			equipment.GET("/by-category", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionRead)), h.GetEquipmentByCategory) // Get equipment by category ID (query param)
			equipment.PUT("/:id", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionEdit)), h.UpdateAsset)                    // Update equipment (ADMIN, SUPERADMIN, HR)
			equipment.DELETE("/:id", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionRemove)), h.DeleteEquipment)           // Delete equipment (ADMIN, SUPERADMIN, HR)
		}

		assign := equipment.Group("/assign")
		{
			assign.POST("", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionAssign)), h.AssignAsset)               // Assign equipment
			assign.GET("", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionRead)), h.GetAllAssignedEquipment)      // Get all assignments
			assign.GET("/employee/:id", h.GetAssignedEquipmentByEmployee)                                                                        // Get by employee id
			assign.DELETE("/remove", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionRemove)), h.RemoveAssignment) // Remove/return equipment
			assign.PUT("/update", middleware.RequirePermission(h, string(rbsc.ResourceAsset), string(rbsc.ActionEdit)), h.UpdateAssignment)      // Update assignment (quantity or reassign)
		}
	}
}
