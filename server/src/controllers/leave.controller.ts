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
    // @ts-ignore
    const employeeId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'startDate, endDate, and reason are required' });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const user = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const daysRequested = calculateWorkingDays(new Date(startDate), new Date(endDate));
    const initialStatus = relieverId ? 'PENDING_RELIEVER' : 'PENDING_MANAGER';

    if (role !== 'MD' && role !== 'HR_ADMIN') {
      if ((user.leaveBalance || 0) < daysRequested) {
        return res.status(400).json({ error: `Insufficient leave balance. You have ${user.leaveBalance} days, requested ${daysRequested}.` });
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
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
      const supervisor = await prisma.user.findUnique({ where: { id: user.supervisorId } });
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
    // @ts-ignore
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { employeeId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          reliever: { select: { fullName: true } },
          employee: { select: { fullName: true } }
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.leaveRequest.count({ where: { employeeId: userId } })
    ]);

    return res.json({ leaves, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(500).json({ error: 'Fetch failed' });
  }
};

export const getMyLeaveBalance = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { leaveBalance: true, leaveAllowance: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ leaveBalance: user.leaveBalance || 0, leaveAllowance: user.leaveAllowance || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Fetch failed' });
  }
};

// --- 3. GET PENDING REQUESTS ---
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const managerId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    let leaves = [];

    if (role === 'MD' || role === 'HR_ADMIN') {
      leaves = await prisma.leaveRequest.findMany({
        where: { status: { in: ['PENDING_MANAGER', 'PENDING_RELIEVER'] } },
        include: { employee: true, reliever: { select: { fullName: true } } },
        orderBy: { startDate: 'asc' }
      });
    } else {
      const subordinates = await prisma.user.findMany({
        where: { supervisorId: managerId },
        select: { id: true }
      });
      const subordinateIds = subordinates.map(u => u.id);

      leaves = await prisma.leaveRequest.findMany({
        where: { employeeId: { in: subordinateIds }, status: 'PENDING_MANAGER' },
        include: { employee: true },
        orderBy: { startDate: 'asc' }
      });
    }

    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ error: 'Fetch failed' });
  }
};

// --- 4. APPROVE/REJECT LEAVE (FIX: use transaction) ---
export const processLeave = async (req: Request, res: Response) => {
  try {
    const { id, action, comment } = req.body;
    // @ts-ignore
    const managerId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    if (!id || !action) return res.status(400).json({ error: 'id and action are required' });

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    if (role !== 'MD' && role !== 'HR_ADMIN') {
      const employee = await prisma.user.findUnique({ where: { id: leave.employeeId } });
      if (!employee || employee.supervisorId !== managerId) {
        return res.status(403).json({ error: 'Not authorized to process this leave' });
      }
    }

    const newStatus = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    // FIX: Use a transaction so approval and balance deduction are atomic
    const [updatedLeave] = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status: newStatus, managerComment: comment }
      });

      if (newStatus === 'APPROVED') {
        const employee = await tx.user.findUnique({ where: { id: updated.employeeId } });
        if (employee) {
          const newBalance = Math.max(0, (employee.leaveBalance || 0) - (updated.leaveDays || 0));
          await tx.user.update({
            where: { id: employee.id },
            data: { leaveBalance: newBalance }
          });
        }
      }

      return [updated];
    });

    await logAction(managerId, `LEAVE_${newStatus}`, 'LeaveRequest', updatedLeave.id, { leaveDays: updatedLeave.leaveDays }, req.ip);

    await prisma.employeeHistory.create({
      data: {
        employeeId: updatedLeave.employeeId,
        loggedById: managerId,
        type: 'UPDATE',
        severity: 'LOW',
        status: 'CLOSED',
        title: `Leave ${newStatus.toLowerCase()}`,
        description: `Leave ${newStatus.toLowerCase()} from ${new Date(updatedLeave.startDate).toLocaleDateString()} to ${new Date(updatedLeave.endDate).toLocaleDateString()}.`
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
    // @ts-ignore
    const userId = req.user?.id;

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.employeeId !== userId) return res.status(403).json({ error: 'Unauthorized' });
    if (leave.status === 'APPROVED') return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    await logAction(userId, 'LEAVE_CANCELLED', 'LeaveRequest', id, {}, req.ip);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Cancel failed' });
  }
};

// --- 6. GET ALL LEAVES (Admin/MD) with pagination ---
export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where = status ? { status: status as any } : {};
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
