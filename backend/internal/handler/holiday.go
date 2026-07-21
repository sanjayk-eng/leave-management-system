package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
)

func (h *HandlerFunc) AddHoliday(c *gin.Context) {

	var input models.Holiday

	if err := c.ShouldBindJSON(&input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}

	if err := h.Validator.Struct(input); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation failed: "+err.Error())
		return
	}

	id, err := h.Holidayservice.AddHoliday(c, &input)
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
		Component:    "holiday",
		Action:       "holiday.created",
		ResourceType: "Holiday",
		ResourceID:   id,
		ResourceName: input.Name,
		NewValue: map[string]interface{}{
			"name": input.Name,
			"date": input.Date,
			"type": input.Type,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "holiday added successfully",
		"id":      id,
	})
}

func (h *HandlerFunc) GetHolidays(c *gin.Context) {

	data, err := h.Holidayservice.GetAllHolidays(c)
	if err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

func (h *HandlerFunc) DeleteHoliday(c *gin.Context) {

	id := c.Param("id")
	if id == "" {
		errors.RespondWithError(c, http.StatusBadRequest, "holiday id is required")
		return
	}

	// Fetch the holiday name before deletion so the audit log is useful.
	holidayName := id // fallback to ID if lookup fails
	if holiday, err := h.Holidayservice.GetHolidayByID(c, id); err == nil && holiday != nil {
		holidayName = holiday.Name
	}

	if err := h.Holidayservice.DeleteHoliday(c, id); err != nil {
		errors.Error(c, err)
		return
	}

	// Audit — pure delete, no NewValue.
	actor := h.resolveActorBestEffort(c)
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      actor.ID,
		ActorName:    actor.Name,
		ActorRole:    actor.Role,
		Component:    "holiday",
		Action:       "holiday.deleted",
		ResourceType: "Holiday",
		ResourceID:   id,
		ResourceName: holidayName,
		OldValue:     map[string]interface{}{"name": holidayName},
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "holiday deleted successfully",
	})
}
