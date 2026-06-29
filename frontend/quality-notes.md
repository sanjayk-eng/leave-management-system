---
## Review Session — 2026-06-25 | Scope: src/ (full codebase)
- **Health**: Needs Attention
- **Critical**: 3 | **Warnings**: 12 | **Suggestions**: 5
- **Top patterns found**: commented-out access control (security gap), `SUPER_ADMIN` vs `SUPERADMIN` type mismatch propagating into broken permission checks, raw `fetch` bypassing the auth error wrapper in payroll service, `currentUser: any` eroding type safety across all role checks
- **Report**: `quality-report.md`
