package models

// ----------------- DESIGNATION-----------------
type Designation struct {
	ID              *string `json:"id" db:"id"`
	DesignationName string  `json:"designation_name" db:"designation_name"`
	Description     *string `json:"description,omitempty" db:"description"`
}

type DesignationInput struct {
	DesignationName string  `json:"designation_name" validate:"required"`
	Description     *string `json:"description,omitempty"`
}

// AssignDesignationInput is the JSON body for POST/PATCH assign-employee.
type AssignDesignationInput struct {
	EmployeeID string `json:"employee_id" validate:"required"`
}

// DesignationAssignResult is returned by DesignationService.AssignEmployee.
type DesignationAssignResult struct {
	EmployeeID      string `json:"employee_id"`
	DesignationID   string `json:"designation_id"`
	DesignationName string `json:"designation_name"`
}
