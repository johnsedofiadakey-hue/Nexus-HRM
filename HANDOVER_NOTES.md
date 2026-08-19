# Handover Notes — Leave/Appraisal Audit Session

**Written:** 2026-08-19
**Scope of this session:** Started as "leave balance doesn't work for Alseny Soumah," expanded into a full audit and live walkthrough of the Leave and Appraisal systems, plus a broad sweep of every other module.
**Author:** Claude (this session). If you're a future agent picking this up, read this whole document before touching anything — several things here are not obvious from the code alone.

---

## 1. What shipped (merged to `main`, deployed to production)

Three PRs, in this order:

| PR | Branch | Merge commit | What it fixed |
|---|---|---|---|
| [#20](https://github.com/johnsedofiadakey-hue/Nexus-HRM/pull/20) | `fix/leave-balance-and-employee-search` | `84232ac` | Leave balance silently dropped on employee create/edit; Adjust Balance modal reset used days to zero on open; employee creation crashed on blank optional fields (salary/gender/department) |
| [#9](https://github.com/johnsedofiadakey-hue/Nexus-HRM/pull/9) | `feature/search-md-notify-inbox` | `648133e` | Employee search did nothing at all; MD wasn't notified when a leave was finalized; inbox visibility didn't match real approval authority; expense claims missing from inbox (this PR had been sitting unmerged since **2026-07-06** — see §4) |
| [#21](https://github.com/johnsedofiadakey-hue/Nexus-HRM/pull/21) | `fix/appraisal-cycle-crash-and-i18n-gaps` | `03d8278` (+ follow-up `5077e9c`) | Review Cycles page couldn't create a cycle at all; "Launch Reviews" couldn't run at all; completing any appraisal crashed with a 500 (data actually saved, but the reviewer saw an error); `cycles.*` i18n namespace didn't exist; ~30 more raw i18n keys in Leave; a settings/WebSocket refetch loop; a cycle-lookup bug caught by an automated review bot on the PR itself (see §4) |

**Both deploy targets confirmed live** as of this session:
- **Render (API)**: auto-deploys on merge to `main`. Confirmed via the service's own Deploys tab showing the merge commit as "Live."
- **Firebase (frontend)**: deployed manually (`cd client && npm run build && firebase deploy --only hosting`), then independently verified by fetching the actual live JS bundle from `nexus-hrm.web.app` and confirming the new code's literal strings are present in it — not just trusting the deploy command's exit code.

If you're deploying again, **`PRODUCTION_MAINTENANCE_GUIDE.md` in this repo root is the authoritative process doc** — read it first. It exists because this exact "merged but not actually live" gap has already burned this project once.

---

## 2. Full list of problems found this session

### Leave module
1. `CreateUserSchema`/`UpdateUserSchema` never declared `leaveAllowance`/`leaveBalance`/`leaveBroughtForward` — Zod silently stripped them from every employee create/edit request. **Fixed (#20).**
2. The Adjust Balance modal recalculated `balance = allowance + broughtForward` on open/change, discarding days already used. **Fixed (#20).**
3. Two separate entry points to the Adjust Balance modal (top bar button vs. panel button) — only one pre-filled real data; the other opened with stale/blank state. **Fixed (#20).**
4. Employee creation rejected on any blank optional field (`departmentId` sent as `null`, `salary`/`gender` sent as `''`) — same root cause as #1, different fields. **Fixed (#20).**
5. A dozen other employee form fields (bank details, marital status, nationality, employment type, certifications) were also silently dropped by the same Zod-stripping pattern. **Fixed (#20).**
6. `getAllEmployees` parsed `req.query.search` but never applied it to the query — search box did nothing. **Fixed (#9, someone had already written and tested this fix back in July — it just never got merged.)**
7. MD had no visibility when a leave was finalized by a Director/HR Officer acting on their behalf. **Fixed (#9).**
8. Inbox showed every org-wide pending leave to any rank≥70 user instead of just their own reports; `MD_REVIEW` visibility threshold didn't match the real authorization threshold. **Fixed (#9).**
9. Expense claims had no representation in the Action Inbox at all. **Fixed (#9).**
10. Two notification links pointed at tab-only views with no way to land on the right tab (`/expenses/approvals` isn't a route, it's a tab). **Fixed (#9).**
11. ~30 raw i18n keys across the Apply for Holiday modal, Team/Register tables, Approve/Reject buttons — e.g. `common.abort`, `leave.handover_notes`, `LEAVE.REQUIRE_HANDOVER_ACCEPTANCE`. Two of these (`leave.protocol_accepted`, `leave.system_verification`) were leaking the raw key into **stored** `managerComment`/`relieverComment` audit data, not just the screen. **Fixed (#21).**

### Appraisal module
12. `CreateCycleSchema` required `title`; the actual `Cycle` model and `cycle.service.ts` both use `name` — the Review Cycles page could not create a single cycle, ever. Same mismatch in `UpdateCycleStatusSchema`. **Fixed (#21).**
13. The `type` enum didn't include `BI_ANNUAL`, which the frontend dropdown already offered. **Fixed (#21).**
14. `InitAppraisalCycleSchema` required `title`/`startDate`/`endDate` even though `AppraisalService.initCycle` is explicitly designed to accept just `cycleId` and derive the rest — "Launch Reviews" on an already-created cycle could never pass validation. **Fixed (#21).**
15. Completing an appraisal's final stage crashed with a 500: `EmployeeHistory.createdById: 'SYSTEM'` (a literal string, not a real user ID) violated the FK to `User`. The packet itself had already been marked `COMPLETED` by a preceding, non-transactional update, so **every finalized appraisal actually succeeded in the database while the reviewer's browser showed an error.** `createdById` is nullable — now omitted. **Fixed (#21).**
16. The entire `cycles.*` i18n namespace didn't exist — ~17 keys, every label on the Review Cycles page rendered as a raw key (`cycles.title`, `CYCLES.ADD_NEW`, etc.). **Fixed (#21).**
17. **Found by an automated review bot on PR #21, not by me**: the `cycleId`-only path in `initCycle` creates/finds an `AppraisalCycle` with its own UUID and stores that on every packet, but `CycleManagement.tsx` only ever knows the *original* `Cycle.id` (that's all `GET /api/cycles` returns) — so "View All"/sync on a launched cycle always reported zero packets. Fixed by adding a nullable `sourceCycleId` on `AppraisalCycle` and resolving either ID before querying packets. **Fixed (#21, follow-up commit `5077e9c`).** This is a good example of a bug my own fix *introduced* by finally letting a previously-blocked code path execute — worth remembering that unblocking a validation bug can expose a second bug that was hiding behind it.

### Cross-cutting / infrastructure
18. `ThemeContext.refreshSettings` depended on `theme` in its own `useCallback` array while also calling `setThemeState` internally — every settings fetch created a new callback identity, re-triggering the effect that calls it again. Visible as repeated `[ThemeContext] Settings fetched` / `[WS] Connected` log spam. **Fixed (#21)**, using the same `ref` pattern (`settingsRef`) already established in the same file for exactly this reason.
19. `EmployeeManagement.tsx`'s status filter dropdown had a broken Tailwind class (`hover:text(--text-primary)]` — missing `-[var`). **Fixed (#20).**

### Found, NOT fixed — see §3
20. A broader i18n completeness gap: ~70 more missing keys across `payroll.*`, `attendance.*`, `training.*`, `performance.builder.*`, `appraisals.packet.*` namespaces (found via the repo's own `find_missing_keys.js`, which checks EN/FR parity — the real gap is larger since that script doesn't catch keys missing from *both* locales).
21. A UI papercut: rapid repeated tab-switching on the Leave page can visibly stick on stale content (wrong table headers/data) until a slower, single deliberate click. Root cause is almost certainly `AnimatePresence mode="wait"` + `key={activeTab}` in `Leave.tsx` getting confused by overlapping transitions — never fully root-caused, just reliably worked around by not clicking fast.
22. Three architecturally separate "cycle" models exist in `schema.prisma`: `Cycle` (legacy, `name`/`type`, no relations), `ReviewCycle` (`title`, relates to `PerformanceReviewV2` — **appears completely unused**, grep for it before assuming it's safe to delete), and `AppraisalCycle` (`title`/`period`, relates to `AppraisalPacket` — the one that actually matters). This is why bug #17 existed. Worth a real cleanup pass, not urgent.

---

## 3. What's left to do (in rough priority order)

1. **PR #19** (`fix/brand-remaining-transactional-emails`) — open since 2026-07-27, completely unrelated to this session's work, never touched by me. Someone should review/merge or close it.
2. **PR #2** (`codex/add-production-upgrade-runbook`) — open since 2026-07-01, docs-only. Same story.
3. **The i18n gap in §2.20.** Given how many raw-key bugs turned up in Leave and Cycles just from live-clicking through them, I'd bet money the same pattern exists in Payroll/Attendance/Training — nobody has actually clicked through those pages looking for it yet.
4. **Deep transactional testing of everything outside Leave/Appraisal.** I did a *load-and-look* sweep (does it render, any raw keys, any console errors) on Payroll, Expenses, Assets, Recruitment, Onboarding, Offboarding, Departments, Org Chart, Support, Training, Holidays, IT Admin, Settings, Enterprise Suite. None of them crashed or showed obvious breakage, but I did **not** run a payroll cycle, submit an expense claim, assign an asset, or move a recruitment candidate through a pipeline. "Loads clean" ≠ "verified," and I said this explicitly to the user rather than implying otherwise.
5. **The Leave tab-switching papercut (§2.21).** Low severity, not urgent, but unresolved.
6. **The `ReviewCycle` model (§2.22).** If genuinely dead, remove it — a third parallel "cycle" concept is exactly the kind of thing that causes another bug like #17 down the line.
7. **Historical bad data.** None of this session's fixes retroactively correct data that was already wrong before today — e.g., if Alseny Soumah's (or anyone else's) leave balance was zeroed out by the pre-fix Adjust Balance modal bug before this session, that specific database row is still wrong. Nobody has DB access from an agent session to check/correct this; it needs someone with direct DB access, or the affected employee's manager to re-enter the correct number through the now-fixed UI.

---

## 4. Challenges hit this session, and how they were worked around

This section is the part most worth reading carefully — it's process/tooling knowledge, not code knowledge.

### 4.1 Local `main` is contaminated — do not build from it
Local `main` has a commit sitting on it (`6688917`, titled *"WIP checkpoint: my local edits before reconciling against origin/main (not for push)"*) that is **~2,500 lines diverged from `origin/main`** — missing whole test files, docs, and chunks of controller logic. Nobody in this session knows what it is or who wrote it. **It was never touched, deleted, or reset** — just avoided entirely. Every branch created this session was built from `origin/main` directly (`git checkout -b <name> origin/main`), never from local `main`. **Do the same.** If you want to investigate what that WIP commit actually is, do it deliberately and separately — don't let it end up as the base of a "quick fix" branch by accident (`git checkout -b foo` with no explicit base will silently use whatever's currently checked out).

### 4.2 A backlog of already-fixed-but-never-shipped work is the real root cause
The employee-search fix (#9) was written and fully tested back on **2026-07-06** — over a month before this session — and just sat there. This wasn't a "the code doesn't work" problem, it was a "things get fixed and then nobody ships them" problem. If you find yourself fixing something and it feels suspiciously familiar, **check for an existing branch/PR before writing a new fix** (`git branch -a`, `git fetch --prune origin` first — stale remote-tracking refs will lie to you about what's already merged-and-deleted vs. genuinely still open).

### 4.3 Merging is blocked by Claude Code's own permission layer, not GitHub
Attempting `gh pr merge` from an agent session gets blocked by Claude Code's classifier the first time, with a message explaining merging to `main` triggers a production deploy. This is **not a GitHub permission issue** — it's the harness itself pausing on a hard-to-reverse, shared-state action. In this session, after the user explicitly said "let's merge," subsequent `gh pr merge` calls went through without re-blocking. Don't assume it'll always block, and don't assume it'll always pass — check the actual result each time, and if it's blocked, tell the user plainly rather than retrying in a loop.

### 4.4 GitHub branch protection can block on unresolved PR comments — including bot comments
PR #21 hit `mergeStateStatus: BLOCKED` with reason *"All comments must be resolved."* This turned out to be a review left by an automated bot (`chatgpt-codex-connector`), not a human — and the finding was **genuinely correct** (see §2.17). Lesson: don't treat "just resolve the thread to unblock" as a UI formality — read what the comment actually says first. In this case, resolving it properly meant fixing a real bug, verifying the fix live, replying with what was done, and *then* resolving the thread via GitHub's GraphQL API (`resolveReviewThread` mutation — the REST API has no endpoint for this; `gh api graphql -f query=...` is the way in from the CLI).

### 4.5 Local rate limiting will bite you during rapid manual testing
The `generalLimiter` (600 req/min) is generous for real usage but gets hit fast when an agent is rapidly navigating/reloading a local dev instance while testing. When this happened, the limiter's threshold was temporarily raised (`process.env.NODE_ENV === 'development' ? 100000 : 600`) for local testing only, and **explicitly reverted before any commit** — grep for `TEMP` comments if you're worried something like this got left in by accident; there shouldn't be any, but it's worth a final check on any future session's diff.

### 4.6 A scary-looking crash can be stale Vite HMR state, not a real bug
Mid-session, navigating to `/kpi/my-targets` produced a hard crash — `Cannot read properties of null (reading 'useState')`, "Invalid hook call," inside `ThemeProvider`. This looked exactly like a real regression from an edit just made to `ThemeContext.tsx`. It wasn't — a **hard restart of the Vite dev server** (not just a page reload) made it disappear completely and never recur. Long-running local dev sessions with many hot-reloads can accumulate a genuinely broken module cache that has nothing to do with your actual code. Before concluding a change broke something, try a clean process restart first.

### 4.7 The local dev/test environment does not survive a session context reset
Partway through this session, the local server and client dev processes both silently died (a context/session boundary event, not something triggered by any command run). `preview_list` returned empty, `lsof` confirmed nothing was listening. **The Postgres database itself was untouched** (it's a separate, persistent process) — only the two Node dev processes needed restarting. If you hit "no preview is open" or similar mid-session, check `lsof -i :5001 -i :3000` before assuming something is broken; it's likely just this.

### 4.8 Setting up the local test environment from scratch
For reference, here's the exact sequence used this session:
```bash
# Isolated test DB (never touch the real dev DB if one exists — check `psql -lqt` first)
createdb -U <user> -h localhost nexus_hrm_walkthrough
cd server && npx prisma db push --skip-generate && npx prisma generate
npm run setup   # seeds the standard test accounts, see below
```
`server/.env` needs `DATABASE_URL` pointing at that DB, a real `JWT_SECRET`/`JWT_REFRESH_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`), `NODE_ENV=development`, and `PORT=5001` (the client's Vite proxy target — check `client/vite.config.ts`'s `server.proxy` before assuming a port).

**Seeded test accounts** (from `npm run setup`), all password pattern `<Role>@Nexus2025!`:
| Email | Role | Password |
|---|---|---|
| `dev@nexus-system.com` | DEV | `DevMaster@2025!` |
| `md@nexus.com` | MD | `MD@Nexus2025!` |
| `director@nexus.com` | DIRECTOR | `Director@Nexus2025!` |
| `hr@nexus.com` | HR_OFFICER | `HR@Nexus2025!` |
| `it@nexus.com` | IT_MANAGER | `IT@Nexus2025!` |
| `manager@nexus.com` | MANAGER | `Manager@Nexus2025!` |
| `mid@nexus.com` | SUPERVISOR | `Mid@Nexus2025!` |
| `staff@nexus.com` | STAFF | `Staff@Nexus2025!` |
| `casual@nexus.com` | CASUAL | `Casual@Nexus2025!` |

Reporting chain seeded: Staff Member → Team Lead (mid@) → Department Manager (manager@) → Operations Director (director@) → Managing Director (md@). Useful for testing multi-stage approval chains without having to construct one manually.

**Faster login for scripted testing**: rather than fighting UI login-form flakiness, `POST /api/auth/login` directly and inject the result into `localStorage` — but set **both** `nexus_auth_token` *and* `nexus_user` (the latter holds the role/rank the frontend actually reads via `getStoredUser()`; setting only the token leaves the app showing whatever role was last cached).

### 4.9 Browser automation quirks worth knowing about
- Native `confirm()`/`alert()` dialogs block this environment's browser tool entirely — no way to accept/dismiss them. Work around by calling the same endpoint the button would have called, directly, with the same auth token.
- The first click immediately after filling a login form sometimes doesn't register (no request fires) — a second identical click does. Always verify via network requests that a login actually happened before proceeding, rather than assuming the click worked.
- `computer` scroll actions timed out unreliably in this environment; reading full page text (`get_page_text`) or querying the DOM directly via `javascript_exec` worked reliably where scrolling didn't.
- A viewport can get stuck at an unexpectedly narrow mobile size after certain interactions; `resize_window` with explicit `width`/`height` (not just the `desktop` preset) reliably fixes it.

---

## 5. Verification standard used this session (for consistency)

Every fix in this session was verified the same way, and future work should hold the same bar:
1. `tsc --noEmit` clean on both `client` and `server`.
2. Full `vitest run` — all existing tests still pass.
3. The actual bug reproduced live (not assumed from reading code) before being called "fixed."
4. The same steps re-run after the fix, confirming the specific symptom is gone.
5. For deploy verification specifically: don't trust the deploy command's exit code — fetch the actual live bundle/response back and check the real content changed.

Static analysis and code review both missed real, live-reproducible bugs this session (the appraisal completion crash, the cycle-lookup bug) that only surfaced by actually clicking through the app with real data. Reading the code is necessary but not sufficient.
