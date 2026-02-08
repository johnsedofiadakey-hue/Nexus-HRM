import { Request, Response } from 'express';
import prisma from '../prisma/client';

// --- 1. APPLY FOR LEAVE ---
export const applyForLeave = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reason, relieverId } = req.body;
    // @ts-ignore
    const employeeId = req.user?.id;

    // Validation: End date must be after Start date
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: "End date cannot be before start date" });
    }

    // Logic: If a reliever is chosen, it goes to them first. If not, straight to Manager.
    const initialStatus = relieverId ? 'PENDING_RELIEVER' : 'PENDING_MANAGER';

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        relieverId: relieverId || null,
        status: initialStatus
      }
    });

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
      include: { reliever: { select: { fullName: true } } }
    });

    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
};

// --- 3. GET PENDING REQUESTS (For Managers) ---
export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const managerId = req.user?.id;

    // Find all subordinates of this manager
    const subordinates = await prisma.user.findMany({
      where: { supervisorId: managerId },
      select: { id: true }
    });

    const subordinateIds = subordinates.map(u => u.id);

    // Find leaves from these people that are waiting for MANAGER approval
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: subordinateIds },
        status: 'PENDING_MANAGER'
      },
      include: { employee: true },
      orderBy: { startDate: 'asc' }
    });

    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
};

// --- 4. APPROVE/REJECT LEAVE ---
export const processLeave = async (req: Request, res: Response) => {
  try {
    const { id, action, comment } = req.body; // action = 'APPROVED' or 'REJECTED'

    const status = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        managerComment: comment
      }
    });

    return res.json(updatedLeave);
  } catch (error) {
    return res.status(500).json({ error: "Process failed" });
  }
};