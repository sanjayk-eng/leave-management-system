package leavereport

import "testing"

func TestValidateSortBy(t *testing.T) {
	cases := []struct {
		name    string
		sortBy  string
		wantErr error
	}{
		{"empty is allowed", "", nil},
		{"valid field", "total_leaves", nil},
		{"another valid field", "email", nil},
		{"invalid field", "password_hash", ErrInvalidSortBy},
		{"sql injection attempt", "name; DROP TABLE users;--", ErrInvalidSortBy},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateSortBy(tc.sortBy)
			if err != tc.wantErr {
				t.Errorf("ValidateSortBy(%q) = %v, want %v", tc.sortBy, err, tc.wantErr)
			}
		})
	}
}

func TestValidateSortOrder(t *testing.T) {
	cases := []struct {
		name      string
		sortOrder string
		wantErr   error
	}{
		{"empty is allowed", "", nil},
		{"valid ASC", "ASC", nil},
		{"valid DESC", "DESC", nil},
		{"lowercase valid (case-insensitive)", "asc", nil},
		{"invalid value", "SIDEWAYS", ErrInvalidSortOrder},
		{"sql injection attempt", "ASC; DROP TABLE users;--", ErrInvalidSortOrder},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateSortOrder(tc.sortOrder)
			if err != tc.wantErr {
				t.Errorf("ValidateSortOrder(%q) = %v, want %v", tc.sortOrder, err, tc.wantErr)
			}
		})
	}
}

func TestNormalizeRole(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"  employee  ", "EMPLOYEE"},
		{"Admin", "ADMIN"},
		{"", ""},
	}

	for _, tc := range cases {
		got := NormalizeRole(tc.in)
		if got != tc.want {
			t.Errorf("NormalizeRole(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
