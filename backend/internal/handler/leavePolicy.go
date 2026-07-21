package handler

// LeaveType controller — HTTP adapter layer.
//
// Responsibilities of this file:
//   - Parse and validate HTTP request data (path params, JSON body, auth claims)
//   - Enforce role-based access control
//   - Open a transaction, call LeaveTypeService, write an audit log, commit
//   - Translate service errors into appropriate HTTP status codes
//   - Serialize the response
//
// Business logic lives in service/leave_type_service.go.
// Database queries live in repositories/leaveType.go and repositories/leaveBalance.go.

import (
	"net/http"
	"strconv"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

func (h *HandlerFunc) LeavePolicy(c *gin.Context) {
	var input models.LeaveTypeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}

	res, err := h.LeavePolicyService.Create(c, &input)
	if err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — pure create, no OldValue.
	actor := h.resolveActorBestEffort(c)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "leave_policy",
		Action:       "leave_policy.created",
		ResourceType: "LeavePolicy",
		ResourceID:   strconv.Itoa(res.ID),
		ResourceName: res.Name,
		NewValue: map[string]interface{}{
			"name":                input.Name,
			"is_paid":             input.IsPaid,
			"default_entitlement": input.DefaultEntitlement,
			"is_early":            input.IsEarly,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "leave policy updated successfully",
		"res":     res,
	})
}

func (h *HandlerFunc) GetAllLeavePolicies(c *gin.Context) {
	res, err := h.LeavePolicyService.Get(c)
	if err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *HandlerFunc) UpdateLeavePolicy(c *gin.Context) {

	// ── Path param ────────────────────────────────────────────────────────────
	leaveTypeID, ok := parseLeaveTypeID(c)
	if !ok {
		return
	}

	// ── Input ─────────────────────────────────────────────────────────────────
	var input models.LeaveTypeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}

	// Fetch BEFORE snapshot for the diff.
	var oldName string
	if before, err := h.LeavePolicyService.GetByID(c, leaveTypeID); err == nil && before != nil {
		oldName = before.Name
	}

	res, err := h.LeavePolicyService.Update(c, leaveTypeID, &input)
	if err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — full before/after diff.
	actor := h.resolveActorBestEffort(c)
	entry := audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "leave_policy",
		Action:       "leave_policy.updated",
		ResourceType: "LeavePolicy",
		ResourceID:   strconv.Itoa(res.ID),
		ResourceName: res.Name,
		NewValue: map[string]interface{}{
			"name":                input.Name,
			"is_paid":             input.IsPaid,
			"default_entitlement": input.DefaultEntitlement,
			"is_early":            input.IsEarly,
		},
	}
	if oldName != "" {
		entry.OldValue = map[string]interface{}{"name": oldName}
	}
	h.AuditSvc.Log(entry)

	c.JSON(http.StatusOK, gin.H{
		"message": "leave policy updated successfully",
		"res":     res,
	})
}

func (h *HandlerFunc) DeleteLeavePolicy(c *gin.Context) {

	// ── Path param ────────────────────────────────────────────────────────────
	leaveTypeID, ok := parseLeaveTypeID(c)
	if !ok {
		return
	}

	// Fetch BEFORE snapshot so the audit record is useful even after deletion.
	var policyName string
	if before, err := h.LeavePolicyService.GetByID(c, leaveTypeID); err == nil && before != nil {
		policyName = before.Name
	}
	if policyName == "" {
		policyName = strconv.Itoa(leaveTypeID)
	}

	if err := h.LeavePolicyService.Delete(c, leaveTypeID); err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — pure delete, no NewValue.
	actor := h.resolveActorBestEffort(c)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "leave_policy",
		Action:       "leave_policy.deleted",
		ResourceType: "LeavePolicy",
		ResourceID:   strconv.Itoa(leaveTypeID),
		ResourceName: policyName,
		OldValue:     map[string]interface{}{"name": policyName},
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "leave policy deleted successfully",
		"id":      leaveTypeID,
	})
}

// parseLeaveTypeID parses and validates the ":id" path parameter.
func parseLeaveTypeID(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid leave type ID")
		return 0, false
	}
	return id, true
}
