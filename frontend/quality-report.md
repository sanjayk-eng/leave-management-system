# Code Quality Report

**Scope**: `src/` — full codebase review
**Date**: 2026-06-25
**Languages**: TypeScript, TSX (React)
**Files Reviewed**: ~30 key files across pages, components, hooks, services, contexts, and lib

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 3 |
| 🟡 WARNING | 12 |
| 🔵 SUGGESTION | 5 |

**Overall Health**: Needs Attention

The architecture is solid — clean service/hook separation, consistent optimistic updates with rollback, a well-structured permission system, and a thoughtful multi-stage approval-flow design. The three critical issues need immediate attention. The warnings are maintainability debt that will compound over time but won't cause immediate failures.

---

## Findings

### 🔴 CRITICAL

#### Security — Commented-out access control
- `src/components/LeaveTimingSettings.tsx:22–44` — The permission guard (`if (!hasPermission) return <AccessDenied />`) is fully commented out with the note `// Temporarily disable role check for debugging`. Every authenticated user, including `EMPLOYEE` and `INTERN`, can currently access and modify leave timing settings. Restore the check immediately — and fix the role string first (see WARNING below about `SUPER_ADMIN` vs `SUPERADMIN`).

#### Security — `currentUser` typed as `any`
- `src/contexts/AuthContext.tsx:10` — `currentUser: any` propagates unchecked through the entire application. Every role check, every permissions call, and every route guard receives an untyped object read from `localStorage`. If the stored shape is corrupted or changes between deployments, role checks silently evaluate against `undefined` without a compile-time or runtime error. Define a `CurrentUser` interface (`{ id: string; email: string; role: string }`) and use it as the type for both the context and the `setCurrentUser` / `getCurrentUser` utilities in `lib/api.ts`.

#### Error Handling — Raw `fetch` calls bypass the auth error wrapper
- `src/services/payrollService.ts:76–103` — `downloadPayslipPdf` and `previewPayslipPdf` use bare `fetch` instead of the `apiFetch` wrapper in `lib/api.ts`. A 401 response from these endpoints will not clear the auth token or redirect to login. Network errors throw a plain `Error`, not `ApiError`, so `handleApiError` won't handle them correctly and the caller will see an uncaught exception. Extend `apiFetch` to support blob/binary responses, or manually replicate 401 handling in these two methods.

---

### 🟡 WARNING

#### Type Inconsistency — `SUPER_ADMIN` vs `SUPERADMIN`
- `src/types/index.ts:1` — `UserRole` is declared as `'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'INTERN'`. The actual backend value is `SUPERADMIN` (no underscore), `HR` is missing entirely, and `INTERN` is present but `SUPERADMIN` is not. All permissions functions, sidebar role arrays, and route guards use `SUPERADMIN`. `LeaveTimingSettings.tsx:21` checks `role === 'SUPER_ADMIN'` — this will never match a real user. Update `UserRole` to `'SUPERADMIN' | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'INTERN'` and remove the `'SUPER_ADMIN'` variant.

#### Dead Code — `ProtectedRoute` never used
- `src/components/ProtectedRoute.tsx` — Defined but never imported or referenced anywhere. `AuthGuard` does the same job in `App.tsx`. Safe to delete.

#### Dead Code — Unused `useRef` and `useEffect` imports in `DesignationRoute`
- `src/components/DesignationRoute.tsx:4,12` — `useRef` and `useEffect` are imported and `hasShownToast = useRef(false)` is declared, but neither is ever used. Left over from a removed toast-on-redirect feature. Remove the import and the ref.

#### Deprecated function left in production code
- `src/services/leaveService.ts:268–273` — `getMonthlyReport` is marked `@deprecated` and superseded by `getLeaveReport`, but still exists in the bundle. Any accidental use by a new developer will go unnoticed. Remove it, or add an ESLint `no-restricted-syntax` rule if a grace period is needed.

#### Inconsistent hook usage across route guards
- `src/components/HolidayRoute.tsx:1` — Uses `useAuth()` while all other route guards (`AdminRoute`, `SuperAdminRoute`, `DesignationRoute`, `AssetRoute`, `PayrollRoute`, `LeaveReportRoute`) use `useAuthContext()` directly. Both work, but the inconsistency creates confusion about which hook to use in route guards. Standardise on `useAuthContext()`.

#### God component — `Dashboard.tsx` at 916 lines
- `src/pages/Dashboard.tsx` — Profile viewing, profile editing dialog, password change dialog, leave cancellation, leave withdrawal dialog, pending approvals list, today's leaves list, leave balances, equipment widget, and birthday widgets all live in a single component with no internal sub-components. Split into at minimum: `ProfileCard`, `LeaveOverviewSection`, and `PendingApprovalsWidget`. The dialogs (edit profile, change password, withdraw leave) should be extracted as separate components.

#### `window.confirm()` used for destructive actions
- `src/pages/Dashboard.tsx:66` — Cancel leave uses `window.confirm()`.
- `src/pages/Employees.tsx:238` — Deactivate employee uses `window.confirm()`.
The rest of the app uses `AlertDialog` consistently. `window.confirm` blocks the main thread, cannot be styled, and is suppressed in some sandboxed/embedded browser contexts. Replace both with the existing `AlertDialog` pattern.

#### Optimistic update rollback scope mismatch in `useMyLeaves`
- `src/hooks/useLeaves.ts` — In the `updateMutation` inside `useMyLeaves`, `onMutate` snapshots `['myLeaves', month, year]` (the scoped key). `onSuccess` invalidates both the scoped key and the broad `['myLeaves']` key. `onError` only rolls back the scoped key — the broader cache is left stale on failure. Add a snapshot and rollback for the broad `['myLeaves']` key in `onMutate`/`onError` to match the `onSuccess` invalidation scope.

#### `updateLeaveTiming` uses untyped `any`
- `src/services/leaveService.ts:242` — `updateLeaveTiming: async (data: any)` — the `UpdateLeaveTimingRequest` type is already defined in `src/types/index.ts`. Replace `any` with the proper type.

#### `API_BASE_URL` duplicated across two files
- `src/services/payrollService.ts:4` and `src/lib/api.ts:3` — The same constant with the same hardcoded fallback URL is declared independently in two places. A URL change will only get applied in one unless both are updated. Export `API_BASE_URL` from `api.ts` and import it in `payrollService.ts`.

#### Unnecessary `(leave as any)` casts in `Dashboard.tsx`
- `src/pages/Dashboard.tsx` — Multiple instances of `(leave as any).approval_name`, `(leave as any).applied_at`, etc. These fields are already declared on `LeaveResponse` in `src/services/leaveService.ts`. The casts suggest the local filtering uses a different type than the service layer. Align the types so the casts are unnecessary.

#### `LeaveTimingSettings` uses wrong role string for permission check
- `src/components/LeaveTimingSettings.tsx:21` — Checks `role === 'SUPER_ADMIN'` which, beyond the commented-out guard issue above, will never match the real value `'SUPERADMIN'`. Even when the guard is restored, `SUPERADMIN` users will be incorrectly denied. Fix the role string to `'SUPERADMIN'` and consider whether `HR` should also have access.

---

### 🔵 SUGGESTION

#### `generateSecurePassword` uses `Math.random()`
- `src/pages/Dashboard.tsx:144` — `Math.random()` is not cryptographically secure. For password generation, prefer `crypto.getRandomValues()`. Two-line fix with meaningful security improvement.

#### `authService.verifyToken` reads `localStorage` directly
- `src/services/authService.ts:24` — Calls `localStorage.getItem('auth_token')` directly even though `getAuthToken()` from `api.ts` is already imported. Use the helper consistently to keep access to `localStorage` in one place.

#### `AppStateContext` functions not memoised
- `src/contexts/AppStateContext.tsx` — The `invalidate*` functions are re-created on every render of the provider. Wrap them in `useCallback` to prevent unnecessary re-renders in any consumer that depends on referential stability.

#### Typo in leave timing API endpoint
- `src/services/leaveService.ts:236,244` — The endpoint `/leaves/timming` has a double `m`. This mirrors the backend route, so it is a backend issue too, but worth raising as a ticket so both sides are corrected together.

#### Non-API-style URL casing in service endpoints
- `src/services/leaveService.ts` — `/leaves/Get-Leave-Report` and `/leaves/Get-All-Leave-Policy` use Pascal-cased URL segments, which is inconsistent with REST conventions and the rest of the routes. Worth aligning on the backend.

---

## Recommended Next Steps

1. **Immediately** restore the commented-out permission guard in `LeaveTimingSettings.tsx` — this is an active security gap.
2. **Fix the `SUPER_ADMIN` / `SUPERADMIN` type inconsistency** in `types/index.ts` and `LeaveTimingSettings.tsx` before restoring the guard, or the guard will still exclude the wrong users.
3. **Type `currentUser`** — define a `CurrentUser` interface and replace all `any` references in `AuthContext`, `api.ts`, and downstream hooks.
4. **Fix the payroll service raw `fetch` calls** — either extend `apiFetch` for blob responses or add manual 401 handling.
5. **Delete `ProtectedRoute.tsx`** and clean up `DesignationRoute.tsx` dead imports.
6. **Replace `window.confirm`** in `Dashboard.tsx` and `Employees.tsx` with `AlertDialog`.
7. **Split `Dashboard.tsx`** — extract at minimum `ProfileCard`, edit/password dialogs, and `PendingApprovalsWidget` into their own components.
8. **Fix `updateLeaveTiming` signature** and the `useMyLeaves` rollback scope mismatch.
9. **Consolidate `API_BASE_URL`** into a single export from `api.ts`.
10. **Remove or enforce deletion of the deprecated `getMonthlyReport`** function.
