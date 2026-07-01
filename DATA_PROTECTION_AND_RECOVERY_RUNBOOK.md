# Nexus HRM Data Protection and Recovery Runbook

- **Baseline:** 1 July 2026
- **Applies to:** Nexus HRM production API, Render Postgres, Firebase Hosting, and `mcbauchemieguinea.com`

## 1. Protection objectives

- User and HR records must never be hard-deleted through the production web API.
- Production startup must not seed, purge, migrate, or rewrite business data implicitly.
- Every backup reported as successful must be a parseable PostgreSQL dump stored outside the web service.
- Render point-in-time recovery must be enabled and verified.
- Every production change must be traceable to a reviewed pull request and a tested commit.
- Recovery must restore into an isolated database first; never overwrite the only production copy during investigation.

Target operating objectives:

- Recovery point objective (RPO): at most 12 hours from independent logical backups; use Render PITR for more recent recovery.
- Recovery time objective (RTO): four hours for database recovery and application cutover after incident confirmation.
- Restore drill: monthly in a non-production database.

## 2. Incident containment performed on 1 July 2026

- The July Firebase client release was rolled back to finalized Hosting version `593c456191dc07f5` from 24 April 2026.
- Rollback release: `1782913415517000`.
- The rollback changed only static frontend files and did not touch PostgreSQL.
- Both Firebase Hosting and the custom domain returned HTTP 200 after rollback.
- The Render API remained healthy and database-connected.
- No database reset, purge, seed, repair, or restore was run.

## 3. Application safeguards

The data-safety middleware blocks destructive API operations in production even if `ALLOW_DESTRUCTIVE_OPERATIONS=true` is configured. Outside production, destructive operations require an explicit opt-in and retain their role checks.

Production-blocked operations include:

- Tenant-wide transactional purge.
- Employee hard deletion.
- Department hard deletion.
- Appraisal orphan purge and ultimate reset.
- Appraisal packet and cycle hard deletion.
- Review-cycle hard deletion.
- Leave and handover hard deletion.
- Payroll-run hard deletion.
- Audit-log cleanup.

Normal non-destructive lifecycle actions remain available, including employee archival, employee restoration, leave cancellation, payroll voiding, and account deactivation.

The appraisal reset implementation is tenant-scoped as defense in depth. No reset query is allowed to use an unfiltered `deleteMany`.

## 4. Read-only startup policy

Application startup must remain read-only by default:

- Setup and cleanup scripts are never imported automatically.
- Seeding is a manual, reviewed one-off operation only.
- Target synchronization runs only when `RUN_STARTUP_TARGET_SYNC=true` is deliberately configured.
- Prisma migrations run only through `prisma migrate deploy` after pull-request review.

Never make startup behavior depend on the absence of a marker such as `SETUP_COMPLETE`. Missing configuration must fail safe, not trigger data creation or rewriting.

## 5. Backup layers

### Layer A: Render Postgres point-in-time recovery

This is the primary incident-recovery layer.

Required production account checks:

- Confirm the database is on a paid Render Postgres instance.
- Open the database Recovery page and confirm PITR is available.
- Record the available recovery window.
- Create an on-demand logical export before risky migrations.
- During recovery, create a separate recovered database, validate counts and workflows, then update the API connection only after approval.

### Layer B: Independent logical dump

The server backup job now:

1. Runs `pg_dump` in PostgreSQL custom format.
2. Verifies the `PGDMP` archive signature.
3. Parses the archive catalog with `pg_restore --list`.
4. Calculates a SHA-256 checksum.
5. Uploads the dump to Google Drive.
6. Confirms remote size and MD5 match the local dump.
7. Writes a `BackupLog` success or failure record.
8. Fails the job if a production cloud copy cannot be verified.

The old metadata-placeholder fallback is prohibited. A failed dump is a failed backup.

Required secrets/configuration:

```text
REQUIRE_CLOUD_BACKUP=true
GOOGLE_DRIVE_KEY_JSON=<secret service-account JSON>
```

Render web-service files are ephemeral and must never be the sole backup location.

### Layer C: Offline retention

- Download at least one verified logical export per week to encrypted storage outside Render and Google Drive.
- Retain monthly recovery points according to the organization's HR and legal retention policy.
- Limit backup access to named administrators and review access quarterly.

## 6. Backup verification and restore drill

A backup is valid only when all of these pass:

- Non-zero custom-format PostgreSQL archive.
- `pg_restore --list` succeeds.
- Local SHA-256 is recorded.
- Remote size and checksum match.
- Test restore into an empty non-production PostgreSQL database succeeds.
- Aggregate counts for organizations, users, departments, leave requests, payroll runs, and appraisal packets match the source snapshot.
- A test login and representative read-only workflows succeed against the restored database.

Never restore a dump into the active production schema during a drill.

## 7. Data-integrity snapshot

An authenticated MD-level endpoint is available:

```text
GET /api/maintenance/integrity
```

It returns aggregate counts only, not employee personal data:

- Users, active directory users, and archived users.
- Departments and sub-units.
- Leave requests.
- Payroll runs.
- Appraisal packets.
- Audit logs.
- Latest backup status.

Capture this snapshot before and after each production release. An unexplained decrease blocks release completion and triggers incident review.

## 8. Migration policy

- Prefer additive migrations: add nullable fields/tables first, backfill separately, then enforce constraints in a later release.
- Never use `prisma db push --accept-data-loss` in production.
- Pull-request CI rejects changed migration SQL containing `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `DELETE FROM`.
- Destructive transformations require a separate backup-first migration plan, isolated rehearsal, row counts, and written approval.
- Confirm the current database migration status before and after deployment.

## 9. Release controls

GitHub `main` must be protected with:

- Pull requests required before merging.
- The `data-safety` check required.
- Direct pushes and force pushes disabled.
- At least one approving review for migrations or data-access changes.

Release sequence:

1. Record pre-release integrity counts and latest verified backup.
2. Run focused tests, full server tests, type checks, and builds.
3. Review the exact pull-request file list and migration SQL.
4. Merge and monitor the exact Render deployment commit.
5. Confirm API health and post-release integrity counts.
6. Release Firebase only from the exact reviewed commit.
7. Verify both production domains and the changed workflow.
8. Record rollback points.

## 10. Recovery decision process

If data appears missing:

1. Stop deployments and destructive maintenance actions.
2. Determine whether the issue is UI filtering, authorization, tenant mapping, API failure, or actual row loss.
3. Capture current aggregate counts and audit evidence.
4. Do not create replacement records before determining whether originals still exist.
5. If rows exist, correct visibility or tenant mapping with an audited, targeted repair.
6. If rows are missing, use Render PITR to create an isolated database from immediately before the event.
7. Validate recovered counts and sampled workflows.
8. Approve connection cutover or a targeted merge-back plan.
9. Preserve the original database until recovery is verified and signed off.

## 11. Required external actions

These cannot be completed from the source repository alone:

- Verify the Render Postgres plan and PITR status in the Render dashboard.
- Create and download a current Render logical export.
- Configure `GOOGLE_DRIVE_KEY_JSON` as a Render secret.
- Confirm `pg_dump` and `pg_restore` are installed in the backup runtime.
- Run and document the first isolated restore drill.
- Enable GitHub branch protection and require the `data-safety` check after the workflow is present on `main`.
