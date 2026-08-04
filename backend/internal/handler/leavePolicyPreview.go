package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/service"
	"github.com/gin-gonic/gin"
)

// LeavePolicyPreviewResponse is the JSON body returned by PreviewLeaveAllocation.
// Prorated values are float64 rounded to the nearest 0.5
// (e.g. 18 × 5/12 = 7.5, not 7).
type LeavePolicyPreviewResponse struct {
	DefaultEntitlement float64  `json:"default_entitlement"`
	InternEntitlement  *float64 `json:"intern_entitlement,omitempty"`
	ProratedDefault    float64  `json:"prorated_default"`
	ProratedIntern     *float64 `json:"prorated_intern,omitempty"`
	RemainingMonths    int      `json:"remaining_months"`
	ElapsedMonths      int      `json:"elapsed_months"`
	SelectedMonth      int      `json:"selected_month"`
	CurrentMonth       int      `json:"current_month"`
	CurrentYear        int      `json:"current_year"`
	IsCurrentMonth     bool     `json:"is_current_month"`
}

// PreviewLeaveAllocation calculates the prorated allocation that would be
// assigned to employees if a leave policy were created in the given month.
//
// Stateless — no database access. Mirrors service.ProratedLeave exactly.
//
// Query params:
//
//	default_entitlement (required) — annual days for regular employees
//	intern_entitlement  (optional) — annual days for interns
//	month               (optional) — 1-12; defaults to the current calendar month
//
// GET /api/leaves/policy/preview?default_entitlement=18&intern_entitlement=12&month=8
func (h *HandlerFunc) PreviewLeaveAllocation(c *gin.Context) {
	// ── Parse default_entitlement ─────────────────────────────────────────────
	defaultStr := c.Query("default_entitlement")
	if defaultStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "default_entitlement is required"})
		return
	}
	defaultEntitlement, err := strconv.Atoi(defaultStr)
	if err != nil || defaultEntitlement < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "default_entitlement must be a non-negative integer"})
		return
	}

	// ── Parse intern_entitlement (optional) ───────────────────────────────────
	var internEntitlement *int
	if internStr := c.Query("intern_entitlement"); internStr != "" {
		v, err := strconv.Atoi(internStr)
		if err != nil || v < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "intern_entitlement must be a non-negative integer"})
			return
		}
		internEntitlement = &v
	}

	// ── Parse month (optional, defaults to current month) ─────────────────────
	now := time.Now()
	selectedMonth := int(now.Month())

	if monthStr := c.Query("month"); monthStr != "" {
		m, err := strconv.Atoi(monthStr)
		if err != nil || m < 1 || m > 12 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "month must be between 1 and 12"})
			return
		}
		selectedMonth = m
	}

	// Build asOf: 1st of the selected month in the current year.
	asOf := time.Date(now.Year(), time.Month(selectedMonth), 1, 0, 0, 0, 0, now.Location())

	// ── Run proration (rounded to nearest 0.5) ────────────────────────────────
	proratedDefault := service.ProratedLeave(defaultEntitlement, asOf)
	remainingMonths := 13 - selectedMonth
	elapsedMonths   := selectedMonth - 1

	// Convert int inputs to float64 for the response
	defaultF := float64(defaultEntitlement)

	var internF      *float64
	var proratedInternF *float64
	if internEntitlement != nil {
		v := service.ProratedLeave(*internEntitlement, asOf)
		proratedInternF = &v
		f := float64(*internEntitlement)
		internF = &f
	}

	resp := LeavePolicyPreviewResponse{
		DefaultEntitlement: defaultF,
		InternEntitlement:  internF,
		ProratedDefault:    proratedDefault,
		ProratedIntern:     proratedInternF,
		RemainingMonths:    remainingMonths,
		ElapsedMonths:      elapsedMonths,
		SelectedMonth:      selectedMonth,
		CurrentMonth:       int(now.Month()),
		CurrentYear:        now.Year(),
		IsCurrentMonth:     selectedMonth == int(now.Month()),
	}

	c.JSON(http.StatusOK, resp)
}
