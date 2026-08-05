// pkg/ratelimit/ratelimit.go
//
// Reusable, configurable per-IP token-bucket rate limiter.
//
// All limiting is per client IP — no shared global bucket.
// Each IP gets its own independent token bucket, so one client
// being throttled never affects any other client.
//
// Usage:
//
//	// Auth endpoints — strict, brute-force resistant
//	auth.POST("/login", ratelimit.NewPerIP(ratelimit.DefaultAuthConfig()).Middleware(), h.Login)
//
//	// All other API routes — 10 req/sec per IP
//	group.Use(ratelimit.NewPerIP(ratelimit.DefaultAPIConfig()).Middleware())
package ratelimit

import (
	"net/http"
	"sync"
	"time"

	apierrors "github.com/Zenithive/LeaveManagementSystem/pkg/common/errors"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

// Config holds the parameters for a PerIP limiter instance.
type Config struct {
	// Rate is tokens added per second.
	// Use rate.Limit(n) for n req/sec, or rate.Every(d) for one token per duration.
	Rate rate.Limit

	// Burst is the maximum number of tokens the bucket can hold.
	// Allows short bursts above the sustained rate.
	Burst int

	// TTL controls how long an idle IP entry lives before being evicted.
	// Prevents unbounded memory growth for large numbers of IPs.
	TTL time.Duration

	// Message is the 429 error message returned to the client.
	Message string
}

// DefaultAuthConfig returns a strict per-IP limit for login endpoints.
// ~10 requests/minute (one token every 6 s), burst of 5.
// Tight enough to stop brute-force without blocking normal use.
func DefaultAuthConfig() Config {
	return Config{
		Rate:    rate.Every(6 * time.Second), // ≈10 req/min
		Burst:   5,
		TTL:     10 * time.Minute,
		Message: "too many login attempts, please try again later",
	}
}

// DefaultAPIConfig returns a per-IP limit for all authenticated API routes.
// 10 requests/second, burst of 10.
func DefaultAPIConfig() Config {
	return Config{
		Rate:    rate.Limit(10), // 10 req/sec
		Burst:   10,
		TTL:     5 * time.Minute,
		Message: "too many requests, please slow down",
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PerIP limiter
// ─────────────────────────────────────────────────────────────────────────────

// entry holds a single IP's token bucket and a last-seen timestamp for TTL eviction.
type entry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// PerIP maintains one independent rate limiter per client IP address.
// Stale entries are evicted automatically in the background to prevent
// unbounded memory growth.
// Safe for concurrent use.
type PerIP struct {
	mu      sync.Mutex
	entries map[string]*entry
	cfg     Config
}

// NewPerIP creates a PerIP limiter from cfg and starts the background
// cleanup goroutine. The returned *PerIP is safe to share across goroutines.
func NewPerIP(cfg Config) *PerIP {
	p := &PerIP{
		entries: make(map[string]*entry),
		cfg:     cfg,
	}
	go p.cleanup()
	return p
}

// getLimiter returns (or lazily creates) the rate.Limiter for the given IP.
func (p *PerIP) getLimiter(ip string) *rate.Limiter {
	p.mu.Lock()
	defer p.mu.Unlock()

	e, ok := p.entries[ip]
	if !ok {
		e = &entry{
			limiter: rate.NewLimiter(p.cfg.Rate, p.cfg.Burst),
		}
		p.entries[ip] = e
	}
	e.lastSeen = time.Now()
	return e.limiter
}

// cleanup runs forever, evicting IPs not seen within cfg.TTL.
func (p *PerIP) cleanup() {
	ttl := p.cfg.TTL
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}

	ticker := time.NewTicker(ttl)
	defer ticker.Stop()

	for range ticker.C {
		p.mu.Lock()
		for ip, e := range p.entries {
			if time.Since(e.lastSeen) > ttl {
				delete(p.entries, ip)
			}
		}
		p.mu.Unlock()
	}
}

// Middleware returns a Gin handler that enforces the per-IP limit.
// Responds with HTTP 429 and a JSON error when the bucket is empty.
func (p *PerIP) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !p.getLimiter(ip).Allow() {
			apierrors.RespondWithError(c, http.StatusTooManyRequests, p.cfg.Message)
			c.Abort()
			return
		}
		c.Next()
	}
}
