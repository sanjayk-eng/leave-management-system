package handler

// actor.go — shared actor-resolution helpers used by all mutating handlers.
//
// Every handler that writes an audit entry needs WHO: actorID, actorName, actorRole.
// This file is the single place that extracts those three values from the Gin
// context so we never duplicate the fallback logic.

import (
	"github.com/Zenithive/LeaveManagementSystem/pkg/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// actorInfo holds the resolved identity of the request actor.
type actorInfo struct {
	ID   uuid.UUID
	Name string
	Role string
}

// resolveActor extracts actor identity from the JWT claims set by AuthMiddleware.
// If full_name is not in the JWT claims it falls back to a DB lookup via
// GetEmployeeByID. Returns an error only when user_id is missing or unparseable
// (which means the request should be rejected with 403).
func (h *HandlerFunc) resolveActor(c *gin.Context) (actorInfo, error) {
	empID, err := common.GetEmployeeId(c)
	if err != nil {
		return actorInfo{}, err
	}

	name := c.GetString("full_name")
	role := c.GetString("role")

	// Fallback: fetch from DB when middleware didn't set full_name.
	if name == "" {
		if emp, dbErr := h.Query.GetEmployeeByID(empID); dbErr == nil && emp != nil {
			name = emp.FullName
		}
		if name == "" {
			name = empID.String() // last resort — never leave ActorName blank
		}
	}

	return actorInfo{ID: empID, Name: name, Role: role}, nil
}

// resolveActorBestEffort is the same as resolveActor but never returns an error.
// Use it in handlers where the operation should proceed even if actor resolution
// fails (e.g. cancel leave — we still cancel, just omit the audit actor name).
func (h *HandlerFunc) resolveActorBestEffort(c *gin.Context) actorInfo {
	a, _ := h.resolveActor(c)
	return a
}
