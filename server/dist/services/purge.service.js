"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurgeService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
/**
 * PurgeService — Wipes all transactional / seeded data from the system.
 * Preserves: Users, Departments, SubUnits, SystemSettings, Organization.
 * Destroys: Targets, Appraisals, Leave Requests, Attendance, Payroll, Expenses, Loans, Notifications, Announcements.
 *
 * Intended for production onboarding / demo reset only.
 * Requires DEV or MD-level access and explicit confirmation.
 */
class PurgeService {
    static async purgeTransactionalData(organizationId) {
        const wiped = {};
        await client_1.default.$transaction(async (tx) => {
            // ── 1. PERFORMANCE: Targets (cascade handles metrics, updates, acknowledgements) ──
            const targetUpdates = await tx.targetUpdate.deleteMany({ where: { organizationId } });
            wiped.targetUpdates = targetUpdates.count;
            const targetAcks = await tx.targetAcknowledgement.deleteMany({ where: { organizationId } });
            wiped.targetAcknowledgements = targetAcks.count;
            const targetMetrics = await tx.targetMetric.deleteMany({ where: { organizationId } });
            wiped.targetMetrics = targetMetrics.count;
            // Delete child targets first, then parents
            await tx.target.deleteMany({ where: { organizationId, parentTargetId: { not: null } } });
            const targets = await tx.target.deleteMany({ where: { organizationId } });
            wiped.targets = targets.count;
            // ── 2. APPRAISALS ──
            const appraisalReviews = await tx.appraisalReview.deleteMany({ where: { organizationId } });
            wiped.appraisalReviews = appraisalReviews.count;
            const appraisalPackets = await tx.appraisalPacket.deleteMany({ where: { organizationId } });
            wiped.appraisalPackets = appraisalPackets.count;
            const appraisalCycles = await tx.appraisalCycle.deleteMany({ where: { organizationId } });
            wiped.appraisalCycles = appraisalCycles.count;
            // ── 3. LEAVE REQUESTS ──
            const leaveRequests = await tx.leaveRequest.deleteMany({ where: { organizationId } });
            wiped.leaveRequests = leaveRequests.count;
            // ── 4. ATTENDANCE ──
            const attendanceLogs = await tx.attendanceLog.deleteMany({ where: { organizationId } });
            wiped.attendanceLogs = attendanceLogs.count;
            // ── 5. PAYROLL ──
            const payrollItems = await tx.payrollItem.deleteMany({ where: { organizationId } });
            wiped.payrollItems = payrollItems.count;
            const payrollRuns = await tx.payrollRun.deleteMany({ where: { organizationId } });
            wiped.payrollRuns = payrollRuns.count;
            // ── 6. FINANCE (Expenses & Loans) ──
            const expenses = await tx.expenseClaim.deleteMany({ where: { organizationId } });
            wiped.expenses = expenses.count;
            const loans = await tx.loan.deleteMany({ where: { organizationId } });
            wiped.loans = loans.count;
            // ── 7. NOTIFICATIONS & ANNOUNCEMENTS ──
            const notifications = await tx.notification.deleteMany({ where: { organizationId } });
            wiped.notifications = notifications.count;
            const announcements = await tx.announcement.deleteMany({ where: { organizationId } });
            wiped.announcements = announcements.count;
            // ── 7. RECRUITMENT (Universal ATS Purge) ──
            const offerLetters = await tx.offerLetter.deleteMany({ where: { organizationId } });
            wiped.offerLetters = offerLetters.count;
            const interviewFeedback = await tx.interviewFeedback.deleteMany({ where: { organizationId } });
            wiped.interviewFeedback = interviewFeedback.count;
            const interviewStages = await tx.interviewStage.deleteMany({ where: { organizationId } });
            wiped.interviewStages = interviewStages.count;
            const candidates = await tx.candidate.deleteMany({ where: { organizationId } });
            wiped.candidates = candidates.count;
            const jobPositions = await tx.jobPosition.deleteMany({ where: { organizationId } });
            wiped.jobPositions = jobPositions.count;
            // ── 8. SUPPORT & HELPDESK ──
            const supportTickets = await tx.supportTicket.deleteMany({ where: { organizationId } });
            wiped.supportTickets = supportTickets.count;
            const ticketComments = await tx.ticketComment.deleteMany({ where: { organizationId } });
            wiped.ticketComments = ticketComments.count;
            // ── 9. OFFBOARDING & EXIT ──
            const exitInterviews = await tx.exitInterview.deleteMany({ where: { organizationId } });
            wiped.exitInterviews = exitInterviews.count;
            const assetReturns = await tx.assetReturn.deleteMany({ where: { organizationId } });
            wiped.assetReturns = assetReturns.count;
            const offboardingProcesses = await tx.offboardingProcess.deleteMany({ where: { organizationId } });
            wiped.offboardingProcesses = offboardingProcesses.count;
            // ── 10. ONBOARDING & TRAINING ──
            const onboardingItems = await tx.onboardingItem.deleteMany({ where: { organizationId } });
            wiped.onboardingItems = onboardingItems.count;
            const onboardingSessions = await tx.onboardingSession.deleteMany({ where: { organizationId } });
            wiped.onboardingSessions = onboardingSessions.count;
            const trainingEnrollments = await tx.trainingEnrollment.deleteMany({ where: { organizationId } });
            wiped.trainingEnrollments = trainingEnrollments.count;
            const trainingPrograms = await tx.trainingProgram.deleteMany({ where: { organizationId } });
            wiped.trainingPrograms = trainingPrograms.count;
            // ── 11. ASSETS & BENEFITS ──
            const assetAssignments = await tx.assetAssignment.deleteMany({ where: { organizationId } });
            wiped.assetAssignments = assetAssignments.count;
            const benefitEnrollments = await tx.employeeBenefitEnrollment.deleteMany({ where: { organizationId } });
            wiped.benefitEnrollments = benefitEnrollments.count;
            // ── 12. ADMINISTRATIVE NOISE (Logs & Security) ──
            const auditLogs = await tx.auditLog.deleteMany({ where: { organizationId } });
            wiped.auditLogs = auditLogs.count;
            const systemLogs = await tx.systemLog.deleteMany({ where: { organizationId } });
            wiped.systemLogs = systemLogs.count;
            const apiUsage = await tx.apiUsage.deleteMany({ where: { organizationId } });
            wiped.apiUsage = apiUsage.count;
            const securityEvents = await tx.loginSecurityEvent.deleteMany({ where: { organizationId } });
            wiped.securityEvents = securityEvents.count;
            // ── 13. PERFORMANCE V2 & KPI SHEETS ──
            const performanceScores = await tx.performanceScore.deleteMany({ where: { organizationId } });
            wiped.performanceScores = performanceScores.count;
            const performanceReviews = await tx.performanceReviewV2.deleteMany({ where: { organizationId } });
            wiped.performanceReviews = performanceReviews.count;
            const employeeTargets = await tx.employeeTarget.deleteMany({ where: { organizationId } });
            wiped.employeeTargets = employeeTargets.count;
            const teamTargets = await tx.teamTarget.deleteMany({ where: { organizationId } });
            wiped.teamTargets = teamTargets.count;
            const departmentKpis = await tx.departmentKPI.deleteMany({ where: { organizationId } });
            wiped.departmentKpis = departmentKpis.count;
            const kpiUpdates = await tx.kpiUpdate.deleteMany({ where: { organizationId } });
            wiped.kpiUpdates = kpiUpdates.count;
            const kpiItems = await tx.kpiItem.deleteMany({ where: { organizationId } });
            wiped.kpiItems = kpiItems.count;
            const kpiSheets = await tx.kpiSheet.deleteMany({ where: { organizationId } });
            wiped.kpiSheets = kpiSheets.count;
            // Review Cycles
            const reviewCycles = await tx.reviewCycle.deleteMany({ where: { organizationId } });
            wiped.reviewCycles = reviewCycles.count;
            const cycles = await tx.cycle.deleteMany({ where: { organizationId } });
            wiped.cycles = cycles.count;
        }, { timeout: 60000 }); // Extended timeout for universal purge
        console.log(`[PurgeService] Global transactional data purge complete for org ${organizationId}:`, wiped);
        return { wiped };
    }
}
exports.PurgeService = PurgeService;
