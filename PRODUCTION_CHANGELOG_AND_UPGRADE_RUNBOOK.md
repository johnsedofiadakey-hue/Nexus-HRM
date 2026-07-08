# Nexus HRM Production Change Log and Upgrade Runbook

- **Operational baseline:** 1 July 2026
- **Production project:** `nexus-hrm`
- **Canonical repository:** `https://github.com/johnsedofiadakey-hue/Nexus-HRM.git`
- **Production branch:** `main`

This is the current source of truth for investigating, testing, releasing, verifying, and rolling back Nexus HRM production changes. It also records the 1 July 2026 leave workflow repair.

> Do not use the destructive database command in the older `DEPLOYMENT.md` guide. Production schema changes must use reviewed Prisma migrations and `prisma migrate deploy`. `NEXUS_UPGRADE_MANUAL.md` remains historical documentation for the March 2026 appraisal work.

## 1. Current production topology

| Component | Production target | Release mechanism |
| --- | --- | --- |
| Source | GitHub repository above, `main` | Reviewed pull request merged into `main` |
| API | `https://nexus-hrm-api.onrender.com` | Render automatically deploys changes merged into `main` |
| Primary web app | `https://nexus-hrm.web.app` | Manual Firebase Hosting release from `client/dist` |
| Client custom domain | `https://mcbauchemieguinea.com` | Serves the Firebase Hosting release |
| Firebase project | `nexus-hrm` | Defined in `.firebaserc` |
| Deployment definitions | `render.yaml`, `firebase.json` | Treat these files as authoritative |

The working Git checkout used for the July repair was:

```text
/Users/truth/Developer/guinea/Nexus-HRM
```

Confirm the path and remote before every release. Other similarly named Nexus or MCB directories are not automatically production-linked.

```bash
pwd
git remote -v
git branch --show-current
git status --short
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
```

## 2. Production change record: leave workflow repair

### Release identity

- Date: 1 July 2026
- Fix commit: `7e7e9be8f2ab7aec15a68d7bae3cad18b260bd3a`
- Production merge commit: `8b713a5da3399bb946543acf8347cc0b4be3c118`
- Pull request: `https://github.com/johnsedofiadakey-hue/Nexus-HRM/pull/1`
- Render deployment ID: `5269684080`
- Render deploy: `dep-d92h5muq1p3s73ev189g`
- Firebase project: `nexus-hrm`
- Deployed leave bundle: `assets/Leave-C6ixO5Av.js`
- Deployed bundle SHA-256: `27c74528acc798f1b35d92d3cade506f0cbcc02b24a175e88a8066ded366cb42`

### Reported behavior

Employees were receiving errors while submitting leave requests. Additional failures existed in the same workflow: some leave types shown in the form were rejected, low-rank assigned relievers could not respond, and manager leave could enter the wrong approval stage.

### Confirmed causes

1. The client sent `relieverId: ""` when no reliever was selected. The API accepted a UUID or an omitted value, so the empty string failed UUID validation.
2. The client exposed `Paid` and `Compassionate`, but the API validation enum did not accept them.
3. The `/leave/process` route required rank 50 before the controller could validate that the caller was the assigned reliever. An assigned `CASUAL` reliever at rank 40 was blocked.
4. One active leave creation path always selected `MANAGER_REVIEW` when no reliever was supplied. Manager and executive leave should start at `MD_REVIEW`.
5. The client displayed only a generic error and discarded useful field-level validation details returned by the API.

### Surgical correction

- `client/src/pages/Leave.tsx`
  - Omits an empty optional reliever ID from the request.
  - Displays the first API validation detail when available.
- `server/src/middleware/validate.middleware.ts`
  - Normalizes an empty or null reliever ID to an omitted value.
  - Accepts `Paid` and `Compassionate` because they are valid form options.
  - Continues rejecting malformed non-empty UUIDs.
- `server/src/utils/leave.utils.ts`
  - Centralizes the initial leave status decision.
- `server/src/controllers/leave.controller.ts`
  - Uses the centralized status decision in the primary creation path.
- `server/src/services/leave.service.ts`
  - Uses the same status decision in the service creation path.
- `server/src/routes/leave.routes.ts`
  - Allows any authenticated assigned reliever to reach the controller.
  - Management processing remains restricted to rank 60 or higher in the controller.
- Regression tests:
  - `server/src/__tests__/leave.contract.test.ts`
  - `server/src/__tests__/leave.routes.test.ts`
  - `server/src/__tests__/leave.utils.test.ts`

No database schema or migration was changed.

### Expected leave routing after the repair

```text
Request with reliever
  -> SUBMITTED
  -> assigned reliever accepts
  -> staff request: MANAGER_REVIEW
  -> manager/executive request: MD_REVIEW

Request without reliever
  -> staff request: MANAGER_REVIEW
  -> manager/executive request: MD_REVIEW
```

An assigned reliever can accept or decline regardless of rank. A non-reliever below management rank cannot process the request. Management actions still require rank 60 or higher.

### Verification completed before release

```bash
# Server
cd server
npx vitest run \
  src/__tests__/leave.utils.test.ts \
  src/__tests__/leave.contract.test.ts \
  src/__tests__/leave.routes.test.ts
npm test
npx tsc --noEmit
npm run build

# Client
cd ../client
npx tsc --noEmit
npm run build
```

Results:

- Focused leave tests: 19 passed.
- Full server test suite: 86 passed.
- Server type check and production build: passed.
- Client type check and production build: passed.
- Existing non-blocking client warnings remained: unresolved `/noise.png` at build time and large bundle chunks.

### Release sequence and production evidence

1. The focused branch was pushed and pull request 1 was reviewed for exact file scope.
2. Pull request 1 was merged into `main` as `8b713a5`.
3. Render automatically deployed the API merge commit.
4. Render marked deployment `5269684080` successful.
5. The API returned HTTP 200 with `database: CONNECTED` and `bootComplete: true`.
6. The verified client build was deployed with:

   ```bash
   firebase deploy --only hosting --project nexus-hrm
   ```

7. Both `https://nexus-hrm.web.app` and `https://mcbauchemieguinea.com` returned HTTP 200.
8. The leave bundle served by both domains had the same SHA-256 as the locally verified build.

No synthetic leave request was written to the production database. An authenticated production end-to-end submission should only be performed with an approved test account and an agreed cleanup procedure.

## 3. Standard protocol for future surgical upgrades

### A. Establish repository and production truth

- Work only in the canonical Git checkout.
- Confirm `origin`, branch, current commit, and worktree status.
- Preserve unrelated local modifications and untracked files.
- Confirm the live URLs and deployment configuration from `render.yaml`, `firebase.json`, and `.firebaserc`.
- Do not treat a local build as proof that production is updated.

### B. Understand the failure before editing

- Reproduce the exact user workflow where safe.
- Trace the client payload, API route, validation schema, authorization, controller, service, database write, and returned error.
- Separate the first failing contract from downstream symptoms.
- Check adjacent roles and states so a narrow fix does not break another approval path.
- Record unrelated findings separately; do not expand a production hotfix without evidence.

### C. Define the smallest safe patch

- State the exact behavior being corrected.
- Keep schema changes, migrations, refactors, and UI redesign out of a hotfix unless required.
- Preserve existing authorization boundaries.
- Add regression coverage that fails for the reported case before the correction and passes afterward.

### D. Run release gates

At minimum, run:

```bash
cd server
npm test
npx tsc --noEmit
npm run build

cd ../client
npx tsc --noEmit
npm run build
```

For a narrow change, also run focused tests for the changed workflow. Treat tests, type checks, builds, runtime smoke checks, and production deployment as separate gates.

### E. Review and commit only the intended scope

```bash
git diff --check
git diff --stat
git status --short
git switch -c codex/<short-change-name>
git add <explicit-file-list>
git diff --cached --check
git diff --cached --stat
git commit -m "fix: <clear production behavior>"
git push -u origin codex/<short-change-name>
```

- Never use `git add .` in a dirty worktree.
- Use a focused pull request with the symptom, cause, changed contract, and verification results.
- Confirm the pull request file list before merging.

### F. Release backend first when the change is backward-compatible

Merging to `main` triggers the Render API deployment. Monitor the deployment attached to the exact merge commit and do not release a client that requires the new server until the server succeeds.

Health check:

```bash
curl -sS \
  -H 'Origin: https://nexus-hrm.web.app' \
  https://nexus-hrm-api.onrender.com/api/health
```

Expected minimum response properties:

```json
{
  "status": "UP",
  "database": "CONNECTED",
  "bootComplete": true
}
```

### G. Release the verified client

From the repository root, after building the client from the production commit:

```bash
firebase deploy --only hosting --project nexus-hrm
```

Then verify:

- Firebase Hosting returns HTTP 200.
- The custom domain returns HTTP 200.
- Both domains reference the expected asset names.
- The changed asset served by production matches the tested local artifact.
- The production API accepts both production origins.

### H. Record the release

Append a new entry to this file with:

- Date and user-visible symptom.
- Root cause.
- Files and contracts changed.
- Pull request, fix commit, and merge commit.
- Test counts and build results.
- Render deployment result.
- Firebase release result.
- Live checks performed and any checks intentionally omitted.
- Rollback point and remaining follow-up items.

## 4. Rollback protocol

Do not rewrite shared history or use `git reset --hard` for a production rollback.

### Application rollback

1. Identify the merge commit and its known-good parent.
2. Create a rollback branch from current `main`.
3. Revert the merge commit, review the resulting diff, and run the same release gates.
4. Merge the rollback pull request. Render will deploy the reverted backend.
5. Rebuild the reverted client and deploy it to Firebase Hosting.
6. Verify API health and both production domains.

For the 1 July leave repair only, the production merge was `8b713a5` and its previous production commit was `737a4b1`. A rollback should use `git revert`, not a force push. Reverting this repair will restore the leave defects and should be used only if the release itself causes a more severe incident.

Firebase Hosting also retains release history in the Firebase console. A previous Hosting release can be restored there when an immediate client-only rollback is required, but the source branch must then be reconciled so the next deploy does not reintroduce the reverted client.

## 5. Database change rules

- The 1 July leave repair required no migration.
- Future schema changes require a reviewed migration under `server/prisma/migrations`.
- Render's authoritative build command in `render.yaml` runs `npx prisma migrate deploy`.
- Back up production data before a risky migration.
- Test forward migration and application compatibility before merging.
- Prefer additive, backward-compatible migrations when backend and frontend releases are separated.
- Never run `prisma db push --accept-data-loss` against production.
- Never run setup or seed scripts against production unless the exact data effect has been reviewed and authorized.

## 6. Known follow-up items

These were not changed by the leave hotfix and must remain separate work:

- Perform an approved authenticated production leave submission and approval smoke test without polluting client records.
- Audit historical leave requests for incorrect states before attempting any data repair.
- Review leave balance, pending-day, overlap, cancellation, and archival rules as a separate data-integrity change.
- Review broader leave authorization and tenant-isolation behavior independently of the reliever route correction.
- Investigate why the health endpoint can fail without an allowed production `Origin`; monitoring should currently send an allowed origin.
- Resolve the client build warning for `/noise.png`.
- Plan bundle splitting for the existing large client chunks.
- Replace or clearly archive stale instructions in `DEPLOYMENT.md` and update the README documentation links to repository-relative paths.

## 7. Release checklist

### Before merge

- [ ] Canonical repository, remote, and branch confirmed.
- [ ] User-visible failure reproduced or contract failure proven.
- [ ] Root cause documented.
- [ ] Patch limited to required files.
- [ ] Focused regression tests added.
- [ ] Full server tests pass.
- [ ] Server and client type checks pass.
- [ ] Server and client production builds pass.
- [ ] Migration impact explicitly recorded.
- [ ] Pull request file list inspected.

### During release

- [ ] Exact merge commit recorded.
- [ ] Render deployment for that commit monitored to completion.
- [ ] API health and database connectivity verified.
- [ ] Client built from the production commit.
- [ ] Firebase project explicitly specified during deployment.

### After release

- [ ] Firebase URL returns HTTP 200.
- [ ] Custom domain returns HTTP 200.
- [ ] Deployed assets match the verified build.
- [ ] Changed workflow smoke-tested at the safest available level.
- [ ] No unintended production data created.
- [ ] Rollback point recorded.
- [ ] This change log updated.

## 8. Security and operational hygiene

- Never place passwords, API keys, database URLs, JWT secrets, service-account JSON, or production tokens in this document or Git history.
- Use environment configuration in Render and Firebase for secrets.
- Redact tokens from terminal output and incident notes.
- Do not stage unknown untracked diagnostic files without reviewing ownership and purpose.
- Keep local verification and live production verification clearly separated in every release report.
