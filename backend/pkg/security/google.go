package security

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const googleUserInfoURL = "https://www.googleapis.com/oauth2/v3/userinfo"

type UserInfo struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func VerifyAccessToken(accessToken string) (*UserInfo, error) {
	req, err := http.NewRequest(http.MethodGet, googleUserInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("google: failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("google: userinfo request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google: userinfo returned %d: %s", resp.StatusCode, string(body))
	}

	var info UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("google: failed to decode userinfo: %w", err)
	}
	if !info.EmailVerified {
		return nil, fmt.Errorf("google: email %s is not verified", info.Email)
	}

	if info.Email == "" {
		return nil, fmt.Errorf("google: userinfo returned empty email")
	}

	return &info, nil
}
