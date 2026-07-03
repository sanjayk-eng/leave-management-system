package models

// -------------------Login input-----------------------

// AuthProvider represents the login method.
type AuthProvider string

const (
	ProviderLocal  AuthProvider = "local"
	ProviderGoogle AuthProvider = "google"
)

type LoginInput struct {
	Provider AuthProvider `json:"provider"` // "local" | "google"  (defaults to "local" if empty)
	Email    string       `json:"email"`    // required for local
	Password string       `json:"password"` // required for local
	Token    string       `json:"token"`    // required for google (access_token from Google OAuth)
}
