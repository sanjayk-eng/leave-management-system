package leavereport

import (
	"strings"

	accessrole "github.com/Zenithive/LeaveManagementSystem/pkg/accessrole"
)

// ValidRoles is the single source of truth for acceptable role filter values.
// Both handlers delegate here instead of each maintaining their own map literal.
var ValidRoles = map[string]bool{
	accessrole.ROLE_EMPLOYEE:   true,
	accessrole.ROLE_INTERN:     true,
	accessrole.ROLE_HR:         true,
	accessrole.ROLE_ADMIN:      true,
	accessrole.ROLE_SUPER_ADMIN: true,
	accessrole.ROLE_MANAGER:    true,
}

// ValidateSortBy checks sort_by against the whitelist. Empty is allowed.
func ValidateSortBy(sortBy string) error {
	if sortBy == "" {
		return nil
	}
	if !ValidSortFields[sortBy] {
		return ErrInvalidSortBy
	}
	return nil
}

// ValidateSortOrder checks sort_order against ASC/DESC. Empty is allowed.
func ValidateSortOrder(sortOrder string) error {
	if sortOrder == "" {
		return nil
	}
	if !ValidSortOrders[strings.ToUpper(sortOrder)] {
		return ErrInvalidSortOrder
	}
	return nil
}

// ValidateRole normalises role to upper-case and checks it against ValidRoles.
// Returns ErrInvalidRole when the value is unrecognised.
func ValidateRole(role string) (string, error) {
	normalised := NormalizeRole(role)
	if normalised != "" && !ValidRoles[normalised] {
		return "", ErrInvalidRole
	}
	return normalised, nil
}

// NormalizeRole converts role to trimmed upper-case for consistent comparison.
func NormalizeRole(role string) string {
	return strings.ToUpper(strings.TrimSpace(role))
}
