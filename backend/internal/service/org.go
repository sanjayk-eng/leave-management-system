package service

import (
	"context"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/google/uuid"
)

type OrgService interface {
	ResolveTeamIDs(ctx context.Context, managerID uuid.UUID) (map[uuid.UUID]bool, error)
	IsInReportingChain(ctx context.Context, managerID, employeeID uuid.UUID) (bool, error)
}

type orgService struct {
	EmployeeRepo repositories.EmployeeRepository
}

func NewOrgService(employeeRepo repositories.EmployeeRepository) OrgService {
	return &orgService{EmployeeRepo: employeeRepo}
}

// ResolveTeamIDs returns every employee ID transitively reporting to
// managerID (including managerID itself), via BFS over the org hierarchy.
func (s *orgService) ResolveTeamIDs(ctx context.Context, managerID uuid.UUID) (map[uuid.UUID]bool, error) {
	hierarchy, err := s.EmployeeRepo.GetOrgHierarchyMap(ctx)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to resolve team hierarchy")
	}

	visited := map[uuid.UUID]bool{managerID: true}
	queue := []uuid.UUID{managerID}

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		for _, reportID := range hierarchy[current] {
			if visited[reportID] {
				continue
			}
			visited[reportID] = true
			queue = append(queue, reportID)
		}
	}
	return visited, nil
}

func (s *orgService) IsInReportingChain(ctx context.Context, managerID, employeeID uuid.UUID) (bool, error) {
	team, err := s.ResolveTeamIDs(ctx, managerID)
	if err != nil {
		return false, err
	}
	return team[employeeID], nil
}
