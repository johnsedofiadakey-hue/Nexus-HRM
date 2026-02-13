import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';

const calculateLeaveDays = (start: Date, end: Date) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
};

// --- 1. APPLY FOR LEAVE ---
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reason, relieverId } = req.body;
    // @ts-ignore
    const employeeId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    // Validation: End date must be after Start date
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: "End date cannot be before start date" });
    }

    // Logic: If a reliever is chosen, it goes to them first. If not, straight to Manager.
    const initialStatus = relieverId ? 'PENDING_RELIEVER' : 'PENDING_MANAGER';

    const user = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const daysRequested = calculateLeaveDays(new Date(startDate), new Date(endDate));

    if (role !== 'MD' && role !== 'HR_ADMIN') {
      if ((user.leaveBalance || 0) < daysRequested) {
        return res.status(400).json({ error: "Insufficient leave balance" });
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

    await logAction(employeeId, 'LEAVE_APPLIED', 'LeaveRequest', leave.id, { daysRequested }, req.ip);

    console.log(`✅ Leave requested by ${employeeId}`);
    return res.status(201).json(leave);

  } catch (error) {
    console.error("Leave Error:", error);
    return res.status(500).json({ error: "Failed to submit leave request" });
  }
};

// --- 2. GET MY LEAVES (History) ---
export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reliever: { select: { fullName: true } },
        employee: { select: { fullName: true } }
      }
    });

    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
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

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      leaveBalance: user.leaveBalance || 0,
      leaveAllowance: user.leaveAllowance || 0
    });
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

// --- 3. GET PENDING REQUESTS (For Managers) ---
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const managerId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let leaves = [];

    if (role === 'MD' || role === 'HR_ADMIN') {
      // Admins can view all pending manager approvals
      leaves = await prisma.leaveRequest.findMany({
        where: { status: 'PENDING_MANAGER' },
        include: { employee: true },
        orderBy: { startDate: 'asc' }
      });
    } else {
      // Find all subordinates of this manager
      const subordinates = await prisma.user.findMany({
        where: { supervisorId: managerId },
        select: { id: true }
      });

      const subordinateIds = subordinates.map(u => u.id);

      // Find leaves from these people that are waiting for MANAGER approval
      leaves = await prisma.leaveRequest.findMany({
        where: {
          employeeId: { in: subordinateIds },
          status: 'PENDING_MANAGER'
        },
        include: { employee: true },
        orderBy: { startDate: 'asc' }
      });
    }

    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
};

// --- 4. APPROVE/REJECT LEAVE ---
export const processLeave = async (req: Request, res: Response) => {
  try {
    const { id, action, comment } = req.body; // action = 'APPROVED' or 'REJECTED'
    // @ts-ignore
    const managerId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    if (!managerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    if (role !== 'MD' && role !== 'HR_ADMIN') {
      const employee = await prisma.user.findUnique({ where: { id: leave.employeeId } });
      if (!employee || employee.supervisorId !== managerId) {
        return res.status(403).json({ error: "Not authorized to process this leave" });
      }
    }

    const status = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        managerComment: comment
      }
    });

    if (status === 'APPROVED') {
      const employee = await prisma.user.findUnique({ where: { id: updatedLeave.employeeId } });
      if (employee) {
        const newBalance = Math.max(0, (employee.leaveBalance || 0) - (updatedLeave.leaveDays || 0));
        await prisma.user.update({
          where: { id: employee.id },
          data: { leaveBalance: newBalance }
        });
      }
    }

    await logAction(managerId, `LEAVE_${status}`, 'LeaveRequest', updatedLeave.id, { leaveDays: updatedLeave.leaveDays }, req.ip);

    await prisma.employeeHistory.create({
      data: {
        employeeId: updatedLeave.employeeId,
        loggedById: managerId,
        type: 'UPDATE',
        severity: 'LOW',
        status: 'CLOSED',
        title: `Leave ${status.toLowerCase()}`,
        description: `Leave ${status.toLowerCase()} for ${new Date(updatedLeave.startDate).toLocaleDateString()} to ${new Date(updatedLeave.endDate).toLocaleDateString()}.`
      }
    });

    return res.json(updatedLeave);
  } catch (error) {
    return res.status(500).json({ error: "Process failed" });
  }
};