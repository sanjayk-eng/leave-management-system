package leavereport

import "strings"

// ValidateSortBy checks sort_by against the whitelist. Empty is allowed
// (means "no explicit sort").
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

func NormalizeRole(role string) string {
	return strings.ToUpper(strings.TrimSpace(role))
}
