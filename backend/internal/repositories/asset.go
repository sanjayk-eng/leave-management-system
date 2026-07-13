package repositories

import (
	"context"
	"fmt"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type assetRepository struct {
	DB *sqlx.DB
}

type AssetRepository interface {
	CreateCategory(ctx context.Context, data models.AssetCategoryRequest) error
	UpdateCategory(ctx context.Context, id uuid.UUID, data models.AssetCategoryRequest) error
	GetCategory(ctx context.Context, filter models.QueryFilter) ([]models.AssetCategory, int64, error)
	DeleteCategory(ctx context.Context, id uuid.UUID) error
	CategoryExists(ctx context.Context, id uuid.UUID) (bool, error)

	CreateAsset(ctx context.Context, data *models.AssetRequest) error
	GetAssets(ctx context.Context, filter models.QueryFilter) ([]models.Asset, int64, error)
	GetAssetByID(ctx context.Context, id uuid.UUID) (*models.Asset, error)
	UpdateAsset(ctx context.Context, id uuid.UUID, data *models.Asset) error
	UpdateAssetQuantity(tx *sqlx.Tx, equipmentID uuid.UUID, quantity int, operation string) error
	GetEquipmentByCategory(ctx context.Context, categoryID uuid.UUID, filter models.QueryFilter) ([]models.Asset, int64, error)
	DeleteAsset(ctx context.Context, id uuid.UUID) error
	HasAssetsInCategory(ctx context.Context, categoryID uuid.UUID) (bool, error)

	CreateAssignment(tx *sqlx.Tx, req *models.AssignAssetRequest) error
	GetAssetAssignment(ctx context.Context, equipmentID uuid.UUID, employeeID uuid.UUID) (uuid.UUID, int, error)
	DeleteAssetAssignmentById(tx *sqlx.Tx, assignmentID uuid.UUID) error
	UpdateAssetAssignmentQuantity(tx *sqlx.Tx, assignmentID uuid.UUID, quantity int, operation string) error
	GetAllAssignedEquipment(ctx context.Context, filter models.QueryFilter) ([]models.AssignEquipmentResponse, int64, error)
	GetAssignedEquipmentByEmployee(ctx context.Context, employeeID uuid.UUID, filter models.QueryFilter) ([]models.AssignEquipmentResponse, int64, error)
	HasAssetAssignments(ctx context.Context, equipmentID uuid.UUID) (bool, error)
	SetAssignmentQuantity(tx *sqlx.Tx, assignmentID uuid.UUID, quantity int) error
}

func NewAssetRepository(db *sqlx.DB) AssetRepository {
	return &assetRepository{
		DB: db,
	}
}

// ======================
// SORT FIELD MAPS
// ======================

// categorySortMap maps API sort keys to safe SQL column expressions for categories
var categorySortMap = map[string]string{
	"name":       "name",
	"created_at": "created_at",
}

// equipmentSortMap maps API sort keys to safe SQL column expressions for equipment
var equipmentSortMap = map[string]string{
	"name":               "e.name",
	"category":           "COALESCE(c.name, '')",
	"price":              "e.price",
	"total_quantity":     "e.total_quantity",
	"remaining_quantity": "e.remaining_quantity",
	"is_shared":          "e.is_shared",
	"purchase_date":      "COALESCE(e.purchase_date, '1970-01-01')",
	"created_at":         "e.created_at",
}

// assignmentSortMap maps API sort keys to safe SQL column expressions for assignments
var assignmentSortMap = map[string]string{
	"employee_name":  "e.full_name",
	"equipment_name": "eq.name",
	"quantity":       "ea.quantity",
	"assigned_at":    "ea.assigned_at",
}

// resolveSortField returns the SQL expression for a given sort key, falling back to defaultField
func resolveSortField(sortMap map[string]string, key, defaultField string) string {
	if col, ok := sortMap[key]; ok {
		return col
	}
	return defaultField
}

// ======================
// CATEGORY REPOSITORIES
// ======================

func (r *assetRepository) CreateCategory(ctx context.Context, data models.AssetCategoryRequest) error {
	_, err := r.DB.ExecContext(ctx, `
		INSERT INTO tbl_equipment_category (name, description)
		VALUES ($1, $2)
	`, data.Name, data.Description)
	return err
}

func (r *assetRepository) GetCategory(ctx context.Context, filter models.QueryFilter) ([]models.AssetCategory, int64, error) {

	var (
		res   []models.AssetCategory
		total int64
		args  []interface{}
	)

	argIndex := 1

	whereClause := ""

	if filter.Search != "" {
		whereClause = fmt.Sprintf(" WHERE name ILIKE $%d", argIndex)
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	countQuery := `
		SELECT COUNT(*)
		FROM tbl_equipment_category
	` + whereClause

	if err := r.DB.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	sortCol := resolveSortField(categorySortMap, filter.SortBy, "name")

	sortDir := "ASC"
	if filter.SortDir == "desc" {
		sortDir = "DESC"
	}

	query := `
		SELECT
			id,
			name,
			description,
			created_at,
			updated_at
		FROM tbl_equipment_category
	` + whereClause +
		fmt.Sprintf(" ORDER BY %s %s, id ASC", sortCol, sortDir)

	if filter.PageSize > 0 {
		offset := (filter.Page - 1) * filter.PageSize

		query += fmt.Sprintf(
			" LIMIT $%d OFFSET $%d",
			argIndex,
			argIndex+1,
		)

		args = append(args, filter.PageSize, offset)
	}

	if err := r.DB.SelectContext(ctx, &res, query, args...); err != nil {
		return nil, 0, err
	}

	return res, total, nil
}

func (r *assetRepository) UpdateCategory(ctx context.Context, id uuid.UUID, data models.AssetCategoryRequest) error {

	result, err := r.DB.ExecContext(ctx, `
		UPDATE tbl_equipment_category
		SET
			name = $1,
			description = $2,
			updated_at = NOW()
		WHERE id = $3
	`, data.Name, data.Description, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.CustomErr(http.StatusNotFound, "category not found")
	}
	return nil
}

func (r *assetRepository) DeleteCategory(ctx context.Context, id uuid.UUID) error {
	result, err := r.DB.ExecContext(ctx, `DELETE FROM tbl_equipment_category WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if rows, _ := result.RowsAffected(); rows == 0 {
		return errors.CustomErr(http.StatusNotFound, "category not found")
	}
	return nil
}

func (r *assetRepository) CategoryExists(ctx context.Context, id uuid.UUID) (bool, error) {
	var exists bool

	err := r.DB.GetContext(ctx, &exists, `
		SELECT EXISTS(
			SELECT 1
			FROM tbl_equipment_category
			WHERE id = $1
		)
	`, id)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// ======================
// EQUIPMENT REPOSITORIES
// ======================

func (r *assetRepository) CreateAsset(ctx context.Context, data *models.AssetRequest) error {
	_, err := r.DB.ExecContext(ctx, `
		INSERT INTO tbl_equipment
		(name, category_id, is_shared, price, total_quantity, remaining_quantity, purchase_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`,
		data.Name,
		data.CategoryID,
		data.IsShared,
		data.Price,
		data.TotalQuantity,
		data.TotalQuantity, // remaining = total on creation
		data.PurchaseDate,
	)
	return err
}

func (r *assetRepository) GetAssets(ctx context.Context, filter models.QueryFilter) ([]models.Asset, int64, error) {

	var (
		res   []models.Asset
		total int64
		args  []interface{}
	)

	argIndex := 1
	whereClause := ""

	// Optional search
	if filter.Search != "" {
		whereClause = fmt.Sprintf(
			" WHERE (e.name ILIKE $%d OR c.name ILIKE $%d)",
			argIndex,
			argIndex,
		)
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	// Count query
	countQuery := `
		SELECT COUNT(*)
		FROM tbl_equipment e
		LEFT JOIN tbl_equipment_category c
			ON e.category_id = c.id
	` + whereClause

	if err := r.DB.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	// Sorting
	sortCol := resolveSortField(equipmentSortMap, filter.SortBy, "e.name")

	sortDir := "ASC"
	if filter.SortDir == "desc" {
		sortDir = "DESC"
	}

	query := `
		SELECT
			e.id,
			e.name,
			e.category_id,
			e.is_shared,
			e.price,
			e.total_quantity,
			e.remaining_quantity,
			e.purchase_date,
			e.created_at,
			e.updated_at
		FROM tbl_equipment e
		LEFT JOIN tbl_equipment_category c
			ON e.category_id = c.id
	` + whereClause +
		fmt.Sprintf(" ORDER BY %s %s, e.id ASC", sortCol, sortDir)

	// Optional pagination
	if filter.PageSize > 0 {
		offset := (filter.Page - 1) * filter.PageSize

		query += fmt.Sprintf(
			" LIMIT $%d OFFSET $%d",
			argIndex,
			argIndex+1,
		)

		args = append(args, filter.PageSize, offset)
	}

	if err := r.DB.SelectContext(ctx, &res, query, args...); err != nil {
		return nil, 0, err
	}

	return res, total, nil
}

func (r *assetRepository) GetEquipmentByCategory(ctx context.Context, categoryID uuid.UUID, filter models.QueryFilter) ([]models.Asset, int64, error) {

	var (
		res   []models.Asset
		total int64
		args  []interface{}
	)

	args = append(args, categoryID)
	argIndex := 2

	whereClause := " WHERE e.category_id = $1"

	if filter.Search != "" {
		whereClause += fmt.Sprintf(" AND e.name ILIKE $%d", argIndex)
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	countQuery := `
		SELECT COUNT(*)
		FROM tbl_equipment e
	` + whereClause

	if err := r.DB.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	sortCol := resolveSortField(equipmentSortMap, filter.SortBy, "e.name")

	sortDir := "ASC"
	if filter.SortDir == "desc" {
		sortDir = "DESC"
	}

	query := `
		SELECT
			e.id,
			e.name,
			e.category_id,
			e.is_shared,
			e.price,
			e.total_quantity,
			e.remaining_quantity,
			e.purchase_date,
			e.created_at,
			e.updated_at
		FROM tbl_equipment e
		LEFT JOIN tbl_equipment_category c
			ON e.category_id = c.id
	` + whereClause +
		fmt.Sprintf(" ORDER BY %s %s, e.id ASC", sortCol, sortDir)

	if filter.PageSize > 0 {
		offset := (filter.Page - 1) * filter.PageSize

		query += fmt.Sprintf(
			" LIMIT $%d OFFSET $%d",
			argIndex,
			argIndex+1,
		)

		args = append(args, filter.PageSize, offset)
	}

	if err := r.DB.SelectContext(ctx, &res, query, args...); err != nil {
		return nil, 0, err
	}

	return res, total, nil
}
func (r *assetRepository) GetAssetByID(ctx context.Context, id uuid.UUID) (*models.Asset, error) {
	var asset models.Asset

	query := `
		SELECT
			id,
			name,
			category_id,
			is_shared,
			price,
			total_quantity,
			remaining_quantity,
			purchase_date,
			created_at,
			updated_at
		FROM tbl_equipment
		WHERE id = $1
	`

	err := r.DB.QueryRowContext(ctx, query, id).Scan(
		&asset.ID,
		&asset.Name,
		&asset.CategoryID,
		&asset.IsShared,
		&asset.Price,
		&asset.TotalQuantity,
		&asset.RemainingQuantity,
		&asset.PurchaseDate,
		&asset.CreatedAt,
		&asset.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &asset, nil
}

func (r *assetRepository) UpdateAsset(ctx context.Context, id uuid.UUID, data *models.Asset) error {
	_, err := r.DB.ExecContext(ctx, `
		UPDATE tbl_equipment
		SET name=$1, category_id=$2, is_shared=$3, price=$4,
		    total_quantity=$5, remaining_quantity=$6, purchase_date=$7, updated_at=now()
		WHERE id=$8
	`, data.Name, data.CategoryID, data.IsShared, data.Price,
		data.TotalQuantity, data.RemainingQuantity, data.PurchaseDate, id)

	return err
}
func (r *assetRepository) UpdateAssetQuantity(tx *sqlx.Tx, equipmentID uuid.UUID, quantity int, operation string) error {

	var query string

	switch operation {
	case "inc":
		query = `
			UPDATE tbl_equipment
			SET remaining_quantity = remaining_quantity + $1
			WHERE id = $2
		`
	case "dec":
		query = `
			UPDATE tbl_equipment
			SET remaining_quantity = remaining_quantity - $1
			WHERE id = $2
		`
	default:
		return fmt.Errorf("invalid operation: %s", operation)
	}

	_, err := tx.Exec(query, quantity, equipmentID)
	return err
}

func (r *assetRepository) DeleteAsset(ctx context.Context, id uuid.UUID) error {
	result, err := r.DB.ExecContext(ctx, `DELETE FROM tbl_equipment WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if rows, _ := result.RowsAffected(); rows == 0 {
		return fmt.Errorf("equipment not found")
	}
	return nil
}
func (r *assetRepository) HasAssetAssignments(ctx context.Context, equipmentID uuid.UUID) (bool, error) {
	var exists bool

	query := `
		SELECT EXISTS (
			SELECT 1
			FROM tbl_equipment_assignment
			WHERE equipment_id = $1
		)
	`

	err := r.DB.QueryRowContext(ctx, query, equipmentID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}
func (r *assetRepository) HasAssetsInCategory(ctx context.Context, categoryID uuid.UUID) (bool, error) {
	var exists bool

	query := `
		SELECT EXISTS (
			SELECT 1
			FROM tbl_equipment
			WHERE category_id = $1
		)
	`

	err := r.DB.QueryRowContext(ctx, query, categoryID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// ======================
// ASSIGNMENT REPOSITORIES
// ======================
func (r *assetRepository) CreateAssignment(tx *sqlx.Tx, req *models.AssignAssetRequest) error {
	_, err := tx.Exec(`
		INSERT INTO tbl_equipment_assignment
			(equipment_id, employee_id, assigned_by, quantity)
		VALUES
			($1, $2, $3, $4)
	`, req.EquipmentID, req.EmployeeID, req.AssignedBy, req.Quantity)

	return err
}

// assignmentSelectQuery is the shared SELECT for assignment responses
const assignmentSelectQuery = `
	SELECT
	    ea.id          AS assignment_id,
	    ea.employee_id,
	    e.full_name    AS employee_name,
	    e.email        AS employee_email,
	    ea.equipment_id,
	    eq.name        AS equipment_name,
	    eq.purchase_date,
	    ea.quantity,
	    ea.assigned_at,
	    ab.full_name   AS approved_by_name
	FROM tbl_equipment_assignment ea
	JOIN tbl_employee e   ON e.id  = ea.employee_id
	JOIN tbl_equipment eq ON eq.id = ea.equipment_id
	JOIN tbl_employee ab  ON ab.id = ea.assigned_by
`

func (r *assetRepository) GetAllAssignedEquipment(ctx context.Context, filter models.QueryFilter) ([]models.AssignEquipmentResponse, int64, error) {

	var (
		res   []models.AssignEquipmentResponse
		total int64
		args  []interface{}
	)

	argIndex := 1
	whereClause := ""

	if filter.Search != "" {
		whereClause = fmt.Sprintf(
			` WHERE (e.full_name ILIKE $%d OR eq.name ILIKE $%d)`,
			argIndex,
			argIndex,
		)
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	countQuery := `
		SELECT COUNT(*)
		FROM tbl_equipment_assignment ea
		JOIN tbl_employee e   ON e.id = ea.employee_id
		JOIN tbl_equipment eq ON eq.id = ea.equipment_id
	` + whereClause

	if err := r.DB.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	sortCol := resolveSortField(assignmentSortMap, filter.SortBy, "ea.assigned_at")

	sortDir := "ASC"
	if filter.SortDir == "desc" {
		sortDir = "DESC"
	}

	query := assignmentSelectQuery +
		whereClause +
		fmt.Sprintf(" ORDER BY %s %s, ea.id ASC", sortCol, sortDir)

	if filter.PageSize > 0 {
		offset := (filter.Page - 1) * filter.PageSize

		query += fmt.Sprintf(
			" LIMIT $%d OFFSET $%d",
			argIndex,
			argIndex+1,
		)

		args = append(args, filter.PageSize, offset)
	}

	if err := r.DB.SelectContext(ctx, &res, query, args...); err != nil {
		return nil, 0, err
	}

	return res, total, nil
}

func (r *assetRepository) GetAssignedEquipmentByEmployee(ctx context.Context, employeeID uuid.UUID, filter models.QueryFilter) ([]models.AssignEquipmentResponse, int64, error) {

	var (
		res   []models.AssignEquipmentResponse
		total int64
		args  []interface{}
	)

	args = append(args, employeeID)
	argIndex := 2

	whereClause := " WHERE ea.employee_id = $1"

	if filter.Search != "" {
		whereClause += fmt.Sprintf(" AND eq.name ILIKE $%d", argIndex)
		args = append(args, "%"+filter.Search+"%")
		argIndex++
	}

	countQuery := `
		SELECT COUNT(*)
		FROM tbl_equipment_assignment ea
		JOIN tbl_equipment eq ON eq.id = ea.equipment_id
	` + whereClause

	if err := r.DB.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	sortCol := resolveSortField(assignmentSortMap, filter.SortBy, "ea.assigned_at")

	sortDir := "ASC"
	if filter.SortDir == "desc" {
		sortDir = "DESC"
	}

	query := assignmentSelectQuery +
		whereClause +
		fmt.Sprintf(" ORDER BY %s %s, ea.id ASC", sortCol, sortDir)

	if filter.PageSize > 0 {
		offset := (filter.Page - 1) * filter.PageSize

		query += fmt.Sprintf(
			" LIMIT $%d OFFSET $%d",
			argIndex,
			argIndex+1,
		)

		args = append(args, filter.PageSize, offset)
	}

	if err := r.DB.SelectContext(ctx, &res, query, args...); err != nil {
		return nil, 0, err
	}

	return res, total, nil
}

func (r *assetRepository) GetAssetAssignment(ctx context.Context, equipmentID uuid.UUID, employeeID uuid.UUID) (uuid.UUID, int, error) {
	var (
		assignmentID uuid.UUID
		quantity     int
	)
	err := r.DB.QueryRowContext(ctx, `
		SELECT id, quantity
		FROM tbl_equipment_assignment
		WHERE equipment_id = $1
		  AND employee_id = $2
		ORDER BY assigned_at DESC
		LIMIT 1
	`, equipmentID, employeeID).Scan(&assignmentID, &quantity)

	return assignmentID, quantity, err
}

func (r *assetRepository) DeleteAssetAssignmentById(tx *sqlx.Tx, assignmentID uuid.UUID) error {
	result, err := tx.Exec(`
		DELETE FROM tbl_equipment_assignment
		WHERE id = $1
	`, assignmentID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("assignment not found")
	}

	return nil
}

func (r *assetRepository) UpdateAssetAssignmentQuantity(tx *sqlx.Tx, assignmentID uuid.UUID, quantity int, operation string) error {
	var query string

	switch operation {
	case "inc":
		query = `
			UPDATE tbl_equipment_assignment
			SET quantity = quantity + $1
			WHERE id = $2
		`
	case "dec":
		query = `
			UPDATE tbl_equipment_assignment
			SET quantity = quantity - $1
			WHERE id = $2
		`
	default:
		return fmt.Errorf("invalid operation: %s", operation)
	}

	result, err := tx.Exec(query, quantity, assignmentID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("assignment not found")
	}
	return nil
}
func (r *assetRepository) SetAssignmentQuantity(tx *sqlx.Tx, assignmentID uuid.UUID, quantity int) error {

	result, err := tx.Exec(`
		UPDATE tbl_equipment_assignment
		SET quantity = $1
		WHERE id = $2
	`, quantity, assignmentID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("assignment not found")
	}

	return nil
}

func (r *Repository) RemoveEquipment(tx *sqlx.Tx, req models.RemoveAssignmentRequest) error {
	var (
		assignmentID uuid.UUID
		quantity     int
	)
	err := tx.QueryRow(`
		SELECT id, quantity
		FROM tbl_equipment_assignment
		WHERE equipment_id = $1
		  AND employee_id = $2
		ORDER BY assigned_at DESC
		LIMIT 1
	`, req.EquipmentID, req.EmployeeID).Scan(&assignmentID, &quantity)
	if err != nil {
		// No assignment found — nothing to remove.
		return nil
	}

	if _, err := tx.Exec(`DELETE FROM tbl_equipment_assignment WHERE id = $1`, assignmentID); err != nil {
		return fmt.Errorf("failed to remove assignment: %w", err)
	}

	if _, err := tx.Exec(`
		UPDATE tbl_equipment
		SET remaining_quantity = remaining_quantity + $1
		WHERE id = $2
	`, quantity, req.EquipmentID); err != nil {
		return fmt.Errorf("failed to restore equipment quantity: %w", err)
	}

	return nil
}
