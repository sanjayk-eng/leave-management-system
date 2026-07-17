package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *HandlerFunc) GetLeaveBalances(c *gin.Context) {
	employeeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid employee ID")
		return
	}

	actorRoleID := c.GetInt("role_id")
	actorID, _ := uuid.Parse(c.GetString("user_id"))

	result, err := h.leaveBalanceService.GetBalances(c.Request.Context(), actorID, actorRoleID, employeeID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"employee_id": result.EmployeeID,
		"year":        result.Year,
		"balances":    result.Balances,
	})
}
func (h *HandlerFunc) AdjustLeaveBalance(c *gin.Context) {
	employeeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid employee ID")
		return
	}

	var input models.LeaveBalanceAdjustInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}

	actor := h.resolveActorBestEffort(c)

	result, err := h.leaveBalanceService.Adjust(c.Request.Context(), actor.ID, employeeID, input)
	if err != nil {
		errors.Error(c, err)
		return
	}
	empName := employeeID.String()
	if emp, err := h.Query.GetEmployeeByID(employeeID); err == nil && emp != nil {
		empName = emp.FullName
	}
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "leave_balance",
		Action:       "leave_balance.adjusted",
		ResourceType: "LeaveBalance",
		ResourceID:   employeeID.String(),
		ResourceName: empName,
		OldValue: map[string]interface{}{
			"adjusted": result.OldAdjusted,
			"closing":  result.OldClosing,
		},
		NewValue: map[string]interface{}{
			"adjusted":      result.NewAdjusted,
			"closing":       result.NewClosing,
			"quantity_diff": result.QuantityDiff,
			"reason":        result.Reason,
			"leave_type_id": result.LeaveTypeID,
			"year":          result.Year,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"message":      "leave balance adjusted successfully",
		"new_adjusted": result.NewAdjusted,
		"new_closing":  result.NewClosing,
		"year":         result.Year,
	})
}
