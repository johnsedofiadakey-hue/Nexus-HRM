import prisma from '../prisma/client';

/**
 * PurgeService — Wipes all transactional / seeded data from the system.
 * Preserves: Users, Departments, SubUnits, SystemSettings, Organization.
 * Destroys: Targets, Appraisals, Leave Requests, Attendance, Payroll, Expenses, Loans, Notifications, Announcements.
 *
 * Intended for production onboarding / demo reset only.
 * Requires DEV or MD-level access and explicit confirmation.
 */
export class PurgeService {
  static async purgeTransactionalData(organizationId: string): Promise<{ wiped: Record<string, number> }> {
    const wiped: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {

      // ── 1. PERFORMANCE: Targets (cascade handles metrics, updates, acknowledgements) ──
      const targetUpdates = await (tx as any).targetUpdate.deleteMany({ where: { organizationId } });
      wiped.targetUpdates = targetUpdates.count;

      const targetAcks = await (tx as any).targetAcknowledgement.deleteMany({ where: { organizationId } });
      wiped.targetAcknowledgements = targetAcks.count;

      const targetMetrics = await tx.targetMetric.deleteMany({ where: { organizationId } });
      wiped.targetMetrics = targetMetrics.count;

      // Delete child targets first, then parents
      await (tx as any).target.deleteMany({ where: { organizationId, parentTargetId: { not: null } } });
      const targets = await (tx as any).target.deleteMany({ where: { organizationId } });
      wiped.targets = targets.count;

      // ── 2. APPRAISALS ──
      const appraisalReviews = await (tx as any).appraisalReview.deleteMany({ where: { organizationId } });
      wiped.appraisalReviews = appraisalReviews.count;

      const appraisalPackets = await (tx as any).appraisalPacket.deleteMany({ where: { organizationId } });
      wiped.appraisalPackets = appraisalPackets.count;

      const appraisalCycles = await (tx as any).appraisalCycle.deleteMany({ where: { organizationId } });
      wiped.appraisalCycles = appraisalCycles.count;

      // ── 3. LEAVE REQUESTS ──
      const leaveRequests = await (tx as any).leaveRequest.deleteMany({ where: { organizationId } });
      wiped.leaveRequests = leaveRequests.count;

      // ── 4. ATTENDANCE ──
      const attendanceLogs = await (tx as any).attendanceLog.deleteMany({ where: { organizationId } });
      wiped.attendanceLogs = attendanceLogs.count;

      // ── 5. PAYROLL ──
      const payrollItems = await (tx as any).payrollItem.deleteMany({ where: { organizationId } });
      wiped.payrollItems = payrollItems.count;

      const payrollRuns = await (tx as any).payrollRun.deleteMany({ where: { organizationId } });
      wiped.payrollRuns = payrollRuns.count;

      // ── 6. FINANCE (Expenses & Loans) ──
      const expenses = await (tx as any).expenseClaim.deleteMany({ where: { organizationId } });
      wiped.expenses = expenses.count;

      const loans = await (tx as any).loan.deleteMany({ where: { organizationId } });
      wiped.loans = loans.count;

      // ── 7. NOTIFICATIONS & ANNOUNCEMENTS ──
      const notifications = await (tx as any).notification.deleteMany({ where: { organizationId } });
      wiped.notifications = notifications.count;

      const announcements = await (tx as any).announcement.deleteMany({ where: { organizationId } });
      wiped.announcements = announcements.count;

      // ── 8. AUDIT LOGS (clean slate for production) ──
      const auditLogs = await (tx as any).auditLog.deleteMany({ where: { organizationId } });
      wiped.auditLogs = auditLogs.count;

      // ── 9. KPI SHEETS ──
      const kpiItems = await (tx as any).kpiItem.deleteMany({ where: { organizationId } });
      wiped.kpiItems = kpiItems.count;

      const kpiSheets = await (tx as any).kpiSheet.deleteMany({ where: { organizationId } });
      wiped.kpiSheets = kpiSheets.count;

      // ── 10. ONBOARDING SESSIONS ──
      const onboardingSessions = await (tx as any).onboardingSession.deleteMany({ where: { organizationId } });
      wiped.onboardingSessions = onboardingSessions.count;

      // ── 11. REVIEW CYCLES (General Cycles table) ──
      const cycles = await (tx as any).cycle.deleteMany({ where: { organizationId } });
      wiped.cycles = cycles.count;

    }, { timeout: 30000 });

    console.log(`[PurgeService] Transactional data purge complete for org ${organizationId}:`, wiped);
    return { wiped };
  }
}
