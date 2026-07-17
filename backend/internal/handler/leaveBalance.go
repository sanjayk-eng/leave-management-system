package handler

import (
	"database/sql"
	"net/http"
	"time"

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

// AdjustLeaveBalance - POST /api/leave-balances/:id/adjust
// AdjustLeaveBalance - POST /api/leave-balances/adjust
// AdjustLeaveBalance - POST /api/leave-balances/:id/adjust
func (s *HandlerFunc) AdjustLeaveBalance(c *gin.Context) {
	// 2️ Get employee ID from params
	employeeIDParam := c.Param("id")
	employeeID, err := uuid.Parse(employeeIDParam)
	if err != nil {
		errors.RespondWithError(c, 400, "Invalid employee ID")
		return
	}

	// 3️ Parse JSON input
	var input struct {
		LeaveTypeID int     `json:"leave_type_id" validate:"required"`
		Quantity    float64 `json:"quantity" validate:"required"` // +ve or -ve
		Reason      string  `json:"reason" validate:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, 400, "Invalid input: "+err.Error())
		return
	}

	currentYear := time.Now().Year()

	// 4️ Start transaction
	tx, err := s.Query.DB.Beginx()
	if err != nil {
		errors.RespondWithError(c, 500, "Failed to start transaction")
		return
	}
	defer tx.Rollback()

	// 5️ Fetch or create leave balance (repository layer)
	balance, err := s.Query.GetLeaveBalanceForAdjustment(tx, employeeID, input.LeaveTypeID, currentYear)

	if err == sql.ErrNoRows {
		// 5A: Fetch target employee's role to pick correct entitlement
		employeeRole, err := s.Query.GetEmployeeRole(employeeID)
		if err != nil {
			errors.RespondWithError(c, 500, "Failed to fetch employee role: "+err.Error())
			return
		}

		// 5B: Fetch default entitlement (repository layer)
		defaultEntitlement, err := s.Query.GetDefaultEntitlementByLeaveTypeID(tx, input.LeaveTypeID, employeeRole)
		if err != nil {
			errors.RespondWithError(c, 500, "Failed to fetch leave type: "+err.Error())
			return
		}

		// 5B: Create balance row (repository layer)
		balance, err = s.Query.CreateLeaveBalanceForAdjustment(tx, employeeID, input.LeaveTypeID, currentYear, defaultEntitlement)
		if err != nil {
			errors.RespondWithError(c, 500, "Failed to create leave balance: "+err.Error())
			return
		}

	} else if err != nil {
		errors.RespondWithError(c, 500, "Failed to fetch leave balance: "+err.Error())
		return
	}

	// 6️ Apply adjustment
	newAdjusted := balance.Adjusted + input.Quantity
	newClosing := balance.Opening - balance.Used + newAdjusted

	// Update leave balance (repository layer)
	err = s.Query.UpdateLeaveBalanceAdjustment(tx, balance.ID, newAdjusted, newClosing)
	if err != nil {
		errors.RespondWithError(c, 500, "Failed to update leave balance: "+err.Error())
		return
	}

	// 7️ Insert into adjustment log (repository layer)
	err = s.Query.InsertLeaveAdjustment(tx, employeeID, input.LeaveTypeID, input.Quantity, input.Reason, c.GetString("user_id"), currentYear)
	if err != nil {
		errors.RespondWithError(c, 500, "Failed to record leave adjustment: "+err.Error())
		return
	}

	// 8️ Commit
	if err := tx.Commit(); err != nil {
		errors.RespondWithError(c, 500, "Transaction commit failed")
		return
	}

	// Audit — after commit. Resolve employee name best-effort for a readable resource label.
	actor := s.resolveActorBestEffort(c)
	empName := employeeID.String()
	if emp, err := s.Query.GetEmployeeByID(employeeID); err == nil && emp != nil {
		empName = emp.FullName
	}
	s.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "leave_balance",
		Action:       "leave_balance.adjusted",
		ResourceType: "LeaveBalance",
		ResourceID:   employeeID.String(),
		ResourceName: empName,
		OldValue: map[string]interface{}{
			"adjusted": balance.Adjusted,
			"closing":  balance.Closing,
		},
		NewValue: map[string]interface{}{
			"adjusted":      newAdjusted,
			"closing":       newClosing,
			"quantity_diff": input.Quantity,
			"reason":        input.Reason,
			"leave_type_id": input.LeaveTypeID,
			"year":          currentYear,
		},
	})

	c.JSON(200, gin.H{
		"message":      "Leave balance adjusted successfully",
		"new_adjusted": newAdjusted,
		"new_closing":  newClosing,
		"year":         currentYear,
	})
}
