package service

import (
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
)

type Hrbc interface {
	HasPriorityAllow(actorRoleID, targetRoleID int) error
	HasPriorityAllowByType(actorRoleID int, targetRoleType string) error
	IsHighestPriority(actorRoleID int) (bool, error)
}

type hrbc struct {
	roleRepo repositories.RoleRepository
}

func NewHrbc(roleRepo repositories.RoleRepository) Hrbc {
	return &hrbc{
		roleRepo: roleRepo,
	}
}

func (h *hrbc) HasPriorityAllow(actorRoleID, targetRoleID int) error {
	targetPriority, err := h.roleRepo.GetRolePriority(targetRoleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch target role")
	}

	return h.validatePriority(actorRoleID, targetPriority)
}

func (h *hrbc) HasPriorityAllowByType(actorRoleID int, targetRoleType string) error {
	targetPriority, err := h.roleRepo.GetRolePriorityByType(targetRoleType)
	if err != nil {
		return errors.CustomErr(http.StatusBadRequest, "invalid role")
	}

	return h.validatePriority(actorRoleID, targetPriority)
}

func (h *hrbc) IsHighestPriority(actorRoleID int) (bool, error) {
	actorPriority, err := h.roleRepo.GetRolePriority(actorRoleID)
	if err != nil {
		return false, errors.CustomErr(http.StatusInternalServerError, "failed to fetch actor role")
	}

	maxPriority, err := h.roleRepo.GetMaxRolePriority()
	if err != nil {
		return false, errors.CustomErr(http.StatusInternalServerError, "failed to fetch max role priority")
	}

	return actorPriority >= maxPriority, nil
}

func (h *hrbc) validatePriority(actorRoleID, targetPriority int) error {
	actorPriority, err := h.roleRepo.GetRolePriority(actorRoleID)
	if err != nil {
		return errors.CustomErr(http.StatusInternalServerError, "failed to fetch actor role")
	}

	if actorPriority <= targetPriority {
		return errors.CustomErr(http.StatusForbidden, "insufficient authority")
	}
	return nil
}
