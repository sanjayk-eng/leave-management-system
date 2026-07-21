package audit

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// Service interface
// ─────────────────────────────────────────────────────────────────────────────

// Service is the only interface business services depend on for audit logging.
// Log() returns immediately — the INSERT happens asynchronously on a background
// worker. Reads (GetActivity) go straight to the repository and never touch the
// write channel.
type Service interface {
	// Log enqueues an audit entry for async persistence.
	// It NEVER blocks the caller. If the buffer is full the entry is dropped
	// and a warning is emitted — back-pressure protection, same as NotificationSvc.
	Log(entry AuditEntry)

	// GetActivity returns a paginated, filtered read-side feed.
	// Reads bypass the async channel and hit the repository directly.
	GetActivity(ctx context.Context, filter ActivityFilter) ([]ActivityEntry, int, error)

	// Start launches the background worker pool. Call once at startup.
	Start(ctx context.Context)

	// Stop drains in-flight entries and shuts down workers gracefully.
	Stop()
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

// Config controls the worker pool behaviour.
type Config struct {
	// Workers is the number of concurrent INSERT goroutines.
	// Default: 2. Audit writes are lower volume than notifications.
	Workers int

	// BufferSize is the capacity of the entry channel.
	// Default: 512. Entries beyond this are dropped with a warning.
	BufferSize int
}

// DefaultConfig returns sensible production defaults.
func DefaultConfig() Config {
	return Config{
		Workers:    2,
		BufferSize: 512,
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Concrete implementation
// ─────────────────────────────────────────────────────────────────────────────

type dispatcher struct {
	repo   Repository
	ch     chan AuditEntry
	cfg    Config
	logger *slog.Logger
	wg     sync.WaitGroup
	once   sync.Once
}

// NewService constructs a Service. Call Start() before the first Log() call.
func NewService(repo Repository, cfg Config, logger *slog.Logger) Service {
	if cfg.Workers <= 0 {
		cfg.Workers = 2
	}
	if cfg.BufferSize <= 0 {
		cfg.BufferSize = 512
	}
	return &dispatcher{
		repo:   repo,
		ch:     make(chan AuditEntry, cfg.BufferSize),
		cfg:    cfg,
		logger: logger,
	}
}

// Log validates the entry, generates the description if absent, and enqueues.
// It returns immediately; the caller is never blocked by DB write capacity.
func (d *dispatcher) Log(entry AuditEntry) {
	// Validate — a missing resource or actor is not audit-grade.
	if err := entry.Validate(); err != nil {
		d.logger.Error("audit: invalid entry dropped — fix the caller",
			"error", err.Error(),
			"component", entry.Component,
			"action", entry.Action,
		)
		return
	}

	// Generate description at enqueue time so it is ready for the worker.
	if entry.Description == "" {
		entry.Description = BuildDescription(&entry)
	}

	select {
	case d.ch <- entry:
		d.logger.Debug("audit: entry enqueued",
			"component", entry.Component,
			"action", entry.Action,
		)
	default:
		// Buffer full — drop and alert. A dropped audit entry must be observable.
		d.logger.Error("audit: channel full, entry DROPPED — increase BufferSize or reduce throughput",
			"component", entry.Component,
			"action", entry.Action,
			"actor_id", entry.ActorID,
			"resource_id", entry.ResourceID,
			"buffer_size", d.cfg.BufferSize,
		)
	}
}

// GetActivity reads directly from the repository — never touches the write channel.
func (d *dispatcher) GetActivity(ctx context.Context, filter ActivityFilter) ([]ActivityEntry, int, error) {
	return d.repo.GetActivity(ctx, filter)
}

// Start launches cfg.Workers goroutines to drain the channel.
func (d *dispatcher) Start(ctx context.Context) {
	d.logger.Info("audit: starting worker pool", "workers", d.cfg.Workers)
	for i := range d.cfg.Workers {
		d.wg.Add(1)
		go d.worker(ctx, i+1)
	}
}

// Stop closes the channel so workers drain remaining entries, then waits.
func (d *dispatcher) Stop() {
	d.once.Do(func() {
		d.logger.Info("audit: shutting down worker pool")
		close(d.ch)

		done := make(chan struct{})
		go func() {
			d.wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			d.logger.Info("audit: all workers exited cleanly")
		case <-time.After(30 * time.Second):
			d.logger.Warn("audit: shutdown timeout — some entries may be lost")
		}
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────────────────────────────────────

func (d *dispatcher) worker(ctx context.Context, id int) {
	defer d.wg.Done()
	d.logger.Debug("audit: worker started", "id", id)

	for entry := range d.ch {
		// Honour context cancellation between entries.
		select {
		case <-ctx.Done():
			d.logger.Warn("audit: worker context cancelled, exiting", "id", id)
			return
		default:
		}

		d.persist(ctx, entry, id)
	}

	d.logger.Debug("audit: worker exited", "id", id)
}

// persist attempts the INSERT. A DB error must never bubble up to the caller —
// log it and move on. But it must be observable (Error level, not just Debug).
func (d *dispatcher) persist(ctx context.Context, entry AuditEntry, workerID int) {
	if err := d.repo.Create(ctx, &entry); err != nil {
		// Observable failure — use Error so alerting picks it up.
		d.logger.Error("audit: INSERT failed — entry lost",
			"worker", workerID,
			"component", entry.Component,
			"action", entry.Action,
			"actor_id", entry.ActorID,
			"resource_id", entry.ResourceID,
			"error", err.Error(),
		)
	}
}
