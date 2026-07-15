package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *HandlerFunc) CreateApprovelFlow(c *gin.Context) {
	var req models.LeaveApprovalFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	actor := extractActor(c)
	if err := h.LeaveApproverFlowService.CreateLeaveApproverFlow(c, &req, actor.id, actor.name, actor.role); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "approval flow created successfully",
	})
}

func (h *HandlerFunc) GetAllApprovelFlow(c *gin.Context) {
	res, err := h.LeaveApproverFlowService.GetAllLeaveApprovalFlows(c)
	if err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    res,
	})
}

func (h *HandlerFunc) UpdateLeaveApprovelFlow(c *gin.Context) {
	var req models.LeaveApprovalFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}
	id := c.Param("id")
	if id == "" {
		errors.RespondWithError(c, http.StatusBadRequest, "id is required")
		return
	}

	actor := extractActor(c)
	if err := h.LeaveApproverFlowService.UpdateLeaveApprovelFlow(c, id, &req, actor.id, actor.name, actor.role); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "approval flow updated successfully",
	})
}

func (h *HandlerFunc) DeleteLeaveApprovelFlow(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.RespondWithError(c, http.StatusBadRequest, "id is required")
		return
	}

	actor := extractActor(c)
	if err := h.LeaveApproverFlowService.DeleteLeaveApprovelFlow(c, id, actor.id, actor.name, actor.role); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "approval flow deleted successfully",
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// actorCtx — lightweight actor snapshot from the JWT context.
// Falls back gracefully so audit logging never blocks the request.
// ─────────────────────────────────────────────────────────────────────────────

type actorCtx struct {
	id   uuid.UUID
	name string
	role string
}

func extractActor(c *gin.Context) actorCtx {
	empID, _ := common.GetEmployeeId(c)
	name := c.GetString("full_name")
	role := c.GetString("role")
	return actorCtx{id: empID, name: name, role: role}
}
