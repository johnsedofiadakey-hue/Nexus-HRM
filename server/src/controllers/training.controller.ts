import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

export const getPrograms = async (req: Request, res: Response) => {
  const programs = await prisma.trainingProgram.findMany({
    include: { enrollments: { select: { id: true, status: true, completedAt: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(programs);
};

export const createProgram = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const createdById = req.user?.id;
    const program = await prisma.trainingProgram.create({
      data: { ...req.body, createdById,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null
      }
    });
    res.status(201).json(program);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const enroll = async (req: Request, res: Response) => {
  try {
    const { programId, employeeId } = req.body;
    // @ts-ignore
    const actorId = req.user?.id;
    const targetEmpId = employeeId || actorId;

    const enrollment = await prisma.trainingEnrollment.create({
      data: { programId, employeeId: targetEmpId }
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
  // @ts-ignore
  const userId = req.user?.id;
  const enrollments = await prisma.trainingEnrollment.findMany({
    where: { employeeId: userId },
    include: { program: true },
    orderBy: { enrolledAt: 'desc' }
  });
  res.json(enrollments);
};

export const exportTrainingCSV = async (req: Request, res: Response) => {
  const programs = await prisma.trainingProgram.findMany({
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
};
