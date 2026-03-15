import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';

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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
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
    const initialStatus = relieverId ? 'PENDING_RELIEVER' : 'PENDING_MANAGER';

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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const userId = userReq.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { employeeId: userId, organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          reliever: { select: { fullName: true } },
          employee: { select: { fullName: true } }
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.leaveRequest.count({ where: { employeeId: userId, organizationId } })
    ]);

    return res.json({ leaves, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(500).json({ error: 'Fetch failed' });
  }
};

export const getMyLeaveBalance = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const userId = userReq.id;
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const managerId = userReq.id;
    const role = userReq.role;
    const rank = getRoleRank(role);

    let leaves: any[] = [];

    if (rank >= 80) {
      // HR/MD see everything pending Manager OR HR/MD
      leaves = await prisma.leaveRequest.findMany({
        where: {
          status: { in: ['PENDING_MANAGER', 'PENDING_RELIEVER', 'PENDING_HR_MD'] },
          organizationId
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
        where: { supervisorId: managerId, organizationId },
        select: { id: true }
      });
      const subordinateIds = subordinates.map(u => u.id);

      leaves = await prisma.leaveRequest.findMany({
        where: {
          employeeId: { in: subordinateIds },
          status: { in: ['PENDING_MANAGER', 'PENDING_RELIEVER'] },
          organizationId
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

// --- 4. APPROVE/REJECT LEAVE (Tiered Approval) ---
export const processLeave = async (req: Request, res: Response) => {
  try {
    const { id, action, comment } = req.body;
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const actorId = userReq.id;
    const actorRole = userReq.role;
    const actorRank = getRoleRank(actorRole);

    if (!id || !action) return res.status(400).json({ error: 'id and action are required' });

    const leave = await prisma.leaveRequest.findFirst({
      where: { id, organizationId },
      include: { employee: true }
    });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    // 🛡️ SECURITY CHECK
    if (actorRank < 80) {
      // Managers can only process if it's their direct report
      if (leave.employee?.supervisorId !== actorId) {
        return res.status(403).json({ error: 'Not authorized to process this leave' });
      }
    }

    let nextStatus = action === 'REJECTED' ? 'REJECTED' : 'APPROVED';

    // 🔄 TIERED LOGIC
    if (action === 'APPROVED') {
      if (actorRank < 80) {
        // Manager approval is only Stage 1
        nextStatus = 'PENDING_HR_MD';
      } else {
        // HR/MD approval is Final
        nextStatus = 'APPROVED';
      }
    }

    // FIX: Use a transaction so approval and balance deduction are atomic
    const [updatedLeave] = await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id },
        data: { status: nextStatus, managerComment: comment }
      });

      const updated = await tx.leaveRequest.findFirst({ where: { id } });
      if (!updated) throw new Error("Leave request not found during transaction");

      // Only deduct balance on FINAL approval
      if (nextStatus === 'APPROVED') {
        const employee = await tx.user.findFirst({
          where: { id: updated.employeeId!, organizationId }
        });
        if (employee) {
          const newBalance = Math.max(0, (employee.leaveBalance || 0) - (updated.leaveDays || 0));
          await tx.user.updateMany({
            where: { id: employee.id, organizationId },
            data: { leaveBalance: newBalance }
          });
        }
      }

      return [updated];
    });

    await logAction(actorId, `LEAVE_${nextStatus}`, 'LeaveRequest', updatedLeave.id, { leaveDays: updatedLeave.leaveDays }, req.ip);

    await prisma.employeeHistory.create({
      data: {
        organizationId,
        employeeId: updatedLeave.employeeId,
        loggedById: actorId,
        type: 'UPDATE',
        severity: 'LOW',
        status: 'CLOSED',
        title: `Leave ${nextStatus.toLowerCase()}`,
        description: `Leave ${nextStatus.toLowerCase()} processed by ${userReq.name}`
      }
    });

    return res.json(updatedLeave);
  } catch (error) {
    console.error('Process Leave Error:', error);
    return res.status(500).json({ error: 'Process failed' });
  }
};

// --- 5. CANCEL LEAVE (Employee can cancel pending requests) ---
export const cancelLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const userId = userReq.id;

    const leave = await prisma.leaveRequest.findFirst({ where: { id, organizationId } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.employeeId !== userId) return res.status(403).json({ error: 'Unauthorized' });
    if (leave.status === 'APPROVED') return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });

    await prisma.leaveRequest.updateMany({
      where: { id, organizationId },
      data: { status: 'CANCELLED' }
    });

    const updated = await prisma.leaveRequest.findFirst({ where: { id, organizationId } });

    await logAction(userId, 'LEAVE_CANCELLED', 'LeaveRequest', id, {}, req.ip);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Cancel failed' });
  }
};

// --- 6. GET ALL LEAVES (Admin/MD) with pagination ---
export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = { organizationId };
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
