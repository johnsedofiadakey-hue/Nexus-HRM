# Nexus HRM

Nexus HRM is a multi-tenant Human Resource Management platform covering the
full employee lifecycle — recruitment, onboarding, leave, performance
appraisals, KPIs/targets, payroll, expenses, assets, and offboarding — behind
a numerical rank-based permission model (0–100) rather than fixed roles.

Live: [mcbauchemieguinea.com](https://mcbauchemieguinea.com) ·
[nexus-hrm.web.app](https://nexus-hrm.web.app) (frontend) ·
[nexus-hrm-api.onrender.com](https://nexus-hrm-api.onrender.com) (API)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 4, TypeScript |
| Database | PostgreSQL via Prisma ORM 5 (`server/prisma/schema.prisma`, 78 models) |
| Auth | JWT (access + refresh tokens), bcrypt password hashing |
| Realtime | WebSocket (`ws`) for live notifications |
| PDF generation | PDFKit (`server/src/services/pdf.service.ts`) |
| Scheduled jobs | `node-cron` (leave accrual, reminders, renewals) |
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS |
| Routing | React Router 6 |
| Animation | Framer Motion |
| Charts | Recharts |
| i18n | i18next (English/French) |
| Frontend auth-adjacent | Firebase (Firestore + Storage; see `client/src/lib/firebase.ts`) |

Server package: `personnel-hrm-server`. Client package: `personnel-hrm-client`.

---

## 2. Deployment Architecture — two separate targets

This is the single most important thing to know before shipping a change.
See **[PRODUCTION_MAINTENANCE_GUIDE.md](PRODUCTION_MAINTENANCE_GUIDE.md)**
for the full detail and the incident that prompted writing it down.

| Layer | Where | How it deploys |
|---|---|---|
| Backend API (`nexus-hrm-api`) | Render | **Automatic** — Render watches `main` on GitHub and rebuilds/redeploys on every push (`render.yaml`). Migrations run via `prisma migrate deploy` in the build step, never at boot. |
| Frontend | Firebase Hosting, project `nexus-hrm` | **Manual** — no CI is wired up. After merging a change that touches `client/`, someone must run `cd client && npm run build && firebase deploy --only hosting`. |

Health check: `GET https://nexus-hrm-api.onrender.com/api/health` →
`{"status":"UP","database":"CONNECTED",...}`.

---

## 3. Governance Model

Permissions are driven by a numerical rank (`server/src/types/roles.ts`),
not a fixed role list — a role just maps to a rank, and authorization checks
compare ranks (`getRoleRank(role) >= N`).

| Role | Rank | Typical scope |
|---|---|---|
| DEV | 100 | System/diagnostic override, excluded from normal staff lists |
| MD | 90 | Final sign-off authority (leave, appraisals), full org visibility |
| DIRECTOR / HR_OFFICER / IT_MANAGER | 85 | Institutional sign-offs, high-rank overrides on approval stages |
| MANAGER | 70 | Team management, KPI/appraisal initiation, first-line leave approval for direct/matrix reports |
| SUPERVISOR | 60 | First-line reviews, task delegation |
| STAFF | 50 | Standard employee self-service |
| CASUAL | 40 | Limited/contract worker access |

Reporting lines aren't limited to a single supervisor: `EmployeeReporting`
supports secondary/"functional" (dotted-line) managers alongside the
primary supervisor, and both are respected by leave approval and the
Action Inbox's visibility rules.

---

## 4. Feature Modules

Grouped by domain; each maps to a `server/src/routes/*.routes.ts` +
`*.controller.ts` pair and one or more client pages.

**Workforce & Org**
Employee Management, Departments/Sub-Units, Org Chart, Employment History,
Audit Logs, System Settings.

**Recruitment & Lifecycle**
Recruitment (candidates, job positions, interview stages/feedback, offer
letters), Onboarding (checklists/templates), Offboarding (processes, exit
interviews, tasks).

**Performance**
Appraisal cycles (self → manager → HR/MD review with arbitration), KPIs
(department + individual), Targets (assignment, acknowledgement, progress,
manager review), Performance V2, Calibration.

**Leave & Time**
Leave requests (submit → reliever handover → manager review → MD final
sign-off → register), leave balance accrual/carry-forward, Public Holidays,
Attendance & Shifts.

**Finance**
Payroll (runs, items, tax brackets/rules), Expense claims + approvals,
Loans, Compensation history, Benefits.

**Operations**
Asset Management (assignment/return), IT Admin, Support Tickets, Training
Programs & Enrollment, Announcements, Document generation/storage.

**Governance & Integration**
Enterprise Suite (multi-tenant/subscription controls), ERP Integration
(CSV export gateway for employees/payroll/leave, authenticated via
`X-Nexus-ERP-Key`), Reporting & Analytics, Action Inbox (unified queue of
everything needing a decision — leave approvals, appraisal reviews, target
acknowledgements, expense approvals — with enough context to act without
leaving the inbox), real-time Notifications.

**Document Generator**
Branded PDF export (`pdf.service.ts`) for Leave Certificates, Payslips,
Appraisal Dossiers, and Target/Roadmap reports — single A4 sheet unless
content genuinely overflows.

---

## 5. Data Model (high level)

78 Prisma models under `server/prisma/schema.prisma`, organized around:
`User` (with `EmployeeReporting` for primary + matrix reporting lines),
`Department`/`SubUnit`, `LeaveRequest`/`HandoverRecord`/`PublicHoliday`,
`AppraisalCycle`/`AppraisalPacket`/`AppraisalReview`, `Target`/`KpiItem`/
`KpiSheet`, `PayrollRun`/`PayrollItem`/`TaxRule`, `ExpenseClaim`/`Loan`,
`Asset`/`AssetAssignment`, `Candidate`/`JobPosition`/`InterviewStage`,
`OnboardingSession`/`OffboardingProcess`, `Organization` (multi-tenant root),
`AuditLog`/`SystemLog`, `Notification`.

---

## 6. Resilience & Recovery

- **Backups**: `backup.service.ts` maintains JSON snapshots of critical
  tables in Firebase for rapid partial restoration; `google-drive.service.ts`
  syncs encrypted SQL snapshots to a Cloud Vault folder.
- **Manual restore**: download the latest `.sql` snapshot, then
  `psql -h [host] -U [user] -d [db] -f snapshot.sql` followed by
  `npx prisma generate`.
- **Destructive-operation gate**: hard-delete endpoints are blocked in
  production regardless of role unless `ALLOW_DESTRUCTIVE_OPERATIONS=true`
  is explicitly set — see `server/src/middleware/data-safety.middleware.ts`
  and **[DATA_PROTECTION_AND_RECOVERY_RUNBOOK.md](DATA_PROTECTION_AND_RECOVERY_RUNBOOK.md)**.
- **Domain-aware API fallback**: `client/src/services/api.ts` detects a
  custom-domain deployment and falls back to the production Render API URL
  if `VITE_API_URL` is missing.

---

## 7. Local Development

```bash
# Install
cd server && npm install
cd ../client && npm install

# Server: copy env, set DATABASE_URL and JWT_SECRET
cd ../server
cp .env.example .env
npx prisma migrate dev
npx ts-node src/scripts/setup.ts   # seeds default accounts

# Run
cd ../server && npm run dev        # http://localhost:5000/api
cd ../client && npm run dev        # http://localhost:3000
```

### Key environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | Server | PostgreSQL connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Server | Token signing (min 64 chars in production) |
| `GOOGLE_DRIVE_KEY_JSON` | Server | Service account for Cloud Vault backups |
| `ALLOW_DESTRUCTIVE_OPERATIONS` | Server | Must be unset/false in production |
| `VITE_API_URL` | Client | API base URL (falls back to production Render URL on custom domains) |
| `X_DEV_MASTER_KEY` | Global | Diagnostic bypass, dev-only |

Run tests and type-checks before shipping:

```bash
cd server && npx tsc --noEmit && npx vitest run
cd client && npx tsc --noEmit && npm run build
```

---

## 8. Project Documentation Index

1. **[Project Handbook](HANDBOOK.md)** — logic, security, and core business
   processes (Appraisals, Leave, Action Center).
2. **[Deployment Guide](DEPLOYMENT.md)** — infrastructure and hosting setup.
3. **[Production Maintenance Guide](PRODUCTION_MAINTENANCE_GUIDE.md)** —
   deploy-process gotchas, safety guardrails, and a running log of
   production fixes. Read this before shipping any change.
4. **[Data Protection & Recovery Runbook](DATA_PROTECTION_AND_RECOVERY_RUNBOOK.md)**
   — the audited process for actual data-recovery scenarios.
5. **[Client Overview](NexusHRM_Client_Overview.md)** — business-facing
   functional summary (roles, workflows, reporting) for non-technical
   stakeholders.
6. **[Upgrade Manual](NEXUS_UPGRADE_MANUAL.md)** — historic context on the
   March 2026 appraisal-lifecycle hardening phase.
7. **[Localization Manual](LOCALIZATION_MANUAL.md)** — multi-language
   support guide (English/French).

---

## 9. Safe Operations

- **System purge**: "Safe Reset" spares `MD` and `DEV` accounts.
- **Sensitive data**: rank 80+ required for salary/SSN and other
  "value-at-risk" fields.
- **Destructive operations**: disabled in production by design — see
  Section 6.

---
[API Service](https://nexus-hrm-api.onrender.com) | [Core Platform](https://nexus-hrm.web.app)
