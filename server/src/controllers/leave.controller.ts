import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { getRoleRank } from '../middleware/auth.middleware';
import { determineInitialLeaveStatus, getEffectiveLeaveMetrics } from '../utils/leave.utils';
import { LeaveService } from '../services/leave.service';
import { HierarchyService } from '../services/hierarchy.service';
import { notify } from '../services/websocket.service';
import { errorLogger } from '../services/error-log.service';
import { logger } from '../utils/logger';
import { LEAVE_ACTIONS } from '../constants/leave.constants';

const getOrgId = (req: Request): string => req.user?.organizationId ?? 'default-tenant';

// Working-day calculator (weekends & holidays excluded) - Timezone Stable
const calcWorkingDays = (start: Date, end: Date, holidayDates: string[] = []): number => {
  let count = 0;
  // Use UTC to avoid local timezone shifts during day iteration
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const fin = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  
  const holidaySet = new Set(holidayDates);

  while (cur <= fin) {
    const d = cur.getUTCDay(); // 0=Sun, 6=Sat
    const dateStr = cur.toISOString().split('T')[0];
    
    // Skip weekends and registered public holidays
    if (d !== 0 && d !== 6 && !holidaySet.has(dateStr)) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return Math.max(1, count);
};

// ── 1. APPLY FOR LEAVE ────────────────────────────────────────────────────────
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reason, relieverId, leaveType, handoverNotes, relieverAcceptanceRequired } = req.body;
    const orgId = getOrgId(req);
    const user = req.user;
    const employeeId = user.id;
    const rank = getRoleRank(user.role);

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'startDate, endDate, and reason are required' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const employee = await prisma.user.findFirst({ where: { id: employeeId, organizationId: orgId } });
    if (!employee) return res.status(404).json({ error: 'User not found' });

    // ── L1 FIX: Reliever rank check removed (Any employee can relieve any employee) ──
    if (relieverId) {
      const reliever = await prisma.user.findFirst({ where: { id: relieverId, organizationId: orgId, isArchived: false } });
      if (!reliever) return res.status(400).json({ error: 'Selected reliever not found' });
    }

    // Fetch public holidays for this org to exclude from calculation
    const holidays = await prisma.publicHoliday.findMany({
      where: { organizationId: orgId, date: { gte: new Date(startDate), lte: new Date(endDate) } }
    });
    const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);

    const daysRequested = calcWorkingDays(new Date(startDate), new Date(endDate), holidayDates);

    // Balance check (skip for Directors+)
    let borrowingWarning: string | null = null;
    if (rank < 80) {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { allowLeaveBorrowing: true, borrowingLimit: true, defaultLeaveAllowance: true } });
      const balance = Number(employee.leaveBalance || 0);
      const allowBorrowing = org?.allowLeaveBorrowing ?? false;
      const borrowLimit = Number(org?.borrowingLimit ?? 5);
      const annualAllowance = Number(org?.defaultLeaveAllowance || 30);

      // 🛡️ CUMULATIVE BORROWING: Track total borrowed across all pending requests
      const pendingRequests = await prisma.leaveRequest.findMany({
        where: {
          employeeId,
          organizationId: orgId,
          status: { notIn: ['APPROVED', 'CANCELLED', 'MANAGER_REJECTED', 'MD_REJECTED', 'RELIEVER_DECLINED'] },
          isArchived: false
        },
        select: { leaveDays: true }
      });

      let totalBorrowed = 0;
      for (const r of pendingRequests) {
        const daysFromBalance = Number(r.leaveDays || 0) - balance;
        if (daysFromBalance > 0) {
          totalBorrowed += daysFromBalance;
        }
      }

      const newBorrowNeeded = Math.max(0, daysRequested - balance);
      const totalNewBorrow = totalBorrowed + newBorrowNeeded;

      if (allowBorrowing && totalNewBorrow > borrowLimit) {
        return res.status(400).json({
          error: `Borrowing limit exceeded. You are already borrowing ${totalBorrowed} days across pending requests. Adding ${newBorrowNeeded} more would exceed your ${borrowLimit}-day limit. Total would be ${totalNewBorrow} days.`
        });
      }

      const effectiveLimit = allowBorrowing ? (balance + (borrowLimit - totalBorrowed)) : balance;

      if (effectiveLimit < daysRequested) {
        const remainingBorrow = Math.max(0, borrowLimit - totalBorrowed);
        const errorMsg = allowBorrowing
          ? `Insufficient leave balance. You have ${balance} days and can borrow up to ${remainingBorrow} more (you're already borrowing ${totalBorrowed}). Total available: ${effectiveLimit}. Requested: ${daysRequested}.`
          : `Insufficient leave balance. You have ${balance} days remaining, requested ${daysRequested}.`;
        return res.status(400).json({ error: errorMsg });
      }

      // ── BORROWING ANALYTICS: Calculate Recovery Horizon ─────────────────
      if (balance < daysRequested) {
        const debt = Math.abs(balance - daysRequested);
        const yearsToRecover = (debt / annualAllowance).toFixed(1);
        borrowingWarning = `⚠️ LEAVE BORROWING ALERT: This request uses ${debt} days from your future allocation. At your current accrual rate, you will have a zero/negative balance for approximately ${yearsToRecover} years.`;
      }
    }

    // ── Check for Department Overlap (20% concurrency warning) ──
    let overlapWarning: string | null = null;
    if (employee.departmentId) {
      const overlap = await LeaveService.checkLeaveOverlap(orgId, employee.departmentId, new Date(startDate), new Date(endDate));
      if (overlap.warning) {
        overlapWarning = overlap.message || 'Potential departmental overlap detected';
      }
    }

    // ── RELIEVER LOCK: Cannot take leave if covering for someone else ────────────────
    const myCoverage = await prisma.leaveRequest.findFirst({
      where: {
        organizationId: orgId,
        relieverId: employeeId,
        status: { in: ['APPROVED', 'MANAGER_REVIEW', 'MD_REVIEW', 'RELIEVER_ACCEPTED', 'SUBMITTED'] },
        isArchived: false,
        OR: [
          { startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } }
        ]
      },
      include: { employee: { select: { fullName: true } } }
    });

    if (myCoverage) {
      return res.status(400).json({ 
        error: `Reliever Lock Active: You are assigned as a cover person for ${myCoverage.employee.fullName} during this period (${new Date(myCoverage.startDate).toLocaleDateString()} to ${new Date(myCoverage.endDate).toLocaleDateString()}). You cannot request leave while serving as a reliever.` 
      });
    }

    const initialStatus = determineInitialLeaveStatus(user.role, relieverId);

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId: orgId,
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        leaveDays: daysRequested,
        reason,
        leaveType: leaveType || 'Annual',
        relieverId: relieverId || null,
        handoverNotes: handoverNotes || null,
        relieverAcceptanceRequired: !!relieverAcceptanceRequired,
        status: initialStatus,
      },
    });

    // Notify reliever or supervisor with fallback chain — wrapped so WebSocket outage never blocks leave creation
    try {
      if (relieverId) {
        const noteSnippet = handoverNotes ? `\n\nHandover: ${handoverNotes.substring(0, 60)}${handoverNotes.length > 60 ? '...' : ''}` : '';
        await notify(relieverId, '🤝 Handover Request', `${employee.fullName} has requested you as reliever for ${daysRequested} day(s).${noteSnippet}`, 'INFO', '/leave');
      } else {
        // 🛡️ SUPERVISOR FALLBACK CHAIN: If no direct supervisor, escalate to dept manager → HR
        let notified = false;

        if (employee.supervisorId) {
          await notify(employee.supervisorId, '📅 New Leave Request', `${employee.fullName} has requested ${daysRequested} day(s) of leave.`, 'INFO', '/leave');
          notified = true;
        } else if (employee.departmentId) {
          // Escalate to department manager
          const deptManager = await prisma.user.findFirst({
            where: {
              organizationId: orgId,
              departmentId: employee.departmentId,
              role: { in: ['MANAGER', 'DIRECTOR', 'MD', 'HR_OFFICER'] },
              isArchived: false,
              status: 'ACTIVE'
            },
            orderBy: { createdAt: 'asc' }
          });
          if (deptManager) {
            await notify(deptManager.id, '📅 Leave Request (No Direct Supervisor)',
              `${employee.fullName} has requested ${daysRequested} day(s) of leave. Note: This employee has no direct supervisor assigned.`, 'WARNING', '/leave');
            notified = true;
          }
        }

        // Final fallback: HR
        if (!notified) {
          const hr = await prisma.user.findFirst({
            where: {
              organizationId: orgId,
              role: { in: ['HR_OFFICER', 'HR_ADMIN', 'DIRECTOR', 'MD'] },
              isArchived: false,
              status: 'ACTIVE'
            },
            orderBy: { createdAt: 'asc' }
          });
          if (hr) {
            await notify(hr.id, '📅 Leave Request (Escalated to HR)',
              `${employee.fullName} has requested ${daysRequested} day(s) of leave. No direct supervisor or department manager found.`, 'WARNING', '/leave');
          }
        }
      }
    } catch (notifyErr: any) {
      logger.warn('Leave notification failed (non-fatal)', { error: notifyErr?.message });
    }

    await logAction(employeeId, 'LEAVE_APPLIED', 'LeaveRequest', leave.id, { daysRequested, leaveType }, req.ip);
    
    // Combine warnings
    const combinedWarning = [overlapWarning, borrowingWarning].filter(Boolean).join(' | ');
    return res.status(201).json({ ...leave, warning: combinedWarning || null });


  } catch (err: any) {
    errorLogger.log('LeaveController.applyForLeave', err);
    return res.status(500).json({ error: err.message || 'Failed to submit leave request' });
  }
};

// ── 1.5 CALCULATE EXACT DAYS FOR FRONTEND PREVIEW ─────────────────────────
export const calculateLeaveDays = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    const orgId = getOrgId(req);
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) return res.json({ days: null });
    
    const holidays = await prisma.publicHoliday.findMany({
      where: { organizationId: orgId, date: { gte: new Date(startDate), lte: new Date(endDate) } }
    });
    const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);
    const days = calcWorkingDays(new Date(startDate), new Date(endDate), holidayDates);
    return res.json({ days });
  } catch (e: any) {
    return res.json({ days: null });
  }
};

// ── 2. GET ELIGIBLE RELIEVERS ─────────────────────────────────────────────────
// L1 FIX: Any active employee can relieve any other employee — no rank
// restriction is applied here by design (see applyForLeave for the matching note).
export const getEligibleRelievers = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = req.user.id;

    const me = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { role: true } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const eligible = await prisma.user.findMany({
      where: { organizationId: orgId, isArchived: false, status: 'ACTIVE', id: { not: userId } },
      select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
    });

    return res.json(eligible);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 3. GET MY LEAVES ──────────────────────────────────────────────────────────
export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { employeeId: userId, organizationId: orgId, isArchived: false },
        orderBy: { createdAt: 'desc' },
        include: {
          reliever: { select: { fullName: true } },
          employee: { select: { fullName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where: { employeeId: userId, organizationId: orgId, isArchived: false } }),
    ]);

    const sanitizedLeaves = leaves.map(l => ({
      ...l,
      leaveDays: Number(l.leaveDays)
    }));

    return res.json({ leaves: sanitizedLeaves, total, page, pages: Math.ceil(total / limit) });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 4. MY LEAVE BALANCE ───────────────────────────────────────────────────────
export const getMyLeaveBalance = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = req.user.id;
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { 
        leaveBalance: true, 
        leaveAllowance: true,
        leaveBroughtForward: true,
        organization: {
          select: { defaultLeaveAllowance: true }
        }
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Hierarchy of precedence: 
    // 1. User specified allowance 
    // 2. Organization default
    // 3. System hardcode (24)
    const metrics = getEffectiveLeaveMetrics(user);

    return res.json({ 
      leaveBalance: metrics.balance, 
      leaveAllowance: metrics.allowance,
      leaveBroughtForward: metrics.broughtForward
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 5. GET PENDING (Manager/HR queue) ─────────────────────────────────────────
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id: managerId, role } = req.user;
    const rank = getRoleRank(role);

    let leaves: any[];

    if (rank >= 80) {
      // Directors+ see ALL pending across organization
      leaves = await prisma.leaveRequest.findMany({
        where: { 
          organizationId: orgId, 
          status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED', 'MD_REVIEW', 'RELIEVER_ACCEPTED'] },
          isArchived: false
        },
        include: {
          employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
          reliever: { select: { fullName: true } },
        },
        orderBy: { startDate: 'asc' },
      });
    } else {
    const ids = await HierarchyService.getManagedEmployeeIds(managerId, orgId);

      leaves = await prisma.leaveRequest.findMany({
        where: { organizationId: orgId, employeeId: { in: ids }, status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED', 'RELIEVER_ACCEPTED'] }, isArchived: false },
        include: {
          employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
          reliever: { select: { fullName: true } },
        },
        orderBy: { startDate: 'asc' },
      });
    }

    const sanitizedLeaves = leaves.map(l => ({
      ...l,
      leaveDays: Number(l.leaveDays)
    }));

    return res.json(sanitizedLeaves);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 6. PROCESS LEAVE (Reliever / Manager / HR) ────────────────────────────────
export const processLeave = async (req: Request, res: Response) => {
  try {
    const { id, action, comment, role: actorRoleHint } = req.body;
    const actorId = req.user.id;
    const actorRole = req.user.role;
    const rank = getRoleRank(actorRole);

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: { select: { role: true, supervisorId: true, departmentId: true, fullName: true } } }
    });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    let updated: any;

    // 1. Reliever Response (Explicitly as reliever)
    if (actorRoleHint === 'RELIEVER' || (leave.status === 'SUBMITTED' && leave.relieverId === actorId)) {
      updated = await LeaveService.respondAsReliever(id, actorId, action === LEAVE_ACTIONS.APPROVE, comment);
    } 
    // 2. Manager / HR Processing (Rank >= 60)
    else if (rank >= 60) {
      // ── MD / Director (Rank 85+) Absolute Oversight ───────────────────────
      if (rank >= 85) {
        const employeeRank = getRoleRank(leave.employee.role);
        const isManager = employeeRank >= 70;

        // 🛡️ SECURITY: Don't let MD bypass manager review for staff leaves
        // Staff must go through MANAGER_REVIEW first
        if (!isManager && leave.status === 'MANAGER_REVIEW') {
          return res.status(400).json({
            error: 'Staff leaves must be reviewed by a line manager first. MD cannot skip this stage.'
          });
        }

        if (leave.status === 'MD_REVIEW') {
          // Final sign-off
          updated = await LeaveService.mdFinalReview(id, actorId, action === LEAVE_ACTIONS.APPROVE, comment);
        } else if (isManager && ['SUBMITTED', 'RELIEVER_ACCEPTED'].includes(leave.status)) {
          // Manager leaves: MD can process from SUBMITTED/RELIEVER_ACCEPTED directly to MD_REVIEW
          updated = await LeaveService.managerReview(id, actorId, action === LEAVE_ACTIONS.APPROVE, comment);

          // Auto-finalize manager leaves after MD approval
          if (action === LEAVE_ACTIONS.APPROVE) {
            const freshLeave = await prisma.leaveRequest.findUnique({
              where: { id },
              include: { employee: { select: { role: true } } }
            });
            if (freshLeave?.status === 'MD_REVIEW') {
              updated = await LeaveService.mdFinalReview(id, actorId, true, comment || 'Administrative terminal approval');
            }
          }
        } else if (!isManager && ['SUBMITTED', 'RELIEVER_ACCEPTED'].includes(leave.status)) {
          // Staff leaves: MD should not process these—let manager handle it
          return res.status(400).json({
            error: 'Staff leave requests must be routed to their line manager first. This is not a valid MD processing stage.'
          });
        } else {
          return res.status(400).json({ error: `Cannot process leave in current status: ${leave.status}` });
        }
      } 
      // ── Standard Manager (Rank 60-84) ──────────────────────────────────
      else if (['SUBMITTED', 'RELIEVER_ACCEPTED', 'MANAGER_REVIEW'].includes(leave.status)) {
        updated = await LeaveService.managerReview(id, actorId, action === LEAVE_ACTIONS.APPROVE, comment);
      } 
      // ── Status Lock ──────────────────────────────────────────────────
      else {
        return res.status(400).json({ error: `Cannot process leave in current status: ${leave.status}` });
      }
    }
    else {
      return res.status(403).json({ error: 'Not authorized to process this leave request' });
    }

    await logAction(actorId, `LEAVE_${action}_BY_${actorRoleHint || actorRole}`, 'LeaveRequest', id, { comment }, req.ip);
    return res.json(updated);
  } catch (error: any) {
    console.error(`[ProcessLeave Error] ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
};

// ── 7. CANCEL LEAVE ───────────────────────────────────────────────────────────
export const cancelLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);
    const userId = req.user.id;

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.employeeId !== userId) return res.status(403).json({ error: 'Not your leave request' });
    if (leave.status === 'APPROVED') return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });
    // Already at a terminal state — cancelling now would overwrite the real
    // outcome (e.g. a rejection reason) with a generic "Cancelled" status.
    const terminalStatuses = ['CANCELLED', 'MANAGER_REJECTED', 'MD_REJECTED', 'RELIEVER_DECLINED'];
    if (terminalStatuses.includes(leave.status)) {
      return res.status(400).json({ error: `This request is already ${leave.status === 'CANCELLED' ? 'cancelled' : 'closed (rejected)'} and cannot be cancelled again.` });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await logAction(userId, 'LEAVE_CANCELLED', 'LeaveRequest', id, {}, req.ip);
    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 7.5 CANCEL APPROVED LEAVE (HR/MD only) ───────────────────────────────────
export const cancelApprovedLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);
    const actorId = req.user.id;
    const rank = getRoleRank(req.user.role);

    if (rank < 75) {
      return res.status(403).json({ error: 'Only HR/Director+ can cancel approved leaves' });
    }

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Only approved leaves can be cancelled by HR' });
    }

    await prisma.$transaction(async (tx) => {
      // Restore balance atomically
      const user = await tx.user.findUnique({ where: { id: leave.employeeId } });
      if (user) {
        const restored = Number(user.leaveBalance || 0) + Number(leave.leaveDays || 0);
        await tx.user.update({
          where: { id: user.id },
          data: { leaveBalance: restored }
        });
      }

      // Mark as cancelled
      await tx.leaveRequest.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });
    });

    await logAction(actorId, 'LEAVE_CANCELLED_BY_HR', 'LeaveRequest', id, { reason: 'HR administrative cancellation' }, req.ip);
    await notify(leave.employeeId, '⚠️ Leave Cancelled',
      `Your approved leave (${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}) has been cancelled by HR. Your balance has been restored.`,
      'WARNING', '/leave');

    return res.json({ success: true, message: 'Leave cancelled and balance restored', leave });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 8. GET ALL LEAVES (Admin view, rank 80+) ──────────────────────────────────
// L4 FIX: This route is rank-guarded in routes file, so only Directors+ reach it
export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id: actorId, role } = req.user;
    const rank = getRoleRank(role);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const { status } = req.query;

    const where: any = { organizationId: orgId, isArchived: false };
    if (status) where.status = status;

    if (rank < 80) {
      const ids = await HierarchyService.getManagedEmployeeIds(actorId, orgId);
      where.employeeId = { in: ids };
    }

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
          reliever: { select: { fullName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    const sanitizedLeaves = leaves.map(l => ({
      ...l,
      leaveDays: Number(l.leaveDays)
    }));

    return res.json({ leaves: sanitizedLeaves, total, page, pages: Math.ceil(total / limit) });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 9. GET MY RELIEF REQUESTS (requests where I am the reliever) ──────────────
export const getMyReliefRequests = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = req.user.id;

    const requests = await prisma.leaveRequest.findMany({
      where: { 
        organizationId: orgId, 
        relieverId: userId, 
        status: 'SUBMITTED', // ONLY show requests where the reliever HAS NOT yet actioned it
        isArchived: false,
        endDate: { gte: new Date() } 
      },
      include: { employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } } },
      orderBy: { startDate: 'asc' },
    });

    const sanitizedRequests = requests.map(r => ({
      ...r,
      leaveDays: Number(r.leaveDays)
    }));

    return res.json(sanitizedRequests);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
// ── 10. GET HANDOVER HISTORY (Permanent Register) ──────────────────────────
export const getHandoverHistory = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const actorId = req.user.id;
    const role = req.user.role;
    const rank = getRoleRank(role);

    let whereClause: any = { organizationId: orgId, OR: [{ relieverId: actorId }, { requesterId: actorId }] };

    if (rank >= 80) {
      whereClause = { organizationId: orgId };
    } else if (rank >= 60) {
      const ids = await HierarchyService.getManagedEmployeeIds(actorId, orgId);
      whereClause = {
        organizationId: orgId,
        OR: [{ relieverId: actorId }, { requesterId: actorId }, { requesterId: { in: ids } }, { relieverId: { in: ids } }]
      };
    }

    const history = await prisma.handoverRecord.findMany({
      where: whereClause,
      include: {
        requester: { select: { fullName: true, jobTitle: true } },
        reliever: { select: { fullName: true, jobTitle: true } },
        leaveRequest: { select: { startDate: true, endDate: true, leaveType: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(history);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 11. DELETE LEAVE REQUEST (MD ONLY) ───────────────────────────────────────
export const deleteLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.user.id;
    const role = req.user.role;
    const rank = getRoleRank(role);

    const orgId = req.user.organizationId ?? 'default-tenant';

    if (rank < 90) {
      return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can perform administrative deletions' });
    }

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.organizationId !== orgId) return res.status(403).json({ error: 'Unauthorized: Access denied to this organizational record' });

    await prisma.$transaction(async (tx) => {
      // 🛡️ DATA INTEGRITY: Restore balance if the leave was already APPROVED
      if (leave.status === 'APPROVED') {
        const user = await tx.user.findUnique({ where: { id: leave.employeeId } });
        if (user) {
          const restoredBalance = Number(user.leaveBalance || 0) + Number(leave.leaveDays || 0);
          await tx.user.update({
            where: { id: user.id },
            data: { leaveBalance: restoredBalance }
          });
        }
      }

      await tx.leaveRequest.delete({ where: { id } });
    });
    
    await logAction(actorId, 'LEAVE_DELETED_BY_MD', 'LeaveRequest', id, { details: `MD deleted leave request for employee ${leave.employeeId}` }, req.ip);
    
    return res.json({ success: true, message: 'Leave request and associated handovers deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 12. DELETE HANDOVER RECORD (MD ONLY) ─────────────────────────────────────
export const deleteHandover = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actorId = req.user.id;
    const role = req.user.role;
    const rank = getRoleRank(role);

    const orgId = req.user.organizationId ?? 'default-tenant';

    if (rank < 90) {
      return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can perform administrative deletions' });
    }

    const record = await prisma.handoverRecord.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: 'Handover record not found' });
    if (record.organizationId !== orgId) return res.status(403).json({ error: 'Unauthorized: Access denied to this organizational record' });

    await prisma.handoverRecord.delete({ where: { id } });
    
    await logAction(actorId, 'HANDOVER_DELETED_BY_MD', 'HandoverRecord', id, { details: `MD deleted handover record for request ${record.leaveRequestId}` }, req.ip);
    
    return res.json({ success: true, message: 'Handover record deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 13. ADJUST LEAVE BALANCE (Admin Level) ───────────────────────────────────
export const adjustLeaveBalance = async (req: Request, res: Response) => {
  try {
    const { targetUserId, leaveBalance, leaveAllowance, leaveBroughtForward, reason } = req.body;
    const orgId = getOrgId(req);
    const actorId = req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user identification is required' });
    }

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: orgId }
    });

    if (!user) return res.status(404).json({ error: 'Target staff member not found in this organization' });

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        leaveBalance: leaveBalance !== undefined ? leaveBalance : undefined,
        leaveAllowance: leaveAllowance !== undefined ? leaveAllowance : undefined,
        leaveBroughtForward: leaveBroughtForward !== undefined ? leaveBroughtForward : undefined,
        hasManualLeaveOverride: true,
        lastManualLeaveAdjustmentAt: new Date()
      }
    });

    await logAction(actorId, 'LEAVE_BALANCE_ADJUSTED', 'User', targetUserId, { 
      previousBalance: Number(user.leaveBalance), 
      newBalance: leaveBalance, 
      previousAllowance: Number(user.leaveAllowance),
      newAllowance: leaveAllowance,
      previousBroughtForward: Number(user.leaveBroughtForward),
      newBroughtForward: leaveBroughtForward,
      reason 
    }, req.ip);
    
    return res.json({ 
      success: true, 
      message: `Institutional record updated. ${updatedUser.fullName}'s balance is now ${leaveBalance} days.`,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        leaveBalance: Number(updatedUser.leaveBalance),
        leaveAllowance: Number(updatedUser.leaveAllowance),
        leaveBroughtForward: Number(updatedUser.leaveBroughtForward)
      }
    });
  } catch (error: any) {
    console.error(`[BalanceAdjustment Error] ${error.message}`);
    return res.status(500).json({ error: error.message || 'Critical failure in institutional ledger update' });
  }
};
