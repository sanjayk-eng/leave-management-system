/**
 * leaveActionUtils.ts
 * ───────────────────
 * Pure, role-agnostic helpers that decide which leave actions are available
 * for a given (leave, currentUserRole) pair.
 *
 * All logic is driven by:
 *   - leave.status        (the overall leave state)
 *   - leave.approval_log  (per-stage, per-role WAITING entries from the backend)
 *   - currentUserRole     (the logged-in user's role string)
 *
 * NO role strings are hardcoded here. The functions work with whatever role
 * the backend sends, so adding a new approver role (e.g. "TEAM_LEAD") requires
 * zero frontend changes.
 */

import type { ApprovalLogEntry, LeaveResponse } from '@/services/leaveService';

// ─── Terminal states — no action is ever possible ────────────────────────────

const TERMINAL_STATUSES = new Set(['CANCELLED', 'WITHDRAWN', 'REJECTED']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise any status string to UPPER_CASE */
const up = (s: string) => s.toUpperCase();

/**
 * Returns true if the given role has a WAITING entry in the approval_log,
 * meaning it is that role's turn to act.
 */
export function isRoleWaiting(
  log: ApprovalLogEntry[] | undefined,
  role: string,
): boolean {
  if (!log || log.length === 0) return false;
  return log.some(
    (entry) =>
      entry.approver_role.toUpperCase() === role.toUpperCase() &&
      entry.state === 'WAITING',
  );
}

// ─── Approve / Reject ────────────────────────────────────────────────────────

/**
 * Can `role` approve or reject this leave?
 *
 * Rule: the leave must not be in a terminal state, AND the role must have
 * a WAITING entry in approval_log (it's their turn in the flow).
 *
 * If the leave has no approval_log at all (legacy / simple flow) the caller
 * should fall back to its own logic — this function returns false.
 */
export function canApproveOrReject(
  leave: LeaveResponse,
  role: string,
): boolean {
  const status = up(leave.status);
  if (TERMINAL_STATUSES.has(status)) return false;
  if (status === 'APPROVED' || status === 'WITHDRAWAL_PENDING') return false;
  return isRoleWaiting(leave.approval_log, role);
}

// ─── Withdraw (on an APPROVED leave) ─────────────────────────────────────────

/**
 * Can `role` initiate or finalise a withdraw on this leave?
 *
 * There are two distinct cases:
 *
 * 1. APPROVED leave
 *    → any role that has a WAITING entry in the approval_log for the
 *      WITHDRAWAL stage (backend puts a WAITING entry when withdrawal starts)
 *      OR — if the backend has not yet added a withdrawal-stage log —
 *      the role had an APPROVED entry in the log (they approved it, so they
 *      can withdraw it).
 *    → also true when there is NO approval_log (simple / legacy flow) and
 *      the caller opts in via `allowWithoutLog`.
 *
 * 2. WITHDRAWAL_PENDING leave
 *    → the role must have a WAITING entry (it's their turn to finalise).
 *
 * NOTE: CANCELLED leaves → never.
 */
export function canWithdraw(
  leave: LeaveResponse,
  role: string,
): boolean {
  const status = up(leave.status);

  if (TERMINAL_STATUSES.has(status)) return false;

  // APPROVED → always show Withdraw button (any role on the approvals page can act)
  if (status === 'APPROVED') return true;

  // WITHDRAWAL_PENDING → only show if this role has a WAITING entry in approval_log
  if (status === 'WITHDRAWAL_PENDING') {
    return isRoleWaiting(leave.approval_log, role);
  }

  return false;
}

// ─── Cancel (employee's own page) ────────────────────────────────────────────

/**
 * Can the employee cancel their own leave?
 * Only while the leave is still in a pre-approved, non-terminal state.
 * (Edit is allowed under the same conditions.)
 */
export function canEmployeeCancel(leave: LeaveResponse): boolean {
  const status = up(leave.status);
  if (TERMINAL_STATUSES.has(status)) return false;
  // Once fully APPROVED the employee cannot self-cancel (must go through withdraw flow)
  return status === 'PENDING';
}

// ─── Derive a human-readable label for the withdraw button ───────────────────

/**
 * Returns the button label for a withdraw action given the leave status.
 * "Finalize Withdrawal" when a withdrawal is already pending,
 * otherwise a generic "Withdraw" or "Request Withdrawal" based on whether
 * the role had a terminal-level approval in the log.
 *
 * Pass `isFinalApprover = true` when the role is the last stage in the flow
 * so the label reads "Withdraw" instead of "Request Withdrawal".
 */
export function withdrawLabel(
  leave: LeaveResponse,
  role: string,
): string {
  const status = up(leave.status);
  if (status === 'WITHDRAWAL_PENDING') return 'Finalize Withdrawal';

  // Check if this role was the FINAL approver in the log (approved at last stage)
  const log = leave.approval_log ?? [];
  const stages = [...new Set(log.map((e) => e.stage_no))].sort((a, b) => a - b);
  const lastStage = stages[stages.length - 1] ?? -1;
  const roleFinalApproved = log.some(
    (e) =>
      e.stage_no === lastStage &&
      e.approver_role.toUpperCase() === role.toUpperCase() &&
      e.state === 'APPROVED',
  );

  return roleFinalApproved ? 'Withdraw' : 'Request Withdrawal';
}
