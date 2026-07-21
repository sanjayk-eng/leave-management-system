package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

// GetLeaveTiming - GET /api/leave-timing
func (h *HandlerFunc) GetLeaveTiming(c *gin.Context) {
	data, err := h.LeaveTimingService.GetAll(c.Request.Context())
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "leave timing fetched successfully",
		"total":   len(data),
		"data":    data,
	})
}

// GetLeaveTimingByID - GET /api/leave-timing/:id
// Access control now lives entirely in RequirePermission middleware — the
// old inline `role != SUPER_ADMIN && role != ADMIN` check is gone.
func (h *HandlerFunc) GetLeaveTimingByID(c *gin.Context) {
	var req models.GetLeaveTimingByIDReq
	if err := c.ShouldBindUri(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := models.Validate.Struct(req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	data, err := h.LeaveTimingService.GetByID(c.Request.Context(), req.ID)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "leave timing fetched successfully",
		"data":    data,
	})
}

// UpdateLeaveTiming - PATCH /api/leave-timing/:id
func (h *HandlerFunc) UpdateLeaveTiming(c *gin.Context) {
	var req models.UpdateLeaveTimingReq
	if err := c.ShouldBindUri(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := models.Validate.Struct(req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.LeaveTimingService.Update(c.Request.Context(), req.ID, req.Timing); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "leave timing updated successfully",
	})
}
