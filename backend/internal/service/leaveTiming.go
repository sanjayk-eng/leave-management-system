package service

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
)

type LeaveTimingService interface {
	GetAll(ctx context.Context) ([]models.LeaveTimingResponse, error)
	GetByID(ctx context.Context, id int) (*models.LeaveTimingResponse, error)
	Update(ctx context.Context, id int, timing string) error
}

type leaveTimingService struct {
	Repo repositories.LeaveTimingRepository
}

func NewLeaveTimingService(repo repositories.LeaveTimingRepository) LeaveTimingService {
	return &leaveTimingService{Repo: repo}
}

func (s *leaveTimingService) GetAll(ctx context.Context) ([]models.LeaveTimingResponse, error) {
	data, err := s.Repo.GetAll(ctx)
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch leave timing")
	}
	if data == nil {
		data = []models.LeaveTimingResponse{}
	}
	return data, nil
}

func (s *leaveTimingService) GetByID(ctx context.Context, id int) (*models.LeaveTimingResponse, error) {
	data, err := s.Repo.GetByID(ctx, id)
	if err == sql.ErrNoRows {
		return nil, errors.CustomErr(http.StatusNotFound, "leave timing not found")
	}
	if err != nil {
		return nil, errors.CustomErr(http.StatusInternalServerError, "failed to fetch leave timing")
	}
	return data, nil
}

func (s *leaveTimingService) Update(ctx context.Context, id int, timing string) error {
	err := s.Repo.Update(ctx, id, timing)
	if err == sql.ErrNoRows {
		return errors.CustomErr(http.StatusNotFound, "leave timing not found")
	}
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to update leave timing")
	}
	return nil
}
