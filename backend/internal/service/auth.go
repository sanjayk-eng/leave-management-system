package service

import (
	"fmt"
	"net/http"

	"github.com/Zenithive/LeaveManagementSystem/internal/models"
	"github.com/Zenithive/LeaveManagementSystem/internal/repositories"
	"github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/Zenithive/LeaveManagementSystem/pkg/security"
	googleverify "github.com/Zenithive/LeaveManagementSystem/pkg/security"
)

// LoginResult is the data returned after a successful login of any kind.

type AuthService interface {
	Login(input *models.LoginInput) (*LoginResult, error)
}
type LoginResult struct {
	Token string
	ID    string
	Email string
	Role  string
}

// Service handles authentication logic.
type Service struct {
	repo      *repositories.Repository
	secretKey string
}

// New creates a new auth Service.
func New(repo *repositories.Repository, secretKey string) AuthService {
	return &Service{
		repo:      repo,
		secretKey: secretKey,
	}
}

func (s *Service) Login(input *models.LoginInput) (*LoginResult, error) {

	var result *LoginResult
	var err error
	switch input.Provider {
	case models.ProviderLocal:
		result, err = s.localLogin(input.Email, input.Password)
	case models.ProviderGoogle:
		result, err = s.googleLogin(input.Token)
	default:
		errors.CustomErr(http.StatusBadRequest, "unsupported provider: use 'local' or 'google'")
	}
	return result, err
}

// handleLocalLogin performs email + password authentication.
func (s *Service) localLogin(email, password string) (*LoginResult, error) {
	if email == "" || password == "" {
		return nil, errors.CustomErr(http.StatusBadRequest, "email and password are required")
	}

	emp, err := s.repo.GetEmployeeByEmail(email)
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, "This Email is not registered with organization please contact your admin")
	}

	if !security.CheckPassword(password, emp.Password) {
		return nil, errors.CustomErr(http.StatusBadRequest, "invalid passwrod")
	}

	if emp.Status == "deactive" {
		return nil, errors.CustomErr(http.StatusForbidden, "Access denied: account deactivated")
	}

	return s.issueToken(emp.ID, emp.Email, emp.Role)

}

// handleGoogleLogin performs Google OAuth bypass authentication.
func (s *Service) googleLogin(accessToken string) (*LoginResult, error) {
	if accessToken == "" {
		return nil, errors.CustomErr(http.StatusBadRequest, "token is required for Google login")
	}

	userInfo, err := googleverify.VerifyAccessToken(accessToken)
	if err != nil {
		return nil, errors.CustomErr(http.StatusForbidden, err.Error())
	}

	emp, err := s.repo.GetEmployeeByEmail(userInfo.Email)
	if err != nil {
		return nil, errors.CustomErr(http.StatusBadRequest, "This Email is not registered with organization please contact your admin")
	}

	if emp.Status == "deactive" {
		return nil, errors.CustomErr(http.StatusForbidden, "Access denied: account deactivated")
	}
	return s.issueToken(emp.ID, emp.Email, emp.Role)

}

// issueToken generates a JWT for the given employee and returns LoginResult.
func (s *Service) issueToken(id, email, role string) (*LoginResult, error) {
	token, err := security.GenerateToken(id, role, s.secretKey)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token")
	}

	return &LoginResult{
		Token: token,
		ID:    id,
		Email: email,
		Role:  role,
	}, nil
}
