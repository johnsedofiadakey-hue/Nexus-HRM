import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { getOrgId } from './enterprise.controller';
import { getRoleRank } from '../middleware/auth.middleware';
import { LeaveService } from '../services/leave.service';

// FIX: Calculate working days only (skip weekends)
const calculateWorkingDays = (start: Date, end: Date): number => {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (cur <= endDate) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++; // Skip Sunday (0) and Saturday (6)
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
};

// --- 1. APPLY FOR LEAVE ---
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reason, relieverId, leaveType } = req.body;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const userReq = (req as any).user;
    const employeeId = userReq.id;
    const role = userReq.role;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'startDate, endDate, and reason are required' });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const user = await prisma.user.findFirst({ where: { id: employeeId, organizationId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const daysRequested = calculateWorkingDays(new Date(startDate), new Date(endDate));
    const initialStatus = relieverId ? 'SUBMITTED' : 'MANAGER_REVIEW';

    if (getRoleRank(role) < 80) {
      if ((user.leaveBalance || 0) < daysRequested) {
        return res.status(400).json({ error: `Insufficient leave balance. You have ${user.leaveBalance} days, requested ${daysRequested}.` });
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        leaveDays: daysRequested,
        reason,
        relieverId: relieverId || null,
        status: initialStatus
      }
    });

    await logAction(employeeId, 'LEAVE_APPLIED', 'LeaveRequest', leave.id, { daysRequested, leaveType }, req.ip);

    // FIX: WhatsApp/SMS Notification to Supervisor
    if (user.supervisorId) {
      const supervisor = await prisma.user.findFirst({ where: { id: user.supervisorId, organizationId } });
      if (supervisor?.contactNumber) {
        import('../services/sms.service').then(({ sendSMS }) => {
          sendSMS({
            to: supervisor.contactNumber!,
            message: `Nexus HRM: ${user.fullName} requested ${daysRequested} days of leave. Review now in the portal.`
          }).catch(err => console.error('SMS trigger failed:', err));
        });
      }
    }

    return res.status(201).json(leave);

  } catch (error) {
    console.error('Leave Error:', error);
    return res.status(500).json({ error: 'Failed to submit leave request' });
  }
};

// --- 2. GET MY LEAVES ---
export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const userReq = (req as any).user;
    const userId = userReq.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { employeeId: userId, ...whereOrg },
        orderBy: { createdAt: 'desc' },
        include: {
          reliever: { select: { fullName: true } },
          employee: { select: { fullName: true } }
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.leaveRequest.count({ where: { employeeId: userId, ...whereOrg } })
    ]);

    return res.json({ leaves, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(500).json({ error: 'Fetch failed' });
  }
};

export const getMyLeaveBalance = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const userReq = (req as any).user;
    const userId = userReq.id;
    const user = await prisma.user.findFirst({
      where: { id: userId, ...whereOrg },
      select: { leaveBalance: true, leaveAllowance: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ leaveBalance: user.leaveBalance || 0, leaveAllowance: user.leaveAllowance || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Fetch failed' });
  }
};

// --- 3. GET PENDING REQUESTS (Hardened) ---
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const userReq = (req as any).user;
    const managerId = userReq.id;
    const role = userReq.role;
    const rank = getRoleRank(role);

    let leaves: any[] = [];

    if (rank >= 80) {
      // HR/MD see everything pending Manager OR HR/MD
      leaves = await prisma.leaveRequest.findMany({
        where: {
          status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED'] },
          ...whereOrg
        },
        include: { 
          employee: { select: { fullName: true, departmentObj: { select: { name: true } } } }, 
          reliever: { select: { fullName: true } } 
        },
        orderBy: { startDate: 'asc' }
      });
    } else if (rank >= 60) {
      // Managers only see their direct subordinates' pending requests
      const subordinates = await prisma.user.findMany({
        where: { supervisorId: managerId, ...whereOrg },
        select: { id: true }
      });
      const subordinateIds = subordinates.map(u => u.id);

      leaves = await prisma.leaveRequest.findMany({
        where: {
          employeeId: { in: subordinateIds },
          status: { in: ['MANAGER_REVIEW', 'SUBMITTED'] },
          ...whereOrg
        },
        include: { employee: { select: { fullName: true } } },
        orderBy: { startDate: 'asc' }
      });
    }

    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ error: 'Fetch failed' });
  }
};

// --- 4. PROCESS LEAVE (Reliever, Manager, or HR) ---
export const processLeave = async (req: Request, res: Response) => {
  try {
    const { id, action, comment, role } = req.body; // role can be RELIEVER, MANAGER, HR
    const orgId = getOrgId(req) || 'default-tenant';
    const actorId = (req as any).user.id;
    const actorRole = (req as any).user.role;

    let updated;
    if (role === 'RELIEVER') {
      updated = await LeaveService.respondAsReliever(id, actorId, action === 'APPROVE', comment);
    } else if (role === 'MANAGER') {
      updated = await LeaveService.managerReview(id, actorId, action === 'APPROVE', comment);
    } else if (role === 'HR') {
      updated = await LeaveService.hrFinalReview(id, actorId, action === 'APPROVE', comment);
    } else {
      // Auto-detect based on role if not provided
      if (['HR_MANAGER', 'MD'].includes(actorRole)) {
        updated = await LeaveService.hrFinalReview(id, actorId, action === 'APPROVE', comment);
      } else {
        updated = await LeaveService.managerReview(id, actorId, action === 'APPROVE', comment);
      }
    }

    await logAction(actorId, `LEAVE_PROCESSED_${action}`, 'LeaveRequest', id, { role }, req.ip);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

// --- 5. CANCEL LEAVE (Employee can cancel pending requests) ---
export const cancelLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const userReq = (req as any).user;
    const userId = userReq.id;

    const leave = await prisma.leaveRequest.findFirst({ where: { id, ...whereOrg } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.employeeId !== userId) return res.status(403).json({ error: 'Unauthorized' });
    if (leave.status === 'APPROVED') return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });

    await prisma.leaveRequest.updateMany({
      where: { id, ...whereOrg },
      data: { status: 'CANCELLED' }
    });

    const updated = await prisma.leaveRequest.findFirst({ where: { id, ...whereOrg } });

    await logAction(userId, 'LEAVE_CANCELLED', 'LeaveRequest', id, {}, req.ip);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Cancel failed' });
  }
};

// --- 6. GET ALL LEAVES (Admin/MD) with pagination ---
export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const userReq = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = { ...whereOrg };
    if (status) where.status = status;

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
          reliever: { select: { fullName: true } }
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.leaveRequest.count({ where })
    ]);

    return res.json({ leaves, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(500).json({ error: 'Fetch failed' });
  }
};

// Import at top of file - these are added as runtime imports
// Note: in production, move these to top of file
import { sendLeaveApprovalEmail, sendLeaveRequestedEmail } from '../services/email.service';
import { notify } from '../services/websocket.service';
