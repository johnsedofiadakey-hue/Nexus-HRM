import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { getRoleRank } from '../middleware/auth.middleware';
import { LeaveService } from '../services/leave.service';
import { HierarchyService } from '../services/hierarchy.service';
import { notify } from '../services/websocket.service';
import { errorLogger } from '../services/error-log.service';

const getOrgId = (req: Request): string => (req as any).user?.organizationId || 'default-tenant';

// Working-day calculator (weekends & holidays excluded)
const calcWorkingDays = (start: Date, end: Date, holidayDates: string[] = []): number => {
  let count = 0;
  const cur = new Date(start); cur.setHours(0,0,0,0);
  const fin = new Date(end);   fin.setHours(0,0,0,0);
  
  const holidaySet = new Set(holidayDates);

  while (cur <= fin) {
    const d = cur.getDay();
    const dateStr = cur.toISOString().split('T')[0];
    
    // Skip weekends (0=Sun, 6=Sat) and registered public holidays
    if (d !== 0 && d !== 6 && !holidaySet.has(dateStr)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
};

// ── 1. APPLY FOR LEAVE ────────────────────────────────────────────────────────
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reason, relieverId, leaveType, handoverNotes, relieverAcceptanceRequired } = req.body;
    const orgId = getOrgId(req);
    const user = (req as any).user;
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

    // ── L1 FIX: Reliever must be same rank level ──────────────────────────────
    if (relieverId) {
      const reliever = await prisma.user.findFirst({ where: { id: relieverId, organizationId: orgId, isArchived: false } });
      if (!reliever) return res.status(400).json({ error: 'Selected reliever not found' });

      const myRank = getRoleRank(employee.role);
      const relieverRank = getRoleRank(reliever.role);

      // Same rank OR one level adjacent (e.g. STAFF can relieve SUPERVISOR and vice versa within reasonable range)
      if (Math.abs(myRank - relieverRank) > 10) {
        return res.status(400).json({ 
          error: `Reliever must be at a similar level. Your rank: ${employee.role} (${myRank}), ${reliever.fullName}'s rank: ${reliever.role} (${relieverRank}). Please select a colleague at the same level.`
        });
      }
    }

    // Fetch public holidays for this org to exclude from calculation
    const holidays = await prisma.publicHoliday.findMany({
      where: { organizationId: orgId, date: { gte: new Date(startDate), lte: new Date(endDate) } }
    });
    const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);

    const daysRequested = calcWorkingDays(new Date(startDate), new Date(endDate), holidayDates);

    // Balance check (skip for Directors+)
    if (rank < 80) {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { allowLeaveBorrowing: true, borrowingLimit: true } });
      const balance = Number(employee.leaveBalance || 0);
      const allowBorrowing = org?.allowLeaveBorrowing ?? false;
      const borrowLimit = Number(org?.borrowingLimit ?? 5);

      const effectiveLimit = allowBorrowing ? (balance + borrowLimit) : balance;

      if (effectiveLimit < daysRequested) {
        const errorMsg = allowBorrowing 
          ? `Insufficient leave balance. You have ${balance} days and can borrow up to ${borrowLimit} more (Total Limit: ${effectiveLimit}). Requested: ${daysRequested}.`
          : `Insufficient leave balance. You have ${balance} days remaining, requested ${daysRequested}.`;
        return res.status(400).json({ error: errorMsg });
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

    const initialStatus = relieverId ? 'SUBMITTED' : 'MANAGER_REVIEW';

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

    // Notify reliever or supervisor
    if (relieverId) {
      const noteSnippet = handoverNotes ? `\n\nHandover: ${handoverNotes.substring(0, 60)}${handoverNotes.length > 60 ? '...' : ''}` : '';
      await notify(relieverId, '🤝 Handover Request', `${employee.fullName} has requested you as reliever for ${daysRequested} day(s).${noteSnippet}`, 'INFO', '/leave');
    } else if (employee.supervisorId) {
      await notify(employee.supervisorId, '📅 New Leave Request', `${employee.fullName} has requested ${daysRequested} day(s) of leave.`, 'INFO', '/leave');
    }

    await logAction(employeeId, 'LEAVE_APPLIED', 'LeaveRequest', leave.id, { daysRequested, leaveType }, req.ip);
    return res.status(201).json({ ...leave, warning: overlapWarning });

  } catch (err: any) {
    errorLogger.log('LeaveController.applyForLeave', err);
    return res.status(500).json({ error: err.message || 'Failed to submit leave request' });
  }
};

// ── 2. GET ELIGIBLE RELIEVERS (same-rank peers) ────────────────────────────── 
export const getEligibleRelievers = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;

    const me = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { role: true } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const myRank = getRoleRank(me.role);

    // Find all active employees within ±10 rank points (same or adjacent level)
    const allUsers = await prisma.user.findMany({
      where: { organizationId: orgId, isArchived: false, status: 'ACTIVE', id: { not: userId } },
      select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
    });

    const eligible = allUsers.filter(u => {
      const uRank = getRoleRank(u.role);
      return Math.abs(uRank - myRank) <= 10;
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
    const userId = (req as any).user.id;
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
    const userId = (req as any).user.id;
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { leaveBalance: true, leaveAllowance: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ 
      leaveBalance: Number(user.leaveBalance ?? 0), 
      leaveAllowance: Number(user.leaveAllowance ?? 24) 
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ── 5. GET PENDING (Manager/HR queue) ─────────────────────────────────────────
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id: managerId, role } = (req as any).user;
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
    const actorId = (req as any).user.id;
    const actorRole = (req as any).user.role;
    const rank = getRoleRank(actorRole);

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    let updated: any;

    // 1. Reliever Response (Explicitly as reliever)
    if (actorRoleHint === 'RELIEVER' || (leave.status === 'SUBMITTED' && leave.relieverId === actorId)) {
      updated = await LeaveService.respondAsReliever(id, actorId, action === 'APPROVE', comment);
    } 
    // 2. Manager / HR Processing (Rank >= 60)
    else if (rank >= 60) {
      if (leave.status === 'MD_REVIEW' && rank >= 90) {
        updated = await LeaveService.mdFinalReview(id, actorId, action === 'APPROVE', comment);
      } else if (['SUBMITTED', 'RELIEVER_ACCEPTED', 'MANAGER_REVIEW'].includes(leave.status)) {
        updated = await LeaveService.managerReview(id, actorId, action === 'APPROVE', comment);
      } else {
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
    const userId = (req as any).user.id;

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.employeeId !== userId) return res.status(403).json({ error: 'Not your leave request' });
    if (leave.status === 'APPROVED') return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });

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

// ── 8. GET ALL LEAVES (Admin view, rank 80+) ──────────────────────────────────
// L4 FIX: This route is rank-guarded in routes file, so only Directors+ reach it
export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const { status } = req.query;

    const where: any = { organizationId: orgId, isArchived: false };
    if (status) where.status = status;

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
    const userId = (req as any).user.id;

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
    const userId = (req as any).user.id;

    const history = await prisma.handoverRecord.findMany({
      where: { 
        organizationId: orgId,
        OR: [
          { relieverId: userId },
          { requesterId: userId }
        ]
      },
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
    const actorId = (req as any).user.id;
    const role = (req as any).user.role;
    const rank = getRoleRank(role);

    if (rank < 90) {
      return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can perform administrative deletions' });
    }

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    await prisma.leaveRequest.delete({ where: { id } });
    
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
    const actorId = (req as any).user.id;
    const role = (req as any).user.role;
    const rank = getRoleRank(role);

    if (rank < 90) {
      return res.status(403).json({ error: 'Unauthorized: Only the Managing Director can perform administrative deletions' });
    }

    const record = await prisma.handoverRecord.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: 'Handover record not found' });

    await prisma.handoverRecord.delete({ where: { id } });
    
    await logAction(actorId, 'HANDOVER_DELETED_BY_MD', 'HandoverRecord', id, { details: `MD deleted handover record for request ${record.leaveRequestId}` }, req.ip);
    
    return res.json({ success: true, message: 'Handover record deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
