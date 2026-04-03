import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

/**
 * EXIT & SEPARATION (OFFBOARDING) CONTROLLER
 */

export const initiateOffboarding = async (req: Request, res: Response) => {
  try {
    const { employeeId, effectiveDate, reason } = req.body;
    const organizationId = req.user?.organizationId || 'default-tenant';
    const triggeredById = req.user?.id!;

    const process = await prisma.offboardingProcess.create({
      data: {
        organizationId,
        employeeId,
        triggeredById,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        status: 'INITIATED'
      }
    });

    // Create exit interview placeholder
    await prisma.exitInterview.create({
      data: {
        organizationId,
        offboardingId: process.id,
        reason
      }
    });

    await logAction(triggeredById, 'INITIATE_OFFBOARDING', 'User', employeeId, { processId: process.id }, req.ip);
    await notify(employeeId, 'Offboarding Commenced 🚪', `Your offboarding process has been initiated, effective ${effectiveDate || 'soon'}.`, 'WARNING', '/offboarding');

    res.status(201).json(process);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getOffboardingList = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'default-tenant';
    const list = await prisma.offboardingProcess.findMany({
      where: { organizationId },
      include: {
        employee: { select: { fullName: true, employeeCode: true, jobTitle: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const completeOffboarding = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId || 'default-tenant';

    const process = await prisma.offboardingProcess.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        accountDisabledAt: new Date()
      }
    });

    // Deactivate user account
    await prisma.user.update({
      where: { id: process.employeeId },
      data: { status: 'TERMINATED' }
    });

    await logAction(req.user?.id!, 'COMPLETE_OFFBOARDING', 'User', process.employeeId, { processId: id }, req.ip);

    res.json(process);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateExitInterview = async (req: Request, res: Response) => {
  try {
    const { offboardingId } = req.params;
    const { interviewerId, interviewDate, feedback, rehireEligible } = req.body;

    const interview = await prisma.exitInterview.updateMany({
      where: { offboardingId },
      data: {
        interviewerId,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        feedback,
        rehireEligible
      }
    });

    res.json(interview);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const trackAssetReturn = async (req: Request, res: Response) => {
  try {
    const { offboardingId, assetId, conditionNotes } = req.body;
    const organizationId = req.user?.organizationId || 'default-tenant';

    const returnRecord = await prisma.assetReturn.create({
      data: {
        organizationId,
        offboardingId,
        assetId,
        returned: true,
        returnedAt: new Date(),
        conditionNotes
      }
    });

    res.status(201).json(returnRecord);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getOffboardingDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const process = await prisma.offboardingProcess.findUnique({
      where: { id },
      include: {
        employee: { select: { fullName: true, employeeCode: true, jobTitle: true, departmentObj: { select: { name: true } } } },
        exitInterviews: { include: { interviewer: { select: { fullName: true } } } },
        assetReturns: true
      }
    });

    if (!process) return res.status(404).json({ error: 'Process not found' });
    res.json(process);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
