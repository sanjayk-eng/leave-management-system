package audit

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/robfig/cron/v3"
)

// ─────────────────────────────────────────────────────────────────────────────
// PartitionCron — keeps monthly audit partitions pre-created.
//
// Running the partition creation at the DB level before the month starts means
// Postgres never needs to create a partition on the hot INSERT path.
//
// The cron fires on the 25th of every month at 02:00 (server time) and
// creates the partition for the NEXT month if it doesn't already exist.
//
// Wire in main.go alongside the birthday and leave-accrual crons:
//
//	partitionCron := audit.NewPartitionCron(db, logger)
//	partitionCron.Start()
//	defer partitionCron.Stop()
// ─────────────────────────────────────────────────────────────────────────────

// PartitionCron manages the lifecycle of the partition maintenance job.
type PartitionCron struct {
	db     *sqlx.DB
	logger *slog.Logger
	c      *cron.Cron
}

// NewPartitionCron constructs the cron. Call Start() to activate it.
func NewPartitionCron(db *sqlx.DB, logger *slog.Logger) *PartitionCron {
	return &PartitionCron{
		db:     db,
		logger: logger,
		c:      cron.New(),
	}
}

// Start schedules the job. It also runs EnsurePartitions immediately so the
// current month (and next month) are always covered on boot.
func (p *PartitionCron) Start() {
	// Run once at startup — covers the case where the server restarts mid-month.
	ctx := context.Background()
	if err := p.EnsurePartitions(ctx); err != nil {
		p.logger.Error("audit: startup partition creation failed", "error", err)
	}

	// Schedule: 25th of every month at 02:00
	_, err := p.c.AddFunc("0 2 25 * *", func() {
		if err := p.EnsurePartitions(context.Background()); err != nil {
			p.logger.Error("audit: scheduled partition creation failed", "error", err)
		}
	})
	if err != nil {
		p.logger.Error("audit: failed to register partition cron", "error", err)
		return
	}

	p.c.Start()
	p.logger.Info("audit: partition cron started (fires on 25th of each month at 02:00)")
}

// Stop halts the cron scheduler.
func (p *PartitionCron) Stop() {
	p.c.Stop()
}

// EnsurePartitions creates partitions for the current month and the next two
// months if they do not already exist. Safe to call multiple times (idempotent).
func (p *PartitionCron) EnsurePartitions(ctx context.Context) error {
	now := time.Now().UTC()
	for i := range 3 { // current + 2 ahead
		t := now.AddDate(0, i, 0)
		if err := p.createPartitionIfNotExists(ctx, t.Year(), int(t.Month())); err != nil {
			return err
		}
	}
	return nil
}

// createPartitionIfNotExists issues a CREATE TABLE … PARTITION OF … IF NOT EXISTS
// for the given year/month.
func (p *PartitionCron) createPartitionIfNotExists(ctx context.Context, year, month int) error {
	partName := fmt.Sprintf("tbl_audit_log_%04d_%02d", year, month)

	start := fmt.Sprintf("%04d-%02d-01", year, month)
	// End is the first day of the following month.
	endYear, endMonth := year, month+1
	if endMonth > 12 {
		endMonth = 1
		endYear++
	}
	end := fmt.Sprintf("%04d-%02d-01", endYear, endMonth)

	sql := fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s
			PARTITION OF tbl_audit_log
			FOR VALUES FROM ('%s') TO ('%s')
	`, partName, start, end)

	if _, err := p.db.ExecContext(ctx, sql); err != nil {
		return fmt.Errorf("audit: create partition %s: %w", partName, err)
	}

	p.logger.Info("audit: partition ensured", "partition", partName, "from", start, "to", end)
	return nil
}
