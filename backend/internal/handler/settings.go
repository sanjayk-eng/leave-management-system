package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/Zenithive/LeaveManagementSystem/internal/config/database"
	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/service"
	"github.com/Zenithive/LeaveManagementSystem/pkg/audit"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// GetCompanySettings - GET /api/settings/company
func (h *HandlerFunc) GetCompanySettings(c *gin.Context) {
	// Only SUPERADMIN and ADMIN allowed
	roleRaw, _ := c.Get("role")
	role := roleRaw.(string)
	if role != "SUPERADMIN" && role != "ADMIN" {
		errors.RespondWithError(c, 403, "Not authorized to view settings")
		return
	}
	var settings models.CompanySettings
	err := h.Query.GetCompanySettings(&settings)
	if err != nil {
		errors.RespondWithError(c, 500, "Failed to fetch settings: "+err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"settings": settings,
	})
}

func (h *HandlerFunc) UpdateCompanySettings(c *gin.Context) {
	// 1. Authorization check
	roleRaw, _ := c.Get("role")
	role, ok := roleRaw.(string)
	if !ok || (role != "SUPERADMIN" && role != "ADMIN") {
		errors.RespondWithError(c, 403, "Not authorized to update settings")
		return
	}

	// 2. Extract values from multipart form
	workingDays, _ := strconv.Atoi(c.PostForm("WorkingDaysPerMonth"))
	if workingDays == 0 {
		workingDays = 22
	}

	input := models.CompanyField{
		WorkingDaysPerMonth:     workingDays,
		AllowManagerAddLeave:    c.PostForm("AllowManagerAddLeave") == "true",
		CompanyName:             c.PostForm("CompanyName"),
		PrimaryColor:            c.PostForm("PrimaryColor"),
		SecondaryColor:          c.PostForm("SecondaryColor"),
		BirthdayMessageTemplate: c.PostForm("BirthdayMessageTemplate"),
	}

	// 3. Handle Logo File Upload
	var logoPath string
	file, err := c.FormFile("Logo")
	if err == nil {
		logoPath = "uploads/logos/" + uuid.New().String() + "-" + file.Filename
		if err := c.SaveUploadedFile(file, logoPath); err != nil {
			errors.RespondWithError(c, 500, "Failed to save logo file")
			return
		}
	}

	// 4. Get Employee ID for Audit Logs
	empIDRaw, ok := c.Get("user_id")
	if !ok {
		errors.RespondWithError(c, http.StatusUnauthorized, "Employee ID missing")
		return
	}
	empID, _ := uuid.Parse(empIDRaw.(string))

	// 5. Execute Database Transaction
	err = database.ExecuteTransaction(c, h.Query.DB, func(tx *sqlx.Tx) error {
		return h.Query.UpdateCompanySettings(tx, input, logoPath)
	})
	if err != nil {
		errors.RespondWithError(c, 500, "Failed to update settings: "+err.Error())
		return
	}

	// Audit — async, after tx commits.
	// OldValue is omitted here because fetching the full settings snapshot
	// before-and-after requires a second query; add it if diff visibility is needed.
	h.AuditSvc.Log(audit.AuditEntry{
		ActorID:      empID,
		ActorName:    c.GetString("full_name"),
		ActorRole:    role,
		Component:    "settings",
		Action:       "settings.updated",
		ResourceType: "CompanySettings",
		ResourceID:   "company-settings",
		ResourceName: "Company Settings",
		NewValue: map[string]interface{}{
			"working_days_per_month":    input.WorkingDaysPerMonth,
			"allow_manager_add_leave":   input.AllowManagerAddLeave,
			"company_name":              input.CompanyName,
			"primary_color":             input.PrimaryColor,
			"secondary_color":           input.SecondaryColor,
			"birthday_message_template": input.BirthdayMessageTemplate,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Company settings updated successfully",
		"logo":    logoPath,
	})
}

// PreviewBirthdayMessage - GET /api/settings/birthday-preview?name=John&birth_date=1995-04-16
// Returns the rendered birthday message using the current template and provided placeholders.
func (h *HandlerFunc) PreviewBirthdayMessage(c *gin.Context) {

	name := c.DefaultQuery("name", "Employee")
	birthDateStr := c.Query("birth_date") // optional, format: 2006-01-02

	var birthDate *time.Time
	if birthDateStr != "" {
		t, err := time.Parse("2006-01-02", birthDateStr)
		if err != nil {
			errors.RespondWithError(c, http.StatusBadRequest, "invalid birth_date format, use YYYY-MM-DD")
			return
		}
		birthDate = &t
	}

	tmpl, err := h.Query.GetBirthdayMessageTemplate()
	if err != nil {
		errors.RespondWithError(c, http.StatusInternalServerError, "failed to fetch template: "+err.Error())
		return
	}

	rendered := service.RenderBirthdayMessage(tmpl, name, birthDate)

	c.JSON(http.StatusOK, gin.H{
		"template":     tmpl,
		"rendered":     rendered,
		"placeholders": []string{"{name}", "{date}", "{age}"},
	})
}
