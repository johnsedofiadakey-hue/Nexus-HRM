import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

export const getPrograms = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const programs = await prisma.trainingProgram.findMany({
      where: { organizationId },
      include: { enrollments: { select: { id: true, status: true, completedAt: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(programs);
  } catch (err: any) {
    console.error('[training.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createProgram = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const createdById = user.id;
    const program = await prisma.trainingProgram.create({
      data: { 
        ...req.body, 
        createdById, 
        organizationId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null
      }
    });
    res.status(201).json(program);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const enroll = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const actorId = user.id;
    const { programId, employeeId } = req.body;
    const targetEmpId = employeeId || actorId;

    const enrollment = await prisma.trainingEnrollment.create({
      data: { programId, employeeId: targetEmpId, organizationId }
    });
    const program = await prisma.trainingProgram.findUnique({ where: { id: programId } });
    await notify(targetEmpId, 'Training Enrollment', `You have been enrolled in "${program?.title}"`, 'INFO', '/training');
    await logAction(actorId, 'TRAINING_ENROLLED', 'TrainingEnrollment', enrollment.id, { programId, employeeId: targetEmpId }, req.ip);
    res.status(201).json(enrollment);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const markComplete = async (req: Request, res: Response) => {
  try {
    const { enrollmentId, score, certificate } = req.body;
    const enrollment = await prisma.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'COMPLETED', completedAt: new Date(), score, certificate }
    });
    await notify(enrollment.employeeId, 'Training Completed! 🎓', 'Congratulations on completing your training.', 'SUCCESS');
    res.json(enrollment);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const getMyTraining = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const userId = user.id;
    const enrollments = await prisma.trainingEnrollment.findMany({
      where: { employeeId: userId, organizationId },
      include: { program: true },
      orderBy: { enrolledAt: 'desc' },
      take: 50
    });
    res.json(enrollments);
  } catch (err: any) {
    console.error('[training.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const exportTrainingCSV = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const programs = await prisma.trainingProgram.findMany({
      where: { organizationId },
      include: {
        enrollments: {
          include: { employee: { select: { fullName: true, jobTitle: true } } }
        }
      }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="training-report.csv"');

    let csv = 'Program,Provider,Status,Employee,Enrolled Date,Completed Date,Score\n';
    programs.forEach(p => {
      p.enrollments.forEach(e => {
        csv += `"${p.title}","${p.provider || ''}","${e.status}","${e.employee.fullName}","${e.enrolledAt.toLocaleDateString()}","${e.completedAt?.toLocaleDateString() || ''}","${e.score || ''}"\n`;
      });
    });
    res.send(csv);
  } catch (err: any) {
    console.error('[training.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
