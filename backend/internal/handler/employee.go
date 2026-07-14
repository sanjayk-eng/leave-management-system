package handler

import (
	"fmt"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/service"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/Zenithive/LeaveManagementSystem/pkg/timezone"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
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

	c.JSON(http.StatusOK, gin.H{
		"message":     "role updated successfully",
		"employee_id": result.EmployeeID,
		"old_role":    result.OldRole,
		"new_role":    result.NewRole,
	})
}

func (h *HandlerFunc) DeleteEmployeeStatus(c *gin.Context) {

	// Read ID
	idParam := c.Param("id")
	empID, err := uuid.Parse(idParam)
	if err != nil {
		errors.RespondWithError(c, 400, "invalid employee id")
		return
	}

	// Role check
	role, _ := c.Get("role")
	r := role.(string)

	if r != "SUPERADMIN" && r != "ADMIN" && role != "HR" {
		errors.RespondWithError(c, 401, "not permitted")
		return
	}

	// Check if target employee exists (works for both active and deactive)
	targetEmp, err := h.EmployeeService.GetEmployeeByID(empID)
	if err != nil {
		errors.Error(c, err)
		return
	}
	// HR and ADMIN cannot deactivate SUPERADMIN
	if (r == "ADMIN") && targetEmp.Role == "SUPERADMIN" {
		errors.RespondWithError(c, 403, "HR and ADMIN cannot modify SUPERADMIN users")
		return
	}

	var newStatus string
	if err := database.ExecuteTransaction(c, h.Query.DB, func(tx *sqlx.Tx) error {
		var txErr error
		newStatus, txErr = h.Query.DeleteEmployeeStatus(tx, empID)
		return txErr
	}); err != nil {
		errors.RespondWithError(c, 500, err.Error())
		return
	}

	c.JSON(200, gin.H{
		"message":    "Employee status updated successfully",
		"new_status": newStatus,
	})
}
func (h *HandlerFunc) UpdateEmployeeManager(c *gin.Context) {
	// 1️ Permission check
	role := c.GetString("role")
	if role != "SUPERADMIN" && role != "ADMIN" && role != "HR" {
		errors.RespondWithError(c, 401, "not permitted")
		return
	}

	// 2️ Parse Employee ID
	empID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, 400, "invalid employee ID")
		return
	}

	// 2.5️ Check if target employee is SUPERADMIN
	targetEmp, err := h.EmployeeService.GetEmployeeByID(empID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	// HR and ADMIN cannot assign manager to SUPERADMIN
	if (role == "ADMIN" || role == "HR") && targetEmp.Role == "SUPERADMIN" {
		errors.RespondWithError(c, 403, "HR and ADMIN cannot modify SUPERADMIN users")
		return
	}

	// 3️ Parse Manager ID
	var input UpdateManagerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, 400, "invalid input: "+err.Error())
		return
	}
	managerID, err := uuid.Parse(input.ManagerID)
	if err != nil {
		errors.RespondWithError(c, 400, "invalid manager ID")
		return
	}

	// 4️ Self assignment check
	if empID == managerID {
		errors.RespondWithError(c, 400, "cannot assign employee as their own manager")
		return
	}

	// 4.5️ Prevent manager from assigning themselves to others
	currentUserID, _ := uuid.Parse(c.GetString("user_id"))
	if currentUserID == managerID && role != "SUPERADMIN" {
		errors.RespondWithError(c, 403, "you cannot assign yourself as a manager to others. Only SUPERADMIN can do this.")
		return
	}

	// 6️ Validate Manager exists, active and role = MANAGER
	var mgrRole, mgrStatus string
	err = h.Query.DB.Get(&mgrRole, "SELECT r.type FROM Tbl_Employee e JOIN Tbl_Role r ON e.role_id = r.id WHERE e.id=$1", managerID)
	if err != nil {
		errors.RespondWithError(c, 404, "manager not found")
		return
	}
	err = h.Query.DB.Get(&mgrStatus, "SELECT status FROM Tbl_Employee WHERE id=$1", managerID)
	if err != nil || mgrStatus != "active" {
		errors.RespondWithError(c, 403, "manager is deactivated")
		return
	}
	if mgrRole != "MANAGER" {
		errors.RespondWithError(c, 400, "assigned employee is not a manager")
		return
	}

	// 7️ Update manager
	err = h.Query.UpdateManager(empID, managerID)
	if err != nil {
		errors.RespondWithError(c, 500, "failed to update manager: "+err.Error())
		return
	}

	// 8️ Success response
	c.JSON(200, gin.H{
		"message":     "manager updated successfully",
		"employee_id": empID,
		"manager_id":  managerID,
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

	c.JSON(http.StatusOK, gin.H{
		"message":     "password updated successfully",
		"employee_id": empID,
	})
}

// UpdateEmployeeDesignation - PATCH /api/employee/:id/designation
// Only ADMIN, SUPERADMIN, and HR can assign/update employee designation
func (h *HandlerFunc) UpdateEmployeeDesignation(c *gin.Context) {
	// 1️ Permission check
	role := c.GetString("role")
	if role != "SUPERADMIN" && role != "ADMIN" && role != "HR" {
		errors.RespondWithError(c, http.StatusForbidden, "only ADMIN, SUPERADMIN, and HR can assign designations")
		return
	}

	// 2️Parse Employee ID
	empIDStr := c.Param("id")
	empID, err := uuid.Parse(empIDStr)
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid employee ID")
		return
	}

	// 3️ Check if employee exists
	targetEmp, err := h.EmployeeService.GetEmployeeByID(empID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	// 4️ HR and ADMIN cannot modify SUPERADMIN
	if (role == "ADMIN" || role == "HR") && targetEmp.Role == "SUPERADMIN" {
		errors.RespondWithError(c, http.StatusForbidden, "HR and ADMIN cannot modify SUPERADMIN users")
		return
	}

	// 5️ Bind input JSON
	var input struct {
		DesignationID *string `json:"designation_id"` // Can be null to remove designation
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}

	// 6️ Parse and validate designation ID if provided
	var designationID *uuid.UUID
	if input.DesignationID != nil && *input.DesignationID != "" {
		parsedID, err := uuid.Parse(*input.DesignationID)
		if err != nil {
			errors.RespondWithError(c, http.StatusBadRequest, "invalid designation ID")
			return
		}

		// Check if designation exists
		_, err = h.Query.GetDesignationByID(parsedID)
		if err != nil {
			errors.RespondWithError(c, http.StatusNotFound, "designation not found")
			return
		}
		designationID = &parsedID
	}

	// 7️ Update employee designation
	err = h.Query.UpdateEmployeeDesignation(empID, designationID)
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "failed to update designation: "+err.Error())
		return
	}

	// 8️ Response
	message := "employee designation updated successfully"
	if designationID == nil {
		message = "employee designation removed successfully"
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        message,
		"employee_id":    empID,
		"designation_id": designationID,
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

// GetBirthdays - GET /api/employee/birthdays/upcomming
// Query params: ?month=4&year=2026  or  ?year=2027  or  (none = upcoming 30 days)
func (h *HandlerFunc) GetBirthdays(c *gin.Context) {
	month := 0
	year := 0

	if m := c.Query("month"); m != "" {
		fmt.Sscanf(m, "%d", &month)
	}
	if y := c.Query("year"); y != "" {
		fmt.Sscanf(y, "%d", &year)
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
