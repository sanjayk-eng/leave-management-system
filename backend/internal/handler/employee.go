package handler

import (
	"fmt"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/service"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/Zenithive/LeaveManagementSystem/pkg/timezone"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UpdateManagerInput struct {
	ManagerID string `json:"manager_id" validate:"required"` // UUID of new manager
}

func (h *HandlerFunc) GetEmployee(c *gin.Context) {
	actorID, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusUnauthorized, "invalid or missing actor identity")
		return
	}
	actorRoleID := c.GetInt("role_id")

	var params models.EmployeeFilterParams
	if err := c.ShouldBindQuery(&params); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid query parameters: "+err.Error())
		return
	}

	result, err := h.EmployeeService.GetEmployees(c.Request.Context(), actorID, actorRoleID, params)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Employees fetched successfully",
		"employees":   result.Employees,
		"total_count": result.TotalCount,
		"page":        result.Page,
		"page_size":   result.PageSize,
		"total_pages": result.TotalPages,
		"filters": gin.H{
			"search": params.Search, "roles": params.Roles, "designation": params.Designation,
			"status": params.Status, "manager": params.Manager,
			"sort_by": params.SortBy, "sort_order": params.SortOrder,
		},
	})
}

// GetEmployeeById - GET /api/employee/:id
// Simple endpoint - just fetch and return employee data
func (h *HandlerFunc) GetEmployeeById(c *gin.Context) {
	// 1️ Parse Employee ID
	empIDStr := c.Param("id")
	empID, err := uuid.Parse(empIDStr)
	if err != nil {
		errors.RespondWithError(c, 400, "invalid employee ID")
		return
	}

	employee, err := h.EmployeeService.GetEmployeeByID(empID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(200, gin.H{
		"message":  "employee details fetched successfully",
		"employee": employee,
	})
}

func (h *HandlerFunc) CreateEmployee(c *gin.Context) {
	roleID, err := common.GetRoleID(c)
	if err != nil {
		errors.Error(c, err)
		return
	}

	var input models.EmployeeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.EmployeeService.Create(c.Request.Context(), roleID, &input); err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — actor is whoever triggered the creation (admin/HR/superadmin).
	actor := h.resolveActorBestEffort(c)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "employee",
		Action:       "employee.created",
		ResourceType: "Employee",
		ResourceID:   input.Email, // no returned UUID from Create; email is a stable unique identifier
		ResourceName: input.FullName,
		NewValue: map[string]interface{}{
			"full_name":    input.FullName,
			"email":        input.Email,
			"role":         input.Role,
			"joining_date": input.JoiningDate,
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"message": "employee created successfully",
	})
}

func (h *HandlerFunc) UpdateEmployeeRole(c *gin.Context) {
	actorRoleID := c.GetInt("role_id")
	actorUserID, _ := uuid.Parse(c.GetString("user_id")) // best effort; zero UUID if missing/invalid, handled downstream

	empID := c.Param("id")

	var input models.UpdateRoleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}

	result, err := h.EmployeeService.UpdateRole(c.Request.Context(), actorUserID, actorRoleID, empID, input.Role)
	if err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — result carries old/new role for the diff.
	actor := h.resolveActorBestEffort(c)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "employee",
		Action:       "employee.role_updated",
		ResourceType: "Employee",
		ResourceID:   result.EmployeeID,
		ResourceName: result.EmployeeID, // no name returned; use ID as fallback
		OldValue:     map[string]interface{}{"role": result.OldRole},
		NewValue:     map[string]interface{}{"role": result.NewRole},
	})

	c.JSON(http.StatusOK, gin.H{
		"message":     "role updated successfully",
		"employee_id": result.EmployeeID,
		"old_role":    result.OldRole,
		"new_role":    result.NewRole,
	})
}

func (h *HandlerFunc) DeleteEmployeeStatus(c *gin.Context) {
	actorRoleID := c.GetInt("role_id")
	empID := c.Param("id")

	result, err := h.EmployeeService.DeleteStatus(c.Request.Context(), actorRoleID, empID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — action is activated or deactivated depending on new status.
	auditAction := "employee.deactivated"
	if result.NewStatus == "active" {
		auditAction = "employee.activated"
	}
	actor := h.resolveActorBestEffort(c)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "employee",
		Action:       auditAction,
		ResourceType: "Employee",
		ResourceID:   result.EmployeeID,
		ResourceName: result.EmployeeID,
		NewValue:     map[string]interface{}{"status": result.NewStatus},
	})

	c.JSON(http.StatusOK, gin.H{
		"message":     "employee status updated successfully",
		"employee_id": result.EmployeeID,
		"new_status":  result.NewStatus,
	})
}

func (h *HandlerFunc) UpdateEmployeeManager(c *gin.Context) {
	actorUserID, _ := uuid.Parse(c.GetString("user_id")) // best effort; zero UUID if missing/invalid, handled downstream
	actorRoleID := c.GetInt("role_id")

	empID := c.Param("id")

	var input models.UpdateManagerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}

	result, err := h.EmployeeService.UpdateManager(c.Request.Context(), actorUserID, actorRoleID, empID, input.ManagerID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — record who was assigned as the new manager.
	actor := h.resolveActorBestEffort(c)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "employee",
		Action:       "employee.manager_updated",
		ResourceType: "Employee",
		ResourceID:   result.EmployeeID,
		ResourceName: result.EmployeeID,
		NewValue:     map[string]interface{}{"manager_id": result.ManagerID},
	})

	c.JSON(http.StatusOK, gin.H{
		"message":     "manager updated successfully",
		"employee_id": result.EmployeeID,
		"manager_id":  result.ManagerID,
	})
}
func (h *HandlerFunc) UpdateEmployeeInfo(c *gin.Context) {

	actorUserID, err := uuid.Parse(c.GetString("user_id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusUnauthorized, "invalid user id")
		return
	}

	actorRoleID, err := common.GetRoleID(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusUnauthorized, err.Error())
		return
	}

	var req models.UpdateEmployeeInput

	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	employeeID := c.Param("id")

	if employeeID == "" {
		errors.RespondWithError(c, http.StatusBadRequest, "employee id required")
		return
	}

	if err := h.EmployeeService.Update(
		c.Request.Context(),
		actorUserID,
		actorRoleID,
		employeeID,
		&req,
	); err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — record what fields were changed (non-nil fields = updated).
	actor := h.resolveActorBestEffort(c)
	newVal := map[string]interface{}{}
	if req.FullName != nil {
		newVal["full_name"] = *req.FullName
	}
	if req.Email != nil {
		newVal["email"] = *req.Email
	}
	if req.Salary != nil {
		newVal["salary"] = *req.Salary
	}
	if req.JoiningDate != nil {
		newVal["joining_date"] = req.JoiningDate
	}
	if req.BirthDate != nil {
		newVal["birth_date"] = req.BirthDate
	}
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "employee",
		Action:       "employee.updated",
		ResourceType: "Employee",
		ResourceID:   employeeID,
		ResourceName: employeeID,
		NewValue:     newVal,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "employee information updated successfully",
	})
}

// UpdateEmployeePassword - PATCH /api/employee/:id/password
func (h *HandlerFunc) UpdateEmployeePassword(c *gin.Context) {
	actorRoleID := c.GetInt("role_id")
	actorRoleName := c.GetString("role")
	actorUserID, _ := uuid.Parse(c.GetString("user_id")) // best effort; zero UUID if missing/invalid, handled downstream

	var input struct {
		NewPassword string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: new_password is required")
		return
	}

	empID := c.Param("id")

	if err := h.EmployeeService.UpdatePassword(c.Request.Context(), actorUserID, actorRoleID, actorRoleName, empID, input.NewPassword); err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — never log the password value itself, only the fact of the change.
	actor := h.resolveActorBestEffort(c)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "employee",
		Action:       "employee.password_changed",
		ResourceType: "Employee",
		ResourceID:   empID,
		ResourceName: empID,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":     "password updated successfully",
		"employee_id": empID,
	})
}


func (h *HandlerFunc) GetTodayBirthdays(c *gin.Context) {

	tmpl, err := h.Query.GetBirthdayMessageTemplate()
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "failed to fetch template: "+err.Error())
		return
	}

	employees, err := h.Query.GetTodayBirthdays()
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "failed to fetch birthdays: "+err.Error())
		return
	}

	result := make([]models.BirthdayEntry, 0, len(employees))
	for _, emp := range employees {
		result = append(result, models.BirthdayEntry{
			ID:      emp.ID,
			Name:    emp.Name,
			Email:   emp.Email,
			Message: service.RenderBirthdayMessage(tmpl, emp.Name, emp.BirthDate),
		})
	}

	// Always report "today" in the configured application timezone so the date matches the birthday query
	todayIST := timezone.Now().Format("2006-01-02")

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"date":    todayIST,
		"total":   len(result),
		"data":    result,
	})
}

// GetBirthdays - GET /api/employee/birthdays/upcoming
// Query params: ?month=4&year=2026  or  ?year=2027  or  (none = upcoming 30 days)
func (h *HandlerFunc) GetBirthdays(c *gin.Context) {
	month := 0
	year := 0

	if m := c.Query("month"); m != "" {
		if _, err := fmt.Sscanf(m, "%d", &month); err != nil {
			month = 0
		}
	}
	if y := c.Query("year"); y != "" {
		if _, err := fmt.Sscanf(y, "%d", &year); err != nil {
			year = 0
		}
	}

	// 1. Get data from repository
	rows, err := h.Query.GetBirthdays(month, year)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// 2. Business logic in service
	result := service.Calculation(rows, month, year)

	// 3. Response
	c.JSON(200, gin.H{
		"success": true,
		"data":    result,
	})
}
