/**
 * ApprovalLogDrawer — Delivery-tracker style approval timeline
 * ─────────────────────────────────────────────────────────────
 *
 * Connection logic (N stages):
 *   Stage N — NO WAITING  → green line to N+1           ✅
 *   Stage N — ANY WAITING → no line (blocked)           ❌
 *   All stages connected  → line to terminal (complete) ✅
 *
 * FlowState:
 *   'done'      → has APPROVED (± SKIPPED) — green node + green line    ✅
 *   'skipped'   → ALL entries SKIPPED, none approved/rejected/waiting
 *                 → grey node + grey solid line (flow passed, was bypassed) ✅
 *   'active'    → has WAITING — yellow pulse, NO line below              ❌
 *   'rejected'  → has REJECTED — red node/line, flow STILL connects      ✅
 *   'withdrawn' → terminal-level: leave was WITHDRAWN
 *   'unreached' → every stage after the first 'active' stage
 */
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, XCircle, Clock, Minus,
  User, Calendar, RotateCcw, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalLogEntry, LeaveResponse } from '@/services/leaveService';

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowState      = 'done' | 'skipped' | 'active' | 'rejected' | 'withdrawn' | 'unreached';
type TerminalCat    = 'success' | 'withdrawn' | 'withdrawal_pending' | 'error' | 'pending';
type EntryState     = 'APPROVED' | 'REJECTED' | 'WAITING' | 'SKIPPED' | 'WITHDRAWN';
type SegmentState   = Exclude<FlowState, 'active'>;

// ─── Theme tokens — single source of truth ────────────────────────────────────
// Each FlowState maps to { border, dot } colours used by every node / label.

interface FlowTheme {
  border:  string;  // border-* class
  dot:     string;  // bg-*     class  (inner dot of stage node)
  label:   string;  // text-*   class  (stage title)
}

const FLOW_THEME: Record<FlowState, FlowTheme> = {
  done:      { border: 'border-green-500',  dot: 'bg-green-500',  label: 'text-green-700  dark:text-green-400'  },
  skipped:   { border: 'border-gray-400',   dot: 'bg-gray-400',   label: 'text-gray-500   dark:text-gray-400'   },
  active:    { border: 'border-yellow-400', dot: 'bg-yellow-400', label: 'text-yellow-700 dark:text-yellow-400' },
  rejected:  { border: 'border-red-500',    dot: 'bg-red-500',    label: 'text-red-700    dark:text-red-400'    },
  withdrawn: { border: 'border-amber-500',  dot: 'bg-amber-500',  label: 'text-amber-700  dark:text-amber-400'  },
  unreached: { border: 'border-gray-300',   dot: 'bg-gray-300',   label: 'text-muted-foreground'                },
};

// ─── Entry-state styles — consolidated into one record ───────────────────────

interface EntryTheme {
  card:   string;
  text:   string;
  icon:   string;
  label:  string;
  Icon:   LucideIcon;
}

const ENTRY_THEME: Record<EntryState, EntryTheme> = {
  APPROVED: {
    card:  'bg-green-50  border-green-200  dark:bg-green-900/20  dark:border-green-800',
    text:  'text-green-700  dark:text-green-300',
    icon:  'text-green-500',
    label: 'Approved',
    Icon:  CheckCircle2,
  },
  REJECTED: {
    card:  'bg-red-50    border-red-200    dark:bg-red-900/20    dark:border-red-800',
    text:  'text-red-700    dark:text-red-300',
    icon:  'text-red-500',
    label: 'Rejected',
    Icon:  XCircle,
  },
  WAITING: {
    card:  'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    text:  'text-yellow-700 dark:text-yellow-300',
    icon:  'text-yellow-500 animate-pulse',
    label: 'Waiting',
    Icon:  Clock,
  },
  SKIPPED: {
    card:  'bg-muted/20  border-muted',
    text:  'text-muted-foreground',
    icon:  'text-gray-400',
    label: 'Skipped',
    Icon:  Minus,
  },
  WITHDRAWN: {
    card:  'bg-amber-50  border-amber-200  dark:bg-amber-900/20  dark:border-amber-800',
    text:  'text-amber-700  dark:text-amber-300',
    icon:  'text-amber-500',
    label: 'Withdrawn',
    Icon:  RotateCcw,
  },
};

// ─── Terminal-category styles ─────────────────────────────────────────────────

interface TerminalTheme {
  border:  string;
  icon:    string;
  label:   string;
  Icon:    LucideIcon;
}

const TERMINAL_THEME: Record<TerminalCat, TerminalTheme> = {
  success:            { border: 'border-green-500',  icon: 'text-green-500',  label: 'text-green-700  dark:text-green-300',  Icon: CheckCircle2 },
  withdrawn:          { border: 'border-amber-500',  icon: 'text-amber-500',  label: 'text-amber-700  dark:text-amber-300',  Icon: RotateCcw    },
  withdrawal_pending: { border: 'border-purple-500', icon: 'text-purple-500', label: 'text-purple-700 dark:text-purple-300', Icon: RotateCcw    },
  error:              { border: 'border-red-500',    icon: 'text-red-500',    label: 'text-red-700    dark:text-red-300',    Icon: XCircle      },
  pending:            { border: 'border-yellow-400', icon: 'text-yellow-400', label: 'text-yellow-700 dark:text-yellow-300', Icon: Clock        },
};

// ─── Role pill colours ────────────────────────────────────────────────────────

const ROLE_PILL: Record<string, string> = {
  SUPERADMIN: 'bg-red-100    text-red-800    border-red-200',
  ADMIN:      'bg-blue-100   text-blue-800   border-blue-200',
  HR:         'bg-purple-100 text-purple-800 border-purple-200',
  MANAGER:    'bg-amber-100  text-amber-800  border-amber-200',
};

// ─── Leave status badge colours ───────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  APPROVED:           'bg-green-600  text-white',
  REJECTED:           'bg-red-600    text-white',
  PENDING:            'bg-yellow-500 text-white',
  CANCELLED:          'bg-orange-500 text-white',
  WITHDRAWN:          'bg-amber-600  text-white',
  WITHDRAWAL_PENDING: 'bg-purple-600 text-white',
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Group log entries by stage_no, ascending */
function groupByStage(log: ApprovalLogEntry[]): [number, ApprovalLogEntry[]][] {
  const map = new Map<number, ApprovalLogEntry[]>();
  for (const e of log) {
    if (!map.has(e.stage_no)) map.set(e.stage_no, []);
    map.get(e.stage_no)!.push(e);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b);
}

/** ISO → readable locale string */
function fmt(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** Single-date or range string for leave header */
function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-IN', opts);
  const e = new Date(end).toLocaleDateString('en-IN', opts);
  return start === end ? s : `${s} — ${e}`;
}

/** Resolve FlowState for a single stage from its entries */
function resolveStageState(entries: ApprovalLogEntry[]): FlowState {
  const states = entries.map(e => e.state);
  if (states.some(s => s === 'WAITING'))   return 'active';    // pending → blocks rail
  if (states.some(s => s === 'REJECTED'))  return 'rejected';  // rejected → red, rail continues
  if (states.some(s => s === 'WITHDRAWN')) return 'withdrawn'; // withdrew at this stage → amber
  if (states.some(s => s === 'APPROVED'))  return 'done';      // at least one approved → green
  return 'skipped';                                            // all SKIPPED → grey
}

/**
 * Walk all N stages in order.
 * Rule: ONLY 'active' (has WAITING) blocks the rail.
 *   - 'done'      → no WAITING → line continues to next stage ✅
 *   - 'rejected'  → no WAITING → line continues to next stage ✅
 *   - 'withdrawn' → no WAITING → line continues to next stage ✅
 *   - 'active'    → has WAITING → all subsequent = 'unreached' ❌
 * The final REJECTED/APPROVED/WITHDRAWN outcome comes from leave.status.
 */
function buildStageStates(stages: [number, ApprovalLogEntry[]][]): FlowState[] {
  const out: FlowState[] = [];
  let blocked = false;
  for (const [, entries] of stages) {
    if (blocked) { out.push('unreached'); continue; }
    const state = resolveStageState(entries);
    out.push(state);
    if (state === 'active') blocked = true; // ONLY waiting blocks
  }
  return out;
}

/** A line segment is drawn below a stage only when it has no blocker */
function shouldDrawSegment(state: FlowState): boolean {
  return state === 'done' || state === 'skipped' || state === 'rejected' || state === 'withdrawn';
}

/**
 * Derive the SegmentState for the rail below a given stage.
 * Withdrawn stages get the amber-dashed style.
 */
function toSegmentState(stageState: FlowState, drawLine: boolean): SegmentState {
  if (stageState === 'rejected')  return 'rejected';
  if (stageState === 'withdrawn') return 'withdrawn';
  if (stageState === 'skipped')   return 'skipped';   // grey solid — bypassed stage
  return drawLine ? 'done' : 'unreached';
}

/** Map leaf status → TerminalCat for theme lookup */
function resolveTerminalCat(status: string): TerminalCat {
  const s = status.toUpperCase();
  if (s === 'APPROVED')                      return 'success';
  if (s === 'WITHDRAWN')                     return 'withdrawn';
  if (s === 'WITHDRAWAL_PENDING')            return 'withdrawal_pending';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'error';
  return 'pending';
}

/**
 * What status string should drive the terminal label colour?
 * If all stages are done and the leave is WITHDRAWN, show WITHDRAWN (amber).
 * If the leave is WITHDRAWAL_PENDING, propagate that regardless of stage state.
 */
function resolveTerminalStatus(stageStates: FlowState[], leaveStatus: string): string {
  const s = leaveStatus.toUpperCase();
  if (s === 'WITHDRAWAL_PENDING') return 'WITHDRAWAL_PENDING';
  const allDone     = stageStates.every(st => st === 'done' || st === 'skipped' || st === 'withdrawn');
  const anyRejected = stageStates.some(st => st === 'rejected');
  if (s === 'WITHDRAWN')          return 'WITHDRAWN';
  if (allDone)                    return s;
  if (anyRejected)                return 'REJECTED';
  return 'PENDING';
}

/** CSS background for each segment state (inline so Tailwind won't purge) */
function segmentBackground(state: SegmentState): string {
  const BACKGROUNDS: Record<SegmentState, string> = {
    done:      'linear-gradient(to bottom, #4ade80, #4ade80)',           // solid green-400
    rejected:  'linear-gradient(to bottom, #f87171, #f87171)',           // solid red-400
    skipped:   'linear-gradient(to bottom, #9ca3af, #9ca3af)',           // solid gray-400 (bypassed)
    withdrawn: 'repeating-linear-gradient(to bottom, #f59e0b 0, #f59e0b 5px, transparent 5px, transparent 10px)', // amber dashed
    unreached: 'repeating-linear-gradient(to bottom, #d1d5db 0, #d1d5db 4px, transparent 4px, transparent 8px)', // grey dashed
  };
  return BACKGROUNDS[state];
}

/** Height (px) for the rail segment below a stage */
const CARD_HEIGHT_PX  = 72;
const MIN_SEGMENT_PX  = 64;
function segmentHeightPx(entryCount: number): number {
  return Math.max(MIN_SEGMENT_PX, entryCount * CARD_HEIGHT_PX);
}

/** Resolve ENTRY_THEME with a safe fallback to SKIPPED */
function entryTheme(state: string): EntryTheme {
  return ENTRY_THEME[state as EntryState] ?? ENTRY_THEME.SKIPPED;
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

/** Rapido-style amber pulse ring — shown on the active / pending node */
const RipplePulse = () => (
  <>
    <div className="absolute w-9 h-9 rounded-full bg-yellow-400/20 animate-ping" />
    <div className="absolute w-7 h-7 rounded-full bg-yellow-400/30" />
  </>
);

// ─── Rail segment ─────────────────────────────────────────────────────────────
// Uses inline `background` so Tailwind purge never strips dynamic colour values.

const RailSegment = ({ state, heightPx }: { state: SegmentState; heightPx: number }) => (
  <div
    className="w-0.5 mx-auto"
    style={{ height: heightPx, background: segmentBackground(state) }}
  />
);

// ─── Stage dot node ───────────────────────────────────────────────────────────

const StageNode = ({ state }: { state: FlowState }) => {
  const { border, dot } = FLOW_THEME[state];
  return (
    <div className="relative flex items-center justify-center">
      {state === 'active' && <RipplePulse />}
      <div className={cn(
        'relative flex items-center justify-center w-6 h-6 rounded-full border-2 z-10 bg-white dark:bg-background',
        border,
      )}>
        <div className={cn('w-2.5 h-2.5 rounded-full', dot)} />
      </div>
    </div>
  );
};

// ─── Terminal node ────────────────────────────────────────────────────────────

const TerminalNode = ({ status }: { status: string }) => {
  const cat              = resolveTerminalCat(status);
  const { border, icon, Icon } = TERMINAL_THEME[cat];
  return (
    <div className="relative flex items-center justify-center">
      {cat === 'pending' && <RipplePulse />}
      <div className={cn(
        'relative flex items-center justify-center w-7 h-7 rounded-full border-2 z-10 bg-white dark:bg-background',
        border,
      )}>
        <Icon className={cn('h-4 w-4', icon)} />
      </div>
    </div>
  );
};

// ─── Entry card (single approver row inside a stage) ─────────────────────────

const EntryCard = ({ entry }: { entry: ApprovalLogEntry }) => {
  const theme = entryTheme(entry.state);
  const { card, text, icon, label, Icon: StateIcon } = theme;

  return (
    <div className={cn('p-2.5 rounded-lg border mb-2 last:mb-0', card)}>
      <div className="flex items-start gap-2">
        <StateIcon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', icon)} />

        <div className="flex-1 min-w-0">
          {/* Role pill + state label */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(
              'px-1.5 py-0 rounded text-[10px] font-bold border',
              ROLE_PILL[entry.approver_role] ?? 'bg-gray-100 text-gray-700 border-gray-200',
            )}>
              {entry.approver_role}
            </span>
            <span className={cn('text-[11px] font-semibold', text)}>{label}</span>
          </div>

          {/* Approver name */}
          {entry.approved_by_name && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
              <User className="h-2.5 w-2.5 shrink-0" />
              <span>{entry.approved_by_name}</span>
            </div>
          )}

          {/* Action timestamp */}
          {entry.action_at && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5 shrink-0" />
              <span>{fmt(entry.action_at)}</span>
            </div>
          )}

          {/* Waiting hint — shown only when no timestamp yet */}
          {entry.state === 'WAITING' && !entry.action_at && (
            <div className="flex items-center gap-1 text-[11px] text-yellow-600 mt-1">
              <Clock className="h-2.5 w-2.5 animate-pulse shrink-0" />
              <span>Awaiting action…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Leave header ─────────────────────────────────────────────────────────────

const LeaveHeader = ({ leave }: { leave: LeaveResponse }) => (
  <div className="space-y-2 pb-4 border-b mb-6">
    <div>
      <p className="font-bold text-base leading-tight">{leave.employee}</p>
      <p className="text-sm text-muted-foreground">{leave.leave_type}</p>
    </div>

    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Calendar className="h-3 w-3" />
      <span>{formatDateRange(leave.start_date, leave.end_date)}</span>
      <span>·</span>
      <span>{leave.days} day{leave.days !== 1 ? 's' : ''}</span>
      {leave.leave_timing && <><span>·</span><span>{leave.leave_timing}</span></>}
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Status</span>
      <Badge className={cn(
        'text-[11px] h-5',
        STATUS_BADGE[leave.status.toUpperCase()] ?? 'bg-gray-500 text-white',
      )}>
        {leave.status}
      </Badge>
      {leave.approval_name && (
        <span className="text-xs text-muted-foreground">by {leave.approval_name}</span>
      )}
    </div>
  </div>
);

// ─── Tracker ──────────────────────────────────────────────────────────────────

interface TrackerProps {
  stages:      [number, ApprovalLogEntry[]][];
  stageStates: FlowState[];
  leave:       LeaveResponse;
}

const Tracker = ({ stages, stageStates, leave }: TrackerProps) => {
  const terminalStatus = resolveTerminalStatus(stageStates, leave.status);
  const terminalTheme  = TERMINAL_THEME[resolveTerminalCat(terminalStatus)];

  return (
    <div className="relative">
      {stages.map(([stageNo, entries], idx) => {
        const state    = stageStates[idx];
        const drawLine = shouldDrawSegment(state);
        const segState = toSegmentState(state, drawLine);
        const heightPx = segmentHeightPx(entries.length);

        return (
          <div key={stageNo} className="flex items-start gap-4">
            {/* ── Left: node + vertical rail ── */}
            <div className="flex flex-col items-center w-6 shrink-0">
              <StageNode state={state} />
              {drawLine
                ? <RailSegment state={segState} heightPx={heightPx} />
                : <div style={{ height: heightPx }} />  /* spacer — no line */
              }
            </div>

            {/* ── Right: stage label + approver cards ── */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  'text-[11px] font-bold uppercase tracking-wider',
                  FLOW_THEME[state].label,
                )}>
                  Stage {stageNo}
                </span>
                {entries.length > 1 && (
                  <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0">
                    {entries.length} parallel
                  </span>
                )}
              </div>
              {entries.map((entry, i) => (
                <EntryCard key={`${stageNo}-${entry.approver_role}-${i}`} entry={entry} />
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Terminal node ── */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center w-6 shrink-0">
          <TerminalNode status={leave.status} />
        </div>
        <div className="flex-1 pt-0.5">
          <p className={cn('text-sm font-bold', terminalTheme.label)}>
            {leave.status}
          </p>
          {leave.approval_name && (
            <p className="text-xs text-muted-foreground">
              Final action by {leave.approval_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main exported component ──────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { leaveService } from '@/services/leaveService';
import { Loader2 } from 'lucide-react';

export interface ApprovalLogDrawerProps {
  leave:        LeaveResponse | null;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApprovalLogDrawer = ({ leave, open, onOpenChange }: ApprovalLogDrawerProps) => {
  const [fetchedLog, setFetchedLog] = useState<ApprovalLogEntry[] | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // If the leave has no embedded approval_log, fetch it from GET /leaves/log/?leave_id=<id>
  useEffect(() => {
    if (!open || !leave) {
      setFetchedLog(null);
      return;
    }
    const hasEmbedded = Array.isArray(leave.approval_log) && leave.approval_log.length > 0;
    if (hasEmbedded) {
      setFetchedLog(null);
      return;
    }
    setIsFetching(true);
    leaveService.getLeaveLog(leave.id)
      .then(res => setFetchedLog(res.approval_log ?? []))
      .catch(() => setFetchedLog([]))
      .finally(() => setIsFetching(false));
}, [open, leave]);

  if (!leave) return null;

  const log = (Array.isArray(leave.approval_log) && leave.approval_log.length > 0)
    ? leave.approval_log
    : (fetchedLog ?? []);

  const stages      = groupByStage(log);
  const stageStates = buildStageStates(stages);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0 overflow-hidden">
        <SheetDescription className="sr-only">
          Approval timeline for {leave.employee}
        </SheetDescription>

        {/* Fixed title bar */}
        <div className="px-6 pt-5 pb-4 shrink-0 border-b">
          <SheetHeader className="space-y-0">
            <SheetTitle className="text-lg font-bold">Approval Flow</SheetTitle>
          </SheetHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-10">
          <LeaveHeader leave={leave} />

          {isFetching ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading approval flow…</span>
            </div>
          ) : log.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No approval flow configured.</p>
            </div>
          ) : (
            <Tracker stages={stages} stageStates={stageStates} leave={leave} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
