# Production Maintenance Guide

Read this before shipping any change to Nexus HRM. It exists because on
2026-07-06 a working set of fixes sat correctly merged on GitHub for several
minutes while production kept serving the old, broken frontend — because
nobody realized the frontend needs its own separate deploy step. This
document is how that doesn't happen again.

---

## 1. Deployment architecture — there are TWO deploy targets, not one

| Layer | Where it lives | How it deploys |
|---|---|---|
| **Backend API** | `nexus-hrm-api` on Render | **Automatic.** Render watches `main` on GitHub and rebuilds/redeploys on every push (see `render.yaml`). |
| **Frontend** | Firebase Hosting, project `nexus-hrm`, served at `mcbauchemieguinea.com` and `nexus-hrm.web.app` | **Manual.** There is no CI wired up (`.github/workflows` does not exist). Someone must run `cd client && npm run build && firebase deploy --only hosting` after every merge that touches `client/`. |

**Consequence:** merging a PR to `main` is not the same as "shipping the
fix" if the change touches `client/`. `git push` alone will only ever
update the API. If a fix includes both server and client changes and you
only watch the API's health check, you will see green while users are
still on the old frontend bundle — exactly what happened here.

### How to tell if the frontend actually redeployed
The build hashes its JS bundle (e.g. `index-DZTaDElO.js`). Compare before
and after:
```bash
curl -s https://mcbauchemieguinea.com/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
```
If the hash is unchanged after you believe you deployed, the deploy didn't
happen (build failed silently, wrong `firebase use` project, cached CDN
response, etc.) — investigate before telling anyone it's fixed.

### Standard ship checklist
1. `cd server && npx tsc --noEmit && npx vitest run` — must be clean.
2. `cd client && npx tsc --noEmit && npm run build` — must be clean.
3. Open a PR, merge to `main` → API redeploys automatically. Confirm with
   `curl https://nexus-hrm-api.onrender.com/api/health` (expect
   `{"status":"UP","database":"CONNECTED",...}`).
4. **If the PR touched anything under `client/`**, also run
   `cd client && npm run build && firebase deploy --only hosting` and
   re-check the bundle hash above.
5. Only then tell anyone it's live.

---

## 2. Production safety guardrails already in place — do not bypass casually

These exist from a prior hardening pass. If you hit one of these while
working, it is very likely doing its job correctly — stop and think before
routing around it.

- **`server/src/middleware/data-safety.middleware.ts`** —
  `requireDestructiveOperationsEnabled(operation)` blocks hard-delete
  endpoints (employees, leave requests, handover records, etc.) whenever
  `NODE_ENV === 'production'`, regardless of the caller's role. There is an
  `ALLOW_DESTRUCTIVE_OPERATIONS=true` env escape hatch, but the middleware's
  own comment is explicit: *"Production recovery must happen through an
  audited, backup-first runbook rather than an HTTP endpoint."* Don't flip
  that flag to make a one-off deletion convenient.
- **Migrations run as `npx prisma migrate deploy` in the build step**
  (`render.yaml`), never `prisma db push --accept-data-loss` at boot.
  `db push --accept-data-loss` re-runs on *every* restart and will
  silently apply destructive schema changes with no review step — never
  reintroduce it (see `DEPLOYMENT.md`'s explicit warning, added after we
  found this exact footgun in an outdated doc).
- **`server/scripts/check-destructive-migrations.js`** scans migration
  SQL for `DROP TABLE` / `DROP COLUMN` / `TRUNCATE` / `DELETE FROM` —
  treat a failure here as a real stop sign, not something to work around.
- **`DATA_PROTECTION_AND_RECOVERY_RUNBOOK.md`** is the authoritative
  process for any real data-recovery scenario. Read it before touching
  production data directly.
- **Soft-delete vs hard-delete**: "Archive"/"Remove" in the UI sets
  `isArchived: true, status: 'ARCHIVED'` (reversible, via "Restore").
  Actual row deletion is the separately-gated hard-delete path above.
  When in doubt, archive — it's always the safer, reversible option.

---

## 3. What was actually broken and fixed this session (2026-07-06)

### Live production incidents found and fixed
1. **CORS rejected any request without an `Origin` header** — 500'd the
   entire API for curl, server-to-server calls, and Render's own
   `healthCheckPath` probe (`/api/health`, `/`). Real browser traffic from
   the deployed frontend was unaffected (browsers always send `Origin`
   cross-origin), but Render's own health check was very likely failing.
   Fixed in `server/src/app.ts`: a missing `Origin` header is now allowed
   through (CORS is a browser concept; there's nothing to restrict for a
   non-browser request).
2. **Optional UUID form fields rejected `''`** — any optional relation
   dropdown left unselected (Sub-Unit, Functional Manager, etc.) sent an
   empty string, and the shared `optUuid` Zod primitive
   (`server/src/middleware/validate.middleware.ts`) only treated
   `undefined` as "not provided," so `''` failed `.uuid()` validation.
   This completely blocked Add Employee whenever an optional dropdown was
   left blank. Fixed by preprocessing `'' | null → undefined` inside
   `optUuid` itself, so every schema using it benefits (not just the one
   field that had a prior one-off workaround).

### Leave-module bugs fixed
3. **Functional/dotted-line managers couldn't approve leave they could
   see.** `HierarchyService.getManagedEmployeeIds` includes matrix/dotted
   reports (via the `EmployeeReporting` table), so a functional manager's
   report shows up in their Pending queue — but `LeaveService.managerReview`'s
   authorization check only recognized the primary supervisor, a
   same-department manager, or rank ≥75. Fixed by adding an
   `EmployeeReporting`-based check.
4. **Cancelling could overwrite a rejection.** `cancelLeave` only blocked
   cancellation for `APPROVED` leaves; an already-`MANAGER_REJECTED` /
   `MD_REJECTED` / `RELIEVER_DECLINED` / `CANCELLED` request could be
   "cancelled" again, silently replacing the real outcome with a generic
   "Cancelled" status. Fixed with an explicit terminal-status guard.
5. **Dead component with an inverted bug**: `TeamLeaveRequests.tsx`
   (unreferenced anywhere in the app) posted `action: 'APPROVED'/'REJECTED'`
   while the server only ever recognized the literal `'APPROVE'/'REJECT'` —
   clicking "Approve" there would have silently rejected the leave.
   Deleted, since it wasn't used. Added `LEAVE_ACTIONS` constants on both
   client and server so this exact string-mismatch class can't recur
   silently — always import the constant, never hand-type the string.
6. **Dead, buggy service method**: `LeaveService.requestLeave` (the real
   `/leave/apply` route uses the controller's own logic, not this) had a
   holiday query missing an `organizationId` filter (cross-tenant leakage)
   and broken recurring-holiday date matching. Removed — it was never
   called.
7. Fixed a stale comment in `getEligibleRelievers` claiming rank-based
   filtering that the code doesn't apply (intentional, by prior design).

### Employee-management / UX bugs fixed
8. **Errors were being thrown away.** `EmployeeManagement.tsx` fell back
   to a hardcoded `'Protocol failure during sync'` whenever the server's
   response didn't have exactly `.message` or `.error` — hiding real
   validation details, duplicate-record messages, and network/timeout
   distinctions. Replaced with `extractApiErrorMessage()`, which surfaces
   the actual `details` array, message, or a specific network/timeout
   explanation.
9. **Required fields were only enforced on the active tab.** The Add/Edit
   Employee modal is one `<form>` split across tabs that unmount when
   inactive — so HTML's native `required` only ever covered whichever tab
   was open. A user could fill "Corporate & Role" and submit without ever
   visiting "Identity & Demographics." Fixed with an explicit cross-tab
   required-field check in `handleSave` that also jumps to the offending
   tab.
10. Added missing i18n keys (`employees.add_new`, `employees.edit_profile`,
    `employees.complete_details`, `employees.alerts.required_field`) in
    both `en.json` and `fr.json` — the Add/Edit Employee modal header was
    rendering raw translation keys (`EMPLOYEES.ADD_NEW`) instead of real
    text.
11. `xssSanitizer` middleware ran *before* `express.json()`/`urlencoded()`
    in `app.ts`, so `req.body` didn't exist yet when it ran — it was a
    silent no-op on every request. Moved to run after the body parsers.

### Follow-up pass, same day (found via user report: every PDF printed an extra blank sheet)
12. **Every generated PDF (leave certificate, payslip, appraisal, target)
    silently printed an extra, almost-empty page.** Root cause was in the
    shared `renderFooter` (`server/src/services/pdf.service.ts`), used by
    every document type: it drew the footer line/text at y=780/790, which
    — once the 7pt text's line height was factored in — crossed PDFKit's
    computed usable-area boundary for an A4 page with a 50pt margin
    (~791.89pt). PDFKit doesn't error on this; it silently starts a new
    page and puts the footer there instead, so page 1 had all the real
    content but no footer, and page 2 had nothing but a footer stamp.
    Verified empirically (`pdfinfo`/`pdftotext` on generated samples, not
    just code reading) before and after the fix. Moved the footer
    comfortably inside the margin and disabled `lineBreak` on it, since a
    single short line must never itself trigger a page break.
13. **Payslip had a second, unrelated cause of the same symptom.** After
    the Net Payout box, `renderPayslipContent` called `doc.moveDown(8)`
    before the bank/account/payment-date lines — but `moveDown(n)` moves
    by `n × the *currently set* font size`, and the last font size set was
    24pt (the net payout amount), so this jumped ~230pt, not a modest gap,
    pushing those three short lines onto their own near-empty page.
    Replaced with an explicit `doc.y = summaryTop + 100 + 20` (the summary
    box's fixed height plus a small gap) instead of a relative `moveDown`
    that inherits whatever font size happened to be active.
    Regression-tested (`pdf.service.pagination.test.ts`) for leave
    certificates, payslips, and a short appraisal (all now exactly 1
    page), and confirmed a genuinely long appraisal (many reviews +
    competency scores) still legitimately spans multiple pages — the fix
    tightens accidental overflow, it does not suppress real pagination.

---

## 4. Patterns to watch for in future code

- **Optional relation fields from `<select>` dropdowns send `''`, not
  `undefined`, when unselected.** Any new Zod field for an optional
  relation should use the shared `optUuid` primitive (now fixed) rather
  than rolling a new one-off `z.string().uuid().optional()` — the old
  pattern silently reintroduces bug #2 above.
- **Tabbed forms in one `<form>` element**: if a tab's fields unmount when
  inactive, native `required` cannot be trusted for validation across the
  whole form. Any new multi-tab form needs an explicit cross-tab check
  before submit, following the pattern in `EmployeeManagement.tsx`'s
  `handleSave`.
- **Client error handling**: never fall back to a hardcoded generic string
  when a request fails. Surface `response.data.details` /
  `response.data.message` / `response.data.error`, and distinguish
  "no response at all" (network/timeout) from an actual server error —
  see `extractApiErrorMessage()` in `EmployeeManagement.tsx` as the
  reference implementation.
- **`LEAVE_ACTIONS`** (`server/src/constants/leave.constants.ts`,
  `client/src/constants/leave.ts`) — always import these for the
  `action` field sent to `POST /leave/process`. Never hand-type
  `'APPROVE'`/`'REJECT'` strings again.
- **New translation keys**: when adding a new `t('namespace.key', ...)`
  call, add the key to *both* `en.json` and `fr.json` in the same change.
  A missing key renders as the raw dotted key path in the UI.
- **PDFKit layout gotchas** (`server/src/services/pdf.service.ts`):
  PDFKit silently starts a new page when a `.text()` call's position plus
  its computed line height would cross the page's usable-area boundary —
  it never throws or warns. Keep any absolute-positioned content (like
  the shared footer) with a real safety margin before the bottom edge,
  not right up against it. Also, `doc.moveDown(n)` scales by whatever
  font size was *last set*, not a fixed unit — after rendering large text
  (e.g. a big total/amount), reset the font size or use an explicit
  `doc.y = ...` assignment instead of `moveDown` for the next gap, or the
  jump will be far bigger than it looks in the code. When changing PDF
  layout, verify page count empirically (e.g. `pdfinfo`/`pdftotext` on a
  generated sample, or the byte-level `/Type /Page` regex used in
  `pdf.service.pagination.test.ts`) rather than reasoning about it from
  the code alone — the bugs here were invisible from reading the code and
  only showed up when actually counting pages.

---

## 5. This document vs. the others

- **`DEPLOYMENT.md`** — infrastructure setup (Render service config,
  environment variables). Now corrected to point at `render.yaml` as the
  source of truth and to stop recommending `prisma db push --accept-data-loss`.
- **`DATA_PROTECTION_AND_RECOVERY_RUNBOOK.md`** — the process for actual
  data recovery/incident response. Read this, don't improvise, if
  production data is ever actually at risk.
- **`HANDBOOK.md` / `NEXUS_UPGRADE_MANUAL.md`** — business-logic and
  historical feature documentation (appraisals, leave policy, etc.).
- **This file** — deploy-process gotchas, safety guardrails, and a running
  log of what's been fixed and why, so the next person (or the next
  session) isn't rediscovering the same footguns from scratch.
