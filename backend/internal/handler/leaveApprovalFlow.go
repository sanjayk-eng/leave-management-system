package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

func (h *HandlerFunc) CreateApprovelFlow(c *gin.Context) {
	var req models.LeaveApprovalFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	if err := h.LeaveApproverFlowService.CreateLeaveApproverFlow(c, &req, actor.ID, actor.Name, actor.Role); err != nil {
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

	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	if err := h.LeaveApproverFlowService.UpdateLeaveApprovelFlow(c, id, &req, actor.ID, actor.Name, actor.Role); err != nil {
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

	actor, err := h.resolveActor(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusForbidden, "Access Denied")
		return
	}

	if err := h.LeaveApproverFlowService.DeleteLeaveApprovelFlow(c, id, actor.ID, actor.Name, actor.Role); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "approval flow deleted successfully",
	})
}
