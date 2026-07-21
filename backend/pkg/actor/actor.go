// Package actor provides the canonical actor-resolution helper used by all
// mutating handlers.
//
// Every handler that calls a service method with (actorID, actorName, actorRole)
// must first resolve those three values from the Gin context. This package is
// the single place that logic lives — never duplicated across handlers.
//
// The handler layer is the only place that touches *gin.Context. Services
// receive plain (uuid.UUID, string, string) — they are fully transport-agnostic.
package actor

import (
	"github.com/Zenithive/LeaveManagementSystem/pkg/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Info holds the resolved identity of the authenticated request actor.
type Info struct {
	ID   uuid.UUID
	Name string
	Role string
}

// NameFallbackFn is called when full_name is not set in the JWT context.
// Typically wired to employeeRepo.GetByID(id).FullName from the handler.
// Return ("", false) to skip — the ID string will be used as a last resort.
type NameFallbackFn func(id uuid.UUID) (name string, ok bool)

// Resolve extracts actor identity from the JWT claims set by AuthMiddleware.
// If full_name is absent from the context, fallback is called (best-effort DB lookup).
// Returns an error only when user_id is missing or unparseable — callers should
// respond 403 on error.
func Resolve(c *gin.Context, fallback NameFallbackFn) (Info, error) {
	empID, err := common.GetEmployeeId(c)
	if err != nil {
		return Info{}, err
	}

	name := c.GetString("full_name")
	role := c.GetString("role")

	if name == "" && fallback != nil {
		if n, ok := fallback(empID); ok && n != "" {
			name = n
		}
	}
	if name == "" {
		name = empID.String() // last resort — never leave ActorName blank
	}

	return Info{ID: empID, Name: name, Role: role}, nil
}

// ResolveBestEffort is the same as Resolve but never returns an error.
// Use when the operation must proceed even if actor resolution fails
// (e.g. audit is best-effort and should not block the response).
func ResolveBestEffort(c *gin.Context, fallback NameFallbackFn) Info {
	a, _ := Resolve(c, fallback)
	return a
}
