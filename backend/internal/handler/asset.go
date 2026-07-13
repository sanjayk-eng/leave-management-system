package handler

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	pagi "github.com/Zenithive/LeaveManagementSystem/pkg/common/pagination"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ======================
// CATEGORY
// ======================

func (h *HandlerFunc) CreateCategory(c *gin.Context) {
	var req models.AssetCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := models.Validate.Struct(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation error: "+err.Error())
		return
	}
	if err := h.AssetService.CreateCategory(c, req); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "category created successfully"})
}

func (h *HandlerFunc) GetCategory(c *gin.Context) {
	pagination := pagi.GetPaginationParams(c)
	filters := pagi.GetFilterParams(c, pagi.CategorySortFields)

	filter := models.QueryFilter{
		Page:     pagination.Page,
		PageSize: pagination.PageSize,
		Search:   filters.Search,
		SortBy:   filters.SortBy,
		SortDir:  filters.SortDir,
	}

	data, total, err := h.AssetService.GetCategory(
		c.Request.Context(),
		filter,
	)
	if err != nil {
		errors.Error(c, err)
		return
	}

	response := gin.H{
		"success":    true,
		"categories": data,
	}

	if filter.PageSize > 0 {
		response["pagination"] = pagi.CalculatePaginationResponse(
			filter.Page,
			filter.PageSize,
			total,
		)
	}

	c.JSON(http.StatusOK, response)
}

func (h *HandlerFunc) UpdateCategory(c *gin.Context) {
	categoryID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid category ID")
		return
	}

	var req models.AssetCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := models.Validate.Struct(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.AssetService.UpdateCategory(c, categoryID, req); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "category updated successfully",
	})
}

func (h *HandlerFunc) DeleteCategory(c *gin.Context) {
	categoryID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid category ID")
		return
	}
	if err := h.AssetService.DeleteCategory(c, categoryID); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "category deleted successfully"})
}

// ======================
// EQUIPMENT
// ======================

func (h *HandlerFunc) CreateAsset(c *gin.Context) {

	var req models.AssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := models.Validate.Struct(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation error: "+err.Error())
		return
	}

	if err := h.AssetService.CreateAsset(c, &req); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "equipment created successfully"})
}

func (h *HandlerFunc) GetAsset(c *gin.Context) {
	pagination := pagi.GetPaginationParams(c)
	filters := pagi.GetFilterParams(c, pagi.EquipmentSortFields)

	filter := models.QueryFilter{
		Page:     pagination.Page,
		PageSize: pagination.PageSize,
		Search:   filters.Search,
		SortBy:   filters.SortBy,
		SortDir:  filters.SortDir,
	}

	data, total, err := h.AssetService.GetAssets(c.Request.Context(), filter)
	if err != nil {
		errors.Error(c, err)
		return
	}

	response := gin.H{
		"success":   true,
		"equipment": data,
	}

	if filter.PageSize > 0 {
		response["pagination"] = pagi.CalculatePaginationResponse(
			filter.Page,
			filter.PageSize,
			total,
		)
	}

	c.JSON(http.StatusOK, response)
}
func (h *HandlerFunc) GetEquipmentByCategory(c *gin.Context) {
	categoryID, err := uuid.Parse(c.Query("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid category ID")
		return
	}

	pagination := pagi.GetPaginationParams(c)
	filters := pagi.GetFilterParams(c, pagi.EquipmentSortFields)

	filter := models.QueryFilter{
		Page:     pagination.Page,
		PageSize: pagination.PageSize,
		Search:   filters.Search,
		SortBy:   filters.SortBy,
		SortDir:  filters.SortDir,
	}

	data, total, err := h.AssetService.GetEquipmentByCategory(
		c.Request.Context(),
		categoryID,
		filter,
	)
	if err != nil {
		errors.Error(c, err)
		return
	}

	response := gin.H{
		"message":   "success",
		"equipment": data,
	}

	if filter.PageSize > 0 {
		response["pagination"] = pagi.CalculatePaginationResponse(
			filter.Page,
			filter.PageSize,
			total,
		)
	}

	c.JSON(http.StatusOK, response)
}

func (h *HandlerFunc) UpdateAsset(c *gin.Context) {
	equipmentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid equipment ID")
		return
	}

	var req models.AssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid input: "+err.Error())
		return
	}
	if err := models.Validate.Struct(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation error: "+err.Error())
		return
	}

	if err := h.AssetService.UpdateAsset(c, equipmentID, req); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "equipment updated successfully"})
}
func (h *HandlerFunc) DeleteEquipment(c *gin.Context) {
	assetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid equipment ID")
		return
	}

	if err := h.AssetService.DeleteAsset(c.Request.Context(), assetID); err != nil {
		errors.Error(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "equipment deleted successfully",
	})
}

// ======================
// ASSIGNMENT
// ======================

func (h *HandlerFunc) AssignAsset(c *gin.Context) {
	empID, err := common.GetEmployeeId(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusUnauthorized, err.Error())
		return
	}

	var req models.AssignAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}
	req.AssignedBy = empID

	if err := models.Validate.Struct(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation error: "+err.Error())
		return
	}

	if err := h.AssetService.AssignAsset(c, &req); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "equipment assigned successfully"})
}
func (h *HandlerFunc) GetAllAssignedEquipment(c *gin.Context) {
	pagination := pagi.GetPaginationParams(c)
	filters := pagi.GetFilterParams(c, pagi.AssignmentSortFields)

	filter := models.QueryFilter{
		Page:     pagination.Page,
		PageSize: pagination.PageSize,
		Search:   filters.Search,
		SortBy:   filters.SortBy,
		SortDir:  filters.SortDir,
	}

	data, total, err := h.AssetService.GetAllAssignedEquipment(c.Request.Context(), filter)
	if err != nil {
		errors.Error(c, err)
		return
	}

	response := gin.H{
		"message": "success",
		"data":    data,
	}

	if filter.PageSize > 0 {
		response["pagination"] = pagi.CalculatePaginationResponse(
			filter.Page,
			filter.PageSize,
			total,
		)
	}

	c.JSON(http.StatusOK, response)
}
func (h *HandlerFunc) GetAssignedEquipmentByEmployee(c *gin.Context) {
	employeeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "invalid employee ID")
		return
	}

	pagination := pagi.GetPaginationParams(c)
	filters := pagi.GetFilterParams(c, pagi.AssignmentSortFields)

	filter := models.QueryFilter{
		Page:     pagination.Page,
		PageSize: pagination.PageSize,
		Search:   filters.Search,
		SortBy:   filters.SortBy,
		SortDir:  filters.SortDir,
	}

	data, total, err := h.AssetService.GetAssignedEquipmentByEmployee(
		c.Request.Context(),
		employeeID,
		filter,
	)
	if err != nil {
		errors.Error(c, err)
		return
	}

	response := gin.H{
		"message": "success",
		"data":    data,
	}

	if filter.PageSize > 0 {
		response["pagination"] = pagi.CalculatePaginationResponse(
			filter.Page,
			filter.PageSize,
			total,
		)
	}

	c.JSON(http.StatusOK, response)
}
func (h *HandlerFunc) UpdateAssignment(c *gin.Context) {
	empID, err := common.GetEmployeeId(c)
	if err != nil {
		errors.RespondWithError(c, http.StatusUnauthorized, err.Error())
		return
	}

	var req models.UpdateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}
	req.AssignedBy = empID

	if err := models.Validate.Struct(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation error: "+err.Error())
		return
	}

	if err := h.AssetService.UpdateAssignAsset(c, &req); err != nil {
		errors.Error(c, err)
		return
	}
	message := "assignment updated successfully"
	if req.ToEmployeeID != nil {
		message = "equipment reassigned successfully"
	}
	c.JSON(http.StatusOK, gin.H{"message": message})
}

func (h *HandlerFunc) RemoveAssignment(c *gin.Context) {
	var req models.RemoveAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := models.Validate.Struct(&req); err != nil {
		errors.RespondWithError(c, http.StatusBadRequest, "validation error: "+err.Error())
		return
	}

	if err := h.AssetService.RemoveEquipment(c, &req); err != nil {
		errors.Error(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "equipment removed successfully"})
}
