package common

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetEmployeeId extracts and parses the authenticated user's UUID from the Gin context.
func GetEmployeeId(c *gin.Context) (uuid.UUID, error) {
	empIDRaw, ok := c.Get("user_id")
	if !ok {
		return uuid.Nil, errors.New("employee ID missing")
	}

	empIDStr, ok := empIDRaw.(string)
	if !ok {
		return uuid.Nil, errors.New("invalid employee ID format")
	}

	empID, err := uuid.Parse(empIDStr)
	if err != nil {
		return uuid.Nil, errors.New("invalid employee UUID")
	}

	return empID, nil
}

// GetMonthYear extracts month and year query parameters from the Gin context,
// defaulting to the current month and year when absent.
func GetMonthYear(c *gin.Context) (int, int, error) {
	month, err := strconv.Atoi(
		c.DefaultQuery("month", fmt.Sprintf("%d", int(time.Now().Month()))),
	)
	if err != nil {
		return 0, 0, fmt.Errorf("invalid month")
	}

	year, err := strconv.Atoi(
		c.DefaultQuery("year", fmt.Sprintf("%d", time.Now().Year())),
	)
	if err != nil {
		return 0, 0, fmt.Errorf("invalid year")
	}

	return month, year, nil
}

// GetRoleID extracts the authenticated user's integer role ID from the Gin context.
func GetRoleID(c *gin.Context) (int, error) {
	roleID, ok := c.Get("role_id")
	if !ok {
		return 0, errors.New("role_id missing from context")
	}

	id, ok := roleID.(int)
	if !ok {
		return 0, errors.New("invalid role_id type")
	}

	return id, nil
}
