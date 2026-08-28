# Handover Notes — MD Appraisal Template System & Production Deploy Pipeline Fix

**Written:** 2026-08-28
**Scope of this session:** Started as "does the appraisal system make sense," expanded into building a full MD-authored, department-specific appraisal template feature (schema → backend → MD builder UI → employee review form → reviewer-workflow engine), then into discovering and fixing a real gap in the production deploy pipeline that had left the live frontend six days stale.
**Author:** Claude (this session). If you're a future agent picking this up, read this whole document before touching anything — several things here are not obvious from the code alone. This is a sibling document to `HANDOVER_NOTES.md` (2026-08-19 session, Leave/Appraisal audit) — read that one too if you're touching Leave or the older parts of Appraisal.

---

## 1. What shipped (merged to `main`, deployed to production)

Four PRs, in this order:

| PR | Branch | Merge commit | What it added/fixed |
|---|---|---|---|
| [#23](https://github.com/johnsedofiadakey-hue/Nexus-HRM/pull/23) | `feature/md-appraisal-template-schema` | `1925854` | Schema for the appraisal template feature (`AppraisalTemplate`, `AppraisalTemplateKpi`, `AppraisalTemplateSubIndicator`), plus a critical fix to the live Render build command (see §2, deploy pipeline) |
| [#26](https://github.com/johnsedofiadakey-hue/Nexus-HRM/pull/26) | `feature/appraisal-reviewer-workflow-engine` | `b7d6f13` | Backend service/controller/routes for template CRUD, the MD builder UI page, the template-aware employee review form, and — after a second Codex review pass — wiring the reviewer chain/blend ratio/gap threshold into real behavior |
| [#27](https://github.com/johnsedofiadakey-hue/Nexus-HRM/pull/27) | `docs/update-md-tutorial-phase7` | `2f6dbc1` | Docs-only: updated the MD tutorial doc now that reviewer chain/scoring rules are live |
| *(no PR — direct deploy)* | — | Firebase Hosting release `2026-08-28 15:03` (then a second one minutes later fixing a broken API URL) | Actually shipped the built client to `nexus-hrm.web.app` / `mcbauchemieguinea.com` — see §2, this is the important one |

**Both deploy targets confirmed live** as of this session, the same way the 2026-08-19 session verified it (don't trust the deploy command's exit code — fetch the real thing back):
- **Render (API)**: auto-deploys on merge to `main`. Confirmed via `prisma migrate diff` against the live production database returning an empty diff (schema matches exactly).
- **Firebase (frontend)**: **this was NOT auto-deploying at all** — see §2. Manually built and deployed this session, then verified live on `mcbauchemieguinea.com` itself, logged in as the real MD account (Helen Tabot), clicking through to the actual new page and confirming real department data loaded.

---

## 2. The most important finding this session: the frontend deploy pipeline gap

This is worth its own section because it's not a code bug — it's a process gap that will bite the next session too if not understood.

### 2.1 There are two separate deploy targets, and only one auto-deploys

- **API** (`nexus-hrm-api` on Render): auto-deploys on every push to `main`, per `render.yaml`'s `buildCommand`.
- **Frontend/client**: deploys via **Firebase Hosting** (`firebase.json`, project `nexus-hrm`, defined in `.firebaserc`), publishing `client/dist`. **There is no CI/CD wiring this to git pushes at all** — no GitHub Action, nothing in `render.yaml` (the client isn't even a Render service — a `nexus-hrm-client` Render static site exists but appears to be an orphaned/unused deployment target, distinct from the real one). Someone has to manually run `cd client && npm run build && firebase deploy --only hosting` after every frontend change.

This is already documented correctly in `PRODUCTION_CHANGELOG_AND_UPGRADE_RUNBOOK.md` §1 (topology table) — that doc had the right answer the whole time. **Read it before assuming anything about how a release reaches production.** The 2026-08-19 session's `HANDOVER_NOTES.md` §1 also independently confirms this same split (it manually deployed and independently verified the live bundle). Two prior sessions already knew this; a third (mid-session, this one) still didn't check first and had to rediscover it the hard way (see §2.2). **Check `PRODUCTION_CHANGELOG_AND_UPGRADE_RUNBOOK.md` §1 before doing anything else, every time.**

### 2.2 How this was discovered this session

The user asked to see the live app, expecting `mcbauchemieguinea.com`. That domain showed a real, working, differently-themed login page from the generic `nexus-hrm-client.onrender.com` URL that had been assumed (incorrectly) to be "the frontend" earlier in the session. Checking `firebase hosting:channel:list --project nexus-hrm` showed:

```
Channel ID   Last Release Time      URL
live         2026-08-19 07:56:03    https://nexus-hrm.web.app
```

That's the exact date of the *previous* handover session — meaning **every frontend change since then, across multiple PRs, had never reached production**, despite being merged to `main` and despite the backend half of each of those changes going live automatically. The MD-only "Appraisal Templates" nav item literally did not exist on the real site until this was caught and fixed.

### 2.3 The fix — and a mistake made while fixing it

```bash
cd client
npm run build          # WRONG — see below
firebase deploy --only hosting --project nexus-hrm
```

The first deploy used `client/.env`'s `VITE_API_URL=http://localhost:5001/api` (a dev-only file, `git`-tracked, meant for local development) — Vite bakes env vars in at build time, so this shipped a production build where **every single API call failed** (`AxiosError: Network Error`) for every real user, for the few minutes between the two deploys. This was caught immediately via console errors, not assumed fine.

**The correct command**, and the one to use for every future frontend deploy:

```bash
cd client
VITE_API_URL="https://nexus-hrm-api.onrender.com/api" npm run build
firebase deploy --only hosting --project nexus-hrm
```

Verify *before* deploying, every time:
```bash
grep -o "nexus-hrm-api.onrender.com" dist/assets/index-*.js | head -1   # must find it
grep -o "localhost:5001" dist/assets/index-*.js | head -1                # must find nothing
```

And verify *after* deploying by actually loading the real domain and checking for console errors — not just trusting `✔ Deploy complete!`. This session did that via the Chrome browser tool, logged in as the real MD account, confirmed real org data (14 real departments, real leave requests, "Team Appraisals 29" badge) rendered correctly.

### 2.4 Open question for whoever picks this up next

**Nobody has fixed the underlying process gap** — there's still no automated frontend deploy. Every future frontend-touching PR needs a manual Firebase deploy remembered and executed correctly (with the right `VITE_API_URL`), or this exact incident repeats. Worth considering: a GitHub Action on merge to `main` that runs the build-with-correct-env + `firebase deploy` automatically, the same way Render already auto-deploys the API. This wasn't built this session — flagging it as the single most valuable infrastructure fix available for a future session.

---

## 3. The MD Appraisal Template feature — what it is and how it works

### 3.1 The problem it solves

Every appraisal previously used one fixed, generic 14-item competency list — identical for an Accounts Receivable clerk and an IT technician. The client (MC-Bauchemie) supplied a real guidelines document describing department-specific KPIs and STAR-scored (Situation/Task/Action/Result) reflection questions, department by department. This feature lets the MD author that structure herself, per department, through the UI — no code changes needed for a new department's questions.

### 3.2 Schema (all in `server/prisma/schema.prisma`)

- **`AppraisalTemplate`** — one per department (optionally per job title within it). Holds `welcomeMessage`, reviewer-chain toggles (`requireManagerReview`/`requireDepartmentHeadReview`/`requireHrReview`), scoring config (`selfManagerBlendRatio`, `gapAlertThreshold`), `version` (bumped on every edit), `isActive` (soft-delete).
- **`AppraisalTemplateKpi`** — 2–3 per template, enforced server-side in `AppraisalTemplateService.upsert`.
- **`AppraisalTemplateSubIndicator`** — 2–4 per KPI, enforced server-side. Each has `situationWeight`/`taskWeight`/`actionWeight`/`resultWeight` (STAR method) — validated: Situation/Result 10–20%, Task fixed 10%, Action fixed 60%, all four must total 100%.
- **`AppraisalPacket`** gained four fields: `templateId`, `deptHeadId`, `templateSnapshot` (JSON string — see §3.3), `stageSequence` (JSON string array — see §3.4).
- **`EmailChangeToken`** and **`AppraisalCycle.sourceCycleId`** were *restored*, not added — see §5.1, this was a near-miss data-loss incident during this session, not new feature work.

### 3.3 The snapshot pattern (the safety-critical design decision)

When an appraisal cycle starts, `AppraisalService.initCycle` looks up the employee's department (+ job title) template via `AppraisalTemplateService.getForDepartment` and **freezes a full copy** of it onto the packet (`templateSnapshot = JSON.stringify(template)`), rather than referencing the live template by ID alone. This means:

- The MD can edit a department's template mid-cycle without disturbing appraisals already in progress — they keep working against whatever was frozen at cycle-start.
- The employee/manager review form (`AppraisalPacketView.tsx`) reads `packet.templateSnapshot`, not the live `AppraisalTemplate` table, when rendering questions.
- Scoring (`checkForDisputeGaps`'s gap threshold, `finalizePacket`'s self/manager blend) also reads from the packet's own snapshot, not the live template — same reasoning.

**If you're extending this feature: always read from the snapshot for anything that affects an in-flight appraisal, and only read the live template for the MD's own builder UI.** Getting this backwards is the exact class of bug the snapshot pattern exists to prevent.

### 3.4 The reviewer-workflow engine (Phase 7 — the higher-risk half of this feature)

This was deliberately built as a *separate* PR (#26, second commit) from the schema/UI work (PR #23), because it touches `advancePacket`/`getReviewerForStage`/`isStageOwner` in `appraisal.service.ts` — logic that a prior, unrelated session (2026-08-19, see the other handover doc) had recently and carefully hardened against a self-approval bug.

- `initCycle` computes a per-packet `stageSequence` (e.g. `['SELF_REVIEW','MANAGER_REVIEW','DEPT_HEAD_REVIEW','HR_REVIEW','FINAL_REVIEW']`) from the template's toggles, or falls back to the original hardcoded `['SELF_REVIEW','MANAGER_REVIEW','FINAL_REVIEW']` for packets with no template — **this fallback is what keeps every pre-existing packet and every department without a template working exactly as before.**
- `advancePacket` reads `packet.stageSequence` instead of the global `APPRAISAL_STAGES` constant, with the same fallback.
- `getReviewerForStage`/`isStageOwner` gained two new stage cases (`DEPT_HEAD_REVIEW` → `packet.deptHeadId`, `HR_REVIEW` → `packet.hrReviewerId`), each enforcing the exact same no-self-approval rule as the pre-existing `MANAGER_REVIEW`/`FINAL_REVIEW` cases. **Every existing case was left untouched** — this was verified by confirming all 150 pre-existing tests still passed unchanged after the edit, not just by reading the diff.
- `calculateSuggestedScore` gained an optional `selfWeight` parameter (default `0.2`, preserving the original hardcoded 20/80 split); `finalizePacket` now passes the packet's own template-snapshot ratio when one exists.
- `checkForDisputeGaps`'s gap threshold (previously hardcoded `15`) now reads from the snapshot the same way.

### 3.5 Two rounds of automated (Codex) review caught real bugs — don't skip this step

GitHub has `chatgpt-codex-connector` wired up to auto-review PRs (same tool the 2026-08-19 session encountered, see that doc's §4.4). It caught real, non-obvious bugs both times this session used it:

**PR #23 (schema):** `AppraisalTemplate.createdById` was a required FK with no `onDelete` behavior — hard-deleting an MD who'd authored a template would throw a foreign-key violation and roll back the whole transaction. Fixed: made it nullable with `onDelete: SetNull`, matching the convention already used by `EmployeeHistory.createdById` and others in this schema.

**PR #26 (workflow engine), four findings, three of them P1:**
1. **The serious one**: `initCycle`'s `hrReviewers` query filtered on `role: { in: ['HR', 'DIRECTOR', 'MD'] }` — but this project's canonical HR role (see `server/src/types/roles.ts`) is `HR_OFFICER`; `'HR'` is only a legacy alias. An org whose HR staff are seeded as `HR_OFFICER` (not the alias) would find zero HR reviewers, fall through to the MD for *both* `hrReviewerId` and `finalReviewerId`, and have `HR_REVIEW` collapse into `FINAL_REVIEW` as a "duplicate reviewer" (an existing, intentional dedup rule in `advancePacket`) — completing the packet **without ever calling `finalizePacket`**, so `finalScore` would stay `null` forever. This is the exact failure mode the 2026-08-19 session's data-integrity guards (`finalizePacket` requiring a resolved score) exist to prevent, reintroduced through a completely different path. Fixed: added `'HR_OFFICER'` to the role filter.
2. The client's `isMyTurn` predicate (gates whether the review form renders at all) only recognized `SELF_REVIEW`/`MANAGER_REVIEW`/`FINAL_REVIEW` — a department head below rank 85 assigned to a `DEPT_HEAD_REVIEW` stage would see nothing, even though the backend already authorized them. Fixed: added matching cases.
3. `FinalizePerformanceReviewModal.tsx` computed its own hardcoded 20/80 suggestion and **always** sent `finalScore` in its payload — meaning the backend's template-aware fallback in `finalizePacket` (see §3.4) was dead code for every real MD finalization through the actual UI; only a caller that bypassed the UI entirely would ever see the configured blend take effect. Fixed: the modal now reads the packet's template snapshot for the real ratio.
4. `getReviewerPackets` (powers the "Team Appraisals" queue) didn't include `deptHeadId` in its filter — a department head below rank 80 had no way to find their assigned review except a direct packet URL. Fixed: added it.

**Lesson for future sessions**: these findings came from a genuinely independent reviewer reading the actual diff, and found things that passing 150 tests and a careful self-review both missed — because the tests didn't cover the specific role-name/UI-wiring gaps, and self-review is bad at catching "this code technically works but the caller never actually exercises the interesting path." Always wait for and read the Codex review before merging a PR that touches anything security- or money-adjacent (reviewer authorization, scoring), even when you're confident in the change. It's not fast (took ~2 minutes to land both times, worth an explicit wait-loop rather than assuming it won't find anything) but it was worth it both times.

### 3.6 MD builder UI

New page: `client/src/pages/AppraisalTemplateBuilder.tsx`, route `/reviews/templates`, sidebar nav entry gated to rank ≥ 90 (MD only) in `Sidebar.tsx`. Department picker (+ optional job title) → welcome message → reviewer chain checkboxes → self/manager blend slider + gap threshold → 2–3 KPI cards each with 2–4 STAR-weighted questions → save. Client-side validation mirrors the server-side validation in `AppraisalTemplateService` exactly (same min/max counts, same STAR weight bounds) so the MD gets instant feedback instead of a round-trip error.

### 3.7 Employee/manager review form

`AppraisalReviewForm` in `AppraisalPacketView.tsx` now branches: if `packet.templateSnapshot` is present and has KPIs, render the template's questions with four STAR (1–5) inputs each; otherwise fall back to the original hardcoded 14-competency framework (`getCompetencyFramework`), unchanged. The submitted `responses` JSON **deliberately keeps the pre-existing `competencyScores` key shape** (KPI title → `category`, sub-indicator → `competency`) specifically so the existing blind-review redaction logic in `appraisal.service.ts` (which walks that exact shape to hide scores/comments from unauthorized viewers) keeps working unmodified — the STAR breakdown rides along as an extra `star` field per competency, which the redaction code doesn't touch (it only overwrites `comment`/`score`, and doesn't wipe `rating` either — see §6, this is a pre-existing gap, not something introduced this session).

The stage-progress stepper (top of `AppraisalPacketView.tsx`) is also now dynamic — built from `packet.stageSequence` instead of a hardcoded 3-item array — so a packet sitting in `DEPT_HEAD_REVIEW` or `HR_REVIEW` shows the correct step highlighted instead of a confusing all-grey stepper (this was caught and fixed proactively, not by Codex).

---

## 4. Deliverables sent to the user (not code, but part of this session's output)

Two documents, both in `docs/`:
- `Appraisal_Templates_MD_Guide.docx` — plain tutorial, superseded once Phase 7 landed (updated in-place once reviewer chain/scoring went live).
- `Appraisal_Templates_MD_Guide_Stormglide.pdf` — branded version, built with `reportlab` (not LibreOffice/docx — LibreOffice isn't installed on this machine, `soffice` fails). Uses Stormglide's actual brand colors extracted live from `stormglide.io`'s CSS custom properties (`#16233F` navy, `#2563EB` blue, `#FAF9F6` cream) and the real logo file. Contains faithful *recreations* of the actual live screens (verified against `mcbauchemieguinea.com` directly, logged in as the real MD), not literal screenshot files — **this environment's Chrome browser tool cannot save screenshot images to a readable local file path**, only render them inline to the model. If a future session needs real screenshot files embedded in a deliverable, that's a real capability gap to solve first (candidates: native `mcp__computer-use__computer` with `save_to_disk`, requires OS-level screen-recording consent and may not capture the right pane; or ask the user to capture and share the files directly).

---

## 5. Two near-miss production incidents this session — both caught before damage

### 5.1 Restoring, not deleting, unexplained production drift

`npx prisma db push` on the new schema initially proposed **dropping** the `EmailChangeToken` table (1 real row — an in-progress email-change verification the user confirmed is a genuine, currently-being-built feature, not abandoned) and `AppraisalCycle.sourceCycleId` (empty but real, tied to legacy-cycle-ID resolution — see the 2026-08-19 handover's §2.17, this is the exact field that fixed that session's bug #17). Both existed in production but had fallen out of `schema.prisma` at some point before this session, for reasons nobody could reconstruct. **Neither was dropped** — both were restored into the schema matching production's actual column structure exactly, confirmed via `\d "TableName"` in `psql`, before running `db push` for real. If you ever see `db push` propose a `DROP` on something you didn't intend to touch, stop and ask before proceeding — don't assume it's safe just because it's not the table you're working on.

### 5.2 `--accept-data-loss` was silently baked into the live build command

The actual live Render build command (set directly in the dashboard, **diverged from `render.yaml` in the repo**, which itself was also stale — wrong region, wrong DB service name) was:
```
npx prisma db push --accept-data-loss
```
This flag makes `db push` auto-approve *any* destructive schema change with zero review, on every single deploy. Removed on both the live dashboard and in `render.yaml` (which was also corrected to match reality: `oregon` not `frankfurt`, `nexus-database` not `nexus-db`). Proved itself immediately — the very next deploy correctly *refused* to drop two new columns that weren't yet in `main`'s committed schema, instead of silently applying it. **If you're doing schema work, check the actual live Render build command in the dashboard, not just `render.yaml` — they can and did diverge.**

---

## 6. Known follow-ups (not done this session, worth doing)

1. **No automated frontend deploy** — see §2.4. The single highest-value infra fix available.
2. **`checkForDisputeGaps`'s redaction gap**: the blind-review redaction logic in `appraisal.service.ts` (walks `competencyScores[].competencies[]`) sets `comp.score = null` for unauthorized viewers, but the actual sensitive field the frontend sends is `rating`, not `score` — meaning individual competency ratings are **not actually being redacted** despite the code's intent. This is pre-existing (not introduced this session, and not touched by the STAR `star` field addition either), noticed while verifying the STAR responses shape stayed compatible with redaction. Not fixed this session — flagging for whoever owns the appraisal privacy model next.
3. **The reviewer-chain toggles are new and only lightly exercised** — 12 unit tests cover the logic paths, but nobody has run a real end-to-end cycle through a department with `requireDepartmentHeadReview`/`requireHrReview` both turned on, in production, with real users. Recommend the MD's first real use of the feature be treated as a monitored trial (this was explicitly said to the user too).
4. **Nothing retroactively touches packets created before this session** — they have no `templateId`/`stageSequence`/`templateSnapshot` (all null/default), which is by design (falls back to original behavior), but worth knowing if you're ever asked "why doesn't employee X's in-progress appraisal show the new questions" — the answer is always "it started before the template existed for their department."
5. Everything listed in the 2026-08-19 handover's §3 is still open — this session didn't touch Leave, i18n gaps, the `ReviewCycle` consolidation, or the other pending PRs (#19, #2). Check that doc separately.

---

## 7. Verification standard used this session (for consistency)

Same bar as the 2026-08-19 session, plus one addition specific to what went wrong this time:

1. `tsc --noEmit` clean on both `client` and `server`, every commit.
2. Full `vitest run` — all existing tests still pass, new tests added for new logic (150 → 162 over the session).
3. Schema changes checked against the **live production database** directly (`prisma migrate diff --from-url "<real prod URL>" --to-schema-datamodel ./prisma/schema.prisma --script`) before and after applying — not just validated locally.
4. The actual feature clicked through live in production, logged in as the real MD account, after every deploy — not assumed working from a green build.
5. **New this session**: after any frontend deploy, actually load the real domain and check browser console for errors, and confirm the built bundle contains the correct baked-in `VITE_API_URL` (`grep` the built JS for the expected host, and for the absence of `localhost`) — this exact class of mistake (right code, wrong build-time env var) is invisible to every other check in this list.
