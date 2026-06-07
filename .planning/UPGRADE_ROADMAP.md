# Nexus HRM — Upgrade Roadmap
> Planned upgrades. Nothing here is deployed. Last updated: 2026-05-30.

---

## Tier 1 — High Impact, Do Next
*These directly affect security, revenue, or daily user experience.*

---

### 1. Two-Factor Authentication (2FA)
**Why:** Single biggest enterprise selling point. Every serious B2B SaaS has it.
MD/Director accounts controlling payroll for an entire company should not rely on password alone.

**How:**
- TOTP (Google Authenticator / Authy) via `speakeasy` library
- On login: if 2FA enabled, return `{ requires2FA: true, tempToken }` instead of the JWT
- Frontend shows a 6-digit code prompt
- Backend verifies TOTP code, then issues the real JWT
- Recovery codes (8 one-time codes) stored hashed in DB

**Schema additions:**
```prisma
model User {
  twoFactorSecret   String?
  twoFactorEnabled  Boolean @default(false)
  twoFactorBackupCodes String[] // hashed
}
```

**Effort:** ~3 days

---

### 2. Sentry Error Tracking
**Why:** Right now you find out about crashes when users complain.
With Sentry, you see the full stack trace, the user who triggered it, and how many times it happened — before anyone reports it.

**How:**
- `npm install @sentry/node` on server, `npm install @sentry/react` on client
- Init in `app.ts` before routes, init in `main.tsx` on client
- Replace the global error handler with Sentry's Express middleware
- Add `SENTRY_DSN` to Render env vars

**Effort:** ~2 hours

---

### 3. Redis Cache (replace in-memory cache)
**Why:** The subscription cache we built lives in the Node process memory.
If Render restarts the server or you ever scale to 2 instances, the cache is lost/inconsistent.
Redis persists across restarts and is shared across instances.

**How:**
- Render has a managed Redis add-on (free tier available)
- `npm install ioredis`
- Replace the `Map<string, CacheEntry>` in `subscription.middleware.ts` with Redis get/set/del
- Same `invalidateSubscriptionCache()` API, just backed by Redis

**Effort:** ~1 day

---

### 4. Email Notification System (complete it)
**Why:** SMTP is wired but most flows don't actually send emails.
Leave approvals, payroll runs, appraisal cycle launches — users have no idea these happened unless they check the app.

**Flows to add:**
- Leave request approved/rejected → notify employee
- Payroll run approved → notify all employees with payslip PDF attached
- Appraisal cycle launched → notify all participants
- Password reset (already exists but worth verifying)
- Account created → welcome email with temp password

**How:** All infrastructure exists (`email.service.ts`, `nodemailer`). Just wire the calls into the right controller actions.

**Effort:** ~2 days

---

## Tier 2 — Strong Business Value
*These unlock new customer segments or significantly improve retention.*

---

### 5. Employee Mobile Experience (PWA)
**Why:** Most employees only need 3 things: request leave, view payslip, check announcements.
They shouldn't need a desktop for that.

**How:**
- Add `vite-plugin-pwa` to the client
- Create a `manifest.json` with app name/icons
- Add a service worker for offline caching of the dashboard
- Make the Leave, Payslip, and Announcements pages mobile-responsive (audit current CSS)
- Add "Add to Home Screen" prompt

**Effort:** ~3 days

---

### 6. Google / Microsoft SSO
**Why:** Enterprise HR departments live in Google Workspace or Microsoft 365.
"Login with Google" removes the password problem entirely for those orgs.

**How:**
- Server: `passport-google-oauth20` and/or `passport-azure-ad`
- On first SSO login, match by email to existing user or create new one
- Issue the same JWT the app already uses — no frontend auth changes needed
- Add `googleId`, `microsoftId` fields to User model

**Effort:** ~2 days

---

### 7. Webhook System
**Why:** Bigger customers want to connect Nexus to their own tools (Slack, their ERP, custom dashboards).
Webhooks let you offer that without building every integration yourself.

**Events to support:**
- `employee.created`, `employee.terminated`
- `leave.approved`, `leave.rejected`
- `payroll.approved`
- `appraisal.completed`

**How:**
- `WebhookEndpoint` model in DB (url, secret, events[], orgId)
- After each event, fan out to all registered endpoints with HMAC-signed payload
- Retry queue with exponential backoff (use BullMQ or simple cron retry)
- UI in Settings for MD to add/remove webhook endpoints

**Effort:** ~4 days

---

### 8. Advanced Report Exports
**Why:** HR managers and MDs need to present reports to boards, auditors, and finance teams.
Currently exports are basic. 

**Reports to add:**
- Headcount report (by department, by role, by date range)
- Payroll summary report (gross, net, tax breakdown per employee per month)
- Leave utilization report (who used what, who has what remaining)
- Appraisal score distribution report
- Attrition report (terminations over time)

**Format:** PDF (already have pdfkit) + Excel (add `exceljs`)

**Effort:** ~3 days

---

## Tier 3 — Infrastructure & Compliance
*Important but not urgent. Do when you're scaling.*

---

### 9. Background Job Queue (BullMQ + Redis)
**Why:** Cron jobs running inside the web process is fragile.
If the server restarts mid-payslip-email-send, the job is lost.
A proper queue survives restarts, retries failures, and can be monitored.

**Replace:**
- All `node-cron` jobs → BullMQ scheduled jobs
- Payslip email sending (move out of request cycle)
- Report generation for large orgs

**Effort:** ~3 days

---

### 10. GDPR / Data Privacy Compliance
**Why:** If you expand to European clients or handle EU citizen data, this becomes mandatory.
Even outside EU, it's a competitive differentiator.

**Features:**
- Data export: MD can download everything Nexus holds on an employee (JSON/PDF)
- Right to deletion: anonymize terminated employee data after N days (configurable per org)
- Consent tracking: log when employees accept terms
- Data retention policy per org (set in SystemSettings)

**Effort:** ~4 days

---

### 11. Database Connection Pooling (PgBouncer)
**Why:** Render's PostgreSQL has a hard connection limit. Under load, the app can exhaust connections and crash with `too many connections`.
PgBouncer sits between the app and Postgres and multiplexes connections.

**How:**
- Render offers PgBouncer on paid DB plans
- Change `DATABASE_URL` to point to the PgBouncer port
- Add `?pgbouncer=true&connection_limit=1` to the Prisma connection string

**Effort:** ~2 hours (mostly Render config)

---

### 12. API Versioning (/api/v1/)
**Why:** As you add features, you'll eventually need to change existing endpoints in a breaking way.
Versioning lets you do that without breaking existing integrations.

**How:**
- Prefix all routes with `/api/v1/`
- Keep `/api/` aliases for 6 months with a deprecation header
- Document in DEPLOYMENT.md

**Note:** We added `/api/erp` already. This completes the pattern.

**Effort:** ~1 day

---

## Priority Order (Recommended)
```
Now ready to build:
1. Sentry          (2 hrs  — know about crashes immediately)
2. Redis Cache     (1 day  — production-grade caching)
3. Email flows     (2 days — complete what's already wired)
4. 2FA             (3 days — security + enterprise sales)
5. PWA             (3 days — employee experience)
6. SSO             (2 days — enterprise sales)
7. Webhooks        (4 days — integrations)
8. Report exports  (3 days — MD/finance value)
9. BullMQ queue    (3 days — infrastructure)
10. GDPR           (4 days — compliance)
11. PgBouncer      (2 hrs  — do when you hit connection errors)
12. API versioning (1 day  — do before any breaking changes)
```

---

*To start any of these: open this file, pick one, tell Claude "let's build #X".*
