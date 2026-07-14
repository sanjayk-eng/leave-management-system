package repositories

import (
	"github.com/jmoiron/sqlx"
)

type roleRepository struct {
	db *sqlx.DB
}

type RoleRepository interface {
	GetRolePriority(roleID int) (int, error)
	GetRolePriorityByType(roleType string) (int, error)
	GetRoleID(role string) (int, error)
	GetRoleType(roleID int) (string, error)
}

func NewRoleRepository(db *sqlx.DB) RoleRepository {
	return &roleRepository{
		db: db,
	}
}

func (r *roleRepository) GetRolePriority(roleID int) (int, error) {
	var priority int

	query := `
		SELECT priority
		FROM Tbl_Role
		WHERE id = $1
	`

	err := r.db.Get(&priority, query, roleID)
	if err != nil {
		return 0, err
	}

	return priority, nil
}

func (r *roleRepository) GetRolePriorityByType(roleType string) (int, error) {
	var priority int

	err := r.db.Get(
		&priority,
		`SELECT priority FROM Tbl_Role WHERE type = $1`,
		roleType,
	)

	return priority, err
}

func (r *roleRepository) GetRoleID(role string) (int, error) {
	var id int
	err := r.db.QueryRow(`SELECT id FROM Tbl_Role WHERE type=$1`, role).Scan(&id)
	return id, err
}

func (r *roleRepository) GetRoleType(roleID int) (string, error) {

	var roleType string

	err := r.db.QueryRow(
		`
		SELECT type
		FROM Tbl_Role
		WHERE id = $1
		`,
		roleID,
	).Scan(&roleType)

	if err != nil {
		return "", err
	}

	return roleType, nil
}
