import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import prisma from '../prisma/client';

const getOrgId = (req: Request): string => req.user?.organizationId || 'default-tenant';

const parsePagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  return { page, limit, skip: (page - 1) * limit };
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Role Dashboards
// ─────────────────────────────────────────────────────────────────────────────
export const getRoleDashboard = async (req: Request, res: Response) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();

    const orgId = getOrgId(req);
    const [headcount, pendingLeaves, pendingReviews, openJobs] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId, isArchived: false } }),
      prisma.leaveRequest.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      prisma.performanceReviewV2.count({ where: { organizationId: orgId, status: { in: ['DRAFT', 'SUBMITTED'] } } }),
      prisma.jobPosition.count({ where: { organizationId: orgId, status: { not: 'CLOSED' } } }),
    ]);

    if (role === 'MD' || role === 'DEV') {
      const [payrollTotals, deptCount, attrition] = await Promise.all([
        prisma.payrollRun.aggregate({ 
          where: { organizationId: orgId },
          _sum: { totalNet: true, totalGross: true } 
        }),
        prisma.department.count({ where: { organizationId: orgId } }),
        prisma.user.count({ where: { organizationId: orgId, status: 'TERMINATED' } }),
      ]);

      return res.json({
        role: 'MD',
        headcount,
        payroll: payrollTotals._sum,
        departmentCount: deptCount,
        attrition,
        upcomingPayrollRun: null,
      });
    }

    if (role === 'DIRECTOR') {
      return res.json({
        role: 'DIRECTOR',
        departmentHeadcount: headcount,
        pendingLeaveApprovals: pendingLeaves,
        pendingKpiValidations: pendingReviews,
        recruitmentPipelineOpenings: openJobs,
      });
    }

    if (getRoleRank(role) >= 60 && getRoleRank(role) < 80) {
      return res.json({
        role: 'MANAGER',
        teamMembers: headcount,
        pendingLeaveApprovals: pendingLeaves,
        pendingPerformanceReviews: pendingReviews,
        attendanceAnomalies: 0,
      });
    }

    if (role === 'CASUAL') {
      return res.json({ role: 'CASUAL', assignedTasks: [], attendanceHistory: [] });
    }

    return res.json({
      role: 'STAFF',
      leaveBalance: 0,
      payslips: [],
      assignedKpis: [],
      trainingModules: [],
      announcements: [],
    });
  } catch (error) {
    console.error('[Enterprise] getRoleDashboard error', error);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Performance V2
// ─────────────────────────────────────────────────────────────────────────────
export const createDepartmentKPI = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const item = await prisma.departmentKPI.create({
      data: {
        organizationId: org,
        departmentId: asNumber(data.departmentId),
        title: asString(data.title),
        description: asString(data.description) || null,
        metricType: asString(data.metricType),
        targetValue: asNumber(data.targetValue),
        measurementPeriod: asString(data.measurementPeriod),
        assignedById: req.user?.id || '',
        assignedToId: asString(data.assignedToId) || null,
      },
    });
    return res.status(201).json(item);
  } catch (error) {
    console.error('[Enterprise] createDepartmentKPI error', error);
    return res.status(500).json({ error: 'Failed to create department KPI' });
  }
};

export const listDepartmentKPIs = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { skip, limit, page } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.departmentKPI.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.departmentKPI.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (error) {
    console.error('[Enterprise] listDepartmentKPIs error', error);
    return res.status(500).json({ error: 'Failed to list department KPIs' });
  }
};

export const createTeamTarget = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.teamTarget.create({
      data: {
        organizationId: org,
        departmentKpiId: asString(data.departmentKpiId),
        managerId: req.user?.id || '',
        teamName: asString(data.teamName) || null,
        title: asString(data.title),
        description: asString(data.description) || null,
        metricType: asString(data.metricType),
        targetValue: asNumber(data.targetValue),
        measurementPeriod: asString(data.measurementPeriod),
      },
    });
    return res.status(201).json(row);
  } catch (error) {
    console.error('[Enterprise] createTeamTarget error', error);
    return res.status(500).json({ error: 'Failed to create team target' });
  }
};

export const createEmployeeTarget = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.employeeTarget.create({
      data: {
        organizationId: org,
        teamTargetId: asString(data.teamTargetId),
        employeeId: asString(data.employeeId),
        title: asString(data.title),
        description: asString(data.description) || null,
        metricType: asString(data.metricType),
        targetValue: asNumber(data.targetValue),
        measurementPeriod: asString(data.measurementPeriod),
        assignedById: req.user?.id || '',
        assignedToId: asString(data.employeeId),
      },
    });
    return res.status(201).json(row);
  } catch (error) {
    console.error('[Enterprise] createEmployeeTarget error', error);
    return res.status(500).json({ error: 'Failed to create employee target' });
  }
};

export const upsertPerformanceReview = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const reviewId = asString(data.id);

    if (reviewId) {
      const row = await prisma.performanceReviewV2.update({
        where: { id: reviewId, organizationId: org },
        data: {
          selfReview: asString(data.selfReview) || undefined,
          managerReview: asString(data.managerReview) || undefined,
          directorReview: asString(data.directorReview) || undefined,
          selfScore: data.selfScore === undefined ? undefined : asNumber(data.selfScore),
          managerScore: data.managerScore === undefined ? undefined : asNumber(data.managerScore),
          directorScore: data.directorScore === undefined ? undefined : asNumber(data.directorScore),
          finalScore: data.finalScore === undefined ? undefined : asNumber(data.finalScore),
          status: asString(data.status) || undefined,
        },
      });
      return res.json(row);
    }

    const cycle = await prisma.reviewCycle.findFirst({ where: { organizationId: org, status: 'ACTIVE' } });
    if (!cycle) throw new Error('No active review cycle found');

    const created = await prisma.performanceReviewV2.create({
      data: {
        organizationId: org,
        employeeId: asString(data.employeeId),
        managerId: asString(data.managerId) || null,
        directorId: asString(data.directorId) || null,
        cycleId: cycle.id,
        cycle: asString(data.cycle) || cycle.title,
        selfReview: asString(data.selfReview) || null,
        status: asString(data.status) || 'DRAFT',
      },
    });
    return res.status(201).json(created);
  } catch (error) {
    console.error('[Enterprise] upsertPerformanceReview error', error);
    return res.status(500).json({ error: 'Failed to save performance review' });
  }
};

export const listPerformanceReviews = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { skip, limit, page } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.performanceReviewV2.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.performanceReviewV2.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (error) {
    console.error('[Enterprise] listPerformanceReviews error', error);
    return res.status(500).json({ error: 'Failed to list performance reviews' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATS
// ─────────────────────────────────────────────────────────────────────────────
export const createJobPosition = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.jobPosition.create({
      data: {
        organizationId: org,
        title: asString(data.title),
        departmentId: data.departmentId ? asNumber(data.departmentId) : null,
        description: asString(data.description) || null,
        location: asString(data.location) || null,
        employmentType: asString(data.employmentType) || null,
        openedById: req.user?.id || null,
      },
    });
    return res.status(201).json(row);
  } catch (error) {
    console.error('[Enterprise] createJobPosition error', error);
    return res.status(500).json({ error: 'Failed to create job position' });
  }
};

export const listJobPositions = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { skip, limit, page } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.jobPosition.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.jobPosition.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (error) {
    console.error('[Enterprise] listJobPositions error', error);
    return res.status(500).json({ error: 'Failed to list job positions' });
  }
};

export const createCandidate = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.candidate.create({
      data: {
        organizationId: org,
        jobPositionId: asString(data.jobPositionId),
        fullName: asString(data.fullName),
        email: asString(data.email) || null,
        phone: asString(data.phone) || null,
        resumeUrl: asString(data.resumeUrl) || null,
        source: asString(data.source) || null,
      },
    });
    return res.status(201).json(row);
  } catch (error) {
    console.error('[Enterprise] createCandidate error', error);
    return res.status(500).json({ error: 'Failed to create candidate' });
  }
};

export const updateCandidateStatus = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const candidateId = req.params.id;
    const status = asString(req.body.status).toUpperCase();

    const row = await prisma.candidate.update({
      where: { id: candidateId, organizationId: org },
      data: { status },
    });

    if (status === 'HIRED') {
      await prisma.onboardingChecklist.create({
        data: {
          organizationId: org,
          employeeId: asString(req.body.employeeId) || row.id,
          source: 'ATS',
          status: 'IN_PROGRESS',
          createdById: req.user?.id || null,
        },
      });
    }

    return res.json(row);
  } catch (error) {
    console.error('[Enterprise] updateCandidateStatus error', error);
    return res.status(500).json({ error: 'Failed to update candidate status' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding / Offboarding / Benefits / Shift / Announcements / Tax
// ─────────────────────────────────────────────────────────────────────────────
export const listOnboardingChecklists = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { skip, limit, page } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.onboardingChecklist.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.onboardingChecklist.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const addOnboardingTask = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.onboardingChecklistTask.create({
      data: {
        organizationId: org,
        checklistId: asString(data.checklistId),
        title: asString(data.title),
        description: asString(data.description) || null,
        category: asString(data.category) || 'GENERAL',
        dueDate: data.dueDate ? new Date(asString(data.dueDate)) : null,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const updateOnboardingTask = async (req: Request, res: Response) => {
  try {
    const row = await prisma.onboardingChecklistTask.update({
      where: { id: req.params.id, organizationId: getOrgId(req) },
      data: {
        status: asString(req.body.status) || undefined,
        completedAt: req.body.status === 'COMPLETED' ? new Date() : undefined,
        notes: asString(req.body.notes) || undefined,
        completedById: req.body.status === 'COMPLETED' ? req.user?.id : undefined,
      },
    });
    return res.json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const startOffboarding = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const row = await prisma.offboardingProcess.create({
      data: {
        organizationId: org,
        employeeId: asString(req.body.employeeId),
        triggeredById: req.user?.id || '',
        effectiveDate: req.body.effectiveDate ? new Date(asString(req.body.effectiveDate)) : null,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const completeExitInterview = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const row = await prisma.exitInterview.create({
      data: {
        organizationId: org,
        offboardingId: asString(req.body.offboardingId),
        interviewerId: req.user?.id || null,
        interviewDate: req.body.interviewDate ? new Date(asString(req.body.interviewDate)) : new Date(),
        reason: asString(req.body.reason) || null,
        feedback: asString(req.body.feedback) || null,
        rehireEligible: typeof req.body.rehireEligible === 'boolean' ? req.body.rehireEligible : null,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const recordAssetReturn = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const row = await prisma.assetReturn.create({
      data: {
        organizationId: org,
        offboardingId: asString(req.body.offboardingId),
        assetId: asString(req.body.assetId) || null,
        assetName: asString(req.body.assetName) || null,
        returned: true,
        returnedAt: new Date(),
        conditionNotes: asString(req.body.conditionNotes) || null,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createBenefitPlan = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.benefitPlan.create({
      data: {
        organizationId: org,
        name: asString(data.name),
        category: asString(data.category),
        description: asString(data.description) || null,
        employerAmount: asNumber(data.employerAmount),
        employeeAmount: asNumber(data.employeeAmount),
        taxable: Boolean(data.taxable),
        payrollCode: asString(data.payrollCode) || null,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const enrollEmployeeBenefit = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.employeeBenefitEnrollment.create({
      data: {
        organizationId: org,
        employeeId: asString(data.employeeId),
        benefitPlanId: asString(data.benefitPlanId),
        startDate: data.startDate ? new Date(asString(data.startDate)) : new Date(),
        endDate: data.endDate ? new Date(asString(data.endDate)) : null,
        employeeAmount: asNumber(data.employeeAmount),
        employerAmount: asNumber(data.employerAmount),
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createShift = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.shift.create({
      data: {
        organizationId: org,
        name: asString(data.name),
        startTime: asString(data.startTime),
        endTime: asString(data.endTime),
        timezone: asString(data.timezone) || 'Africa/Accra',
        gracePeriodMins: asNumber(data.gracePeriodMins) || 10,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const assignShift = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.employeeShift.create({
      data: {
        organizationId: org,
        employeeId: asString(data.employeeId),
        shiftId: asString(data.shiftId),
        effectiveFrom: data.effectiveFrom ? new Date(asString(data.effectiveFrom)) : new Date(),
        effectiveTo: data.effectiveTo ? new Date(asString(data.effectiveTo)) : null,
        assignedById: req.user?.id || null,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.announcement.create({
      data: {
        organizationId: org,
        title: asString(data.title),
        content: asString(data.content),
        targetAudience: asString(data.targetAudience),
        departmentId: data.departmentId ? asNumber(data.departmentId) : null,
        publishDate: data.publishDate ? new Date(asString(data.publishDate)) : new Date(),
        expirationDate: data.expirationDate ? new Date(asString(data.expirationDate)) : null,
        createdById: req.user?.id || '',
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listAnnouncements = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.announcement.findMany({ where: { organizationId: org }, orderBy: { publishDate: 'desc' }, skip, take: limit }),
      prisma.announcement.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createTaxRule = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.taxRule.create({
      data: {
        organizationId: org,
        countryCode: asString(data.countryCode),
        taxType: asString(data.taxType),
        name: asString(data.name),
        appliesTo: asString(data.appliesTo) || 'PAYROLL',
        effectiveFrom: data.effectiveFrom ? new Date(asString(data.effectiveFrom)) : new Date(),
        effectiveTo: data.effectiveTo ? new Date(asString(data.effectiveTo)) : null,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createTaxBracket = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const data = req.body as Record<string, unknown>;
    const row = await prisma.taxBracket.create({
      data: {
        organizationId: org,
        taxRuleId: asString(data.taxRuleId),
        minAmount: asNumber(data.minAmount),
        maxAmount: data.maxAmount === undefined || data.maxAmount === null ? null : asNumber(data.maxAmount),
        rate: asNumber(data.rate),
        fixedAmount: asNumber(data.fixedAmount) || 0,
      },
    });
    return res.status(201).json(row);
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listCandidates = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.candidate.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.candidate.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listBenefitPlans = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.benefitPlan.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.benefitPlan.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listBenefitEnrollments = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.employeeBenefitEnrollment.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.employeeBenefitEnrollment.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listShifts = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.shift.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.shift.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listEmployeeShifts = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.employeeShift.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.employeeShift.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const listTaxRules = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const { page, limit, skip } = parsePagination(req);
    const [rows, total] = await Promise.all([
      prisma.taxRule.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.taxRule.count({ where: { organizationId: org } }),
    ]);
    return res.json({ data: rows, pagination: { page, limit, total } });
  } catch (err: any) {
    console.error('[enterprise.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getEnterpriseSummary = async (req: Request, res: Response) => {
  try {
    const org = getOrgId(req);
    const limit = 8;

    const [
      headcount,
      pendingLeaves,
      pendingReviews,
      openJobs,
      deptKpis,
      jobs,
      candidates,
      onboarding,
      benefitPlans,
      shifts,
      announcements,
      taxRules
    ] = await Promise.all([
      prisma.user.count({ where: { organizationId: org, isArchived: false } }),
      prisma.leaveRequest.count({ where: { organizationId: org, status: 'PENDING' } }),
      prisma.performanceReviewV2.count({ where: { organizationId: org, status: { in: ['DRAFT', 'SUBMITTED'] } } }),
      prisma.jobPosition.count({ where: { organizationId: org, status: { not: 'CLOSED' } } }),
      prisma.departmentKPI.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.jobPosition.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.candidate.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.onboardingChecklist.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.benefitPlan.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.shift.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.announcement.findMany({ where: { organizationId: org }, orderBy: { publishDate: 'desc' }, take: limit }),
      prisma.taxRule.findMany({ where: { organizationId: org }, orderBy: { createdAt: 'desc' }, take: limit }),
    ]);

    res.json({
      dashboard: {
        headcount,
        pendingLeaveApprovals: pendingLeaves,
        pendingKpiValidations: pendingReviews,
        recruitmentPipelineOpenings: openJobs,
      },
      deptKpis: { data: deptKpis },
      jobs: { data: jobs },
      candidates: { data: candidates },
      onboarding: { data: onboarding },
      benefitPlans: { data: benefitPlans },
      shifts: { data: shifts },
      announcements: { data: announcements },
      taxRules: { data: taxRules },
    });
  } catch (err: any) {
    console.error('[enterprise.controller.ts] summary error', err.message);
    res.status(500).json({ error: 'Failed to fetch enterprise summary' });
  }
};
