import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { PdfExportService } from '../services/pdf.service';
import { errorLogger } from '../services/error-log.service';

const getOrgId = (req: Request): string => (req as any).user?.organizationId || 'default-tenant';

export const exportTargetPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);

    const target = await prisma.target.findUnique({
      where: { id, organizationId: orgId },
      include: {
        metrics: true,
        assignee: { select: { fullName: true } },
        department: { select: { name: true } },
        originator: { select: { fullName: true } },
        lineManager: { select: { fullName: true } },
        reviewer: { select: { fullName: true } },
        updates: {
          include: { submittedBy: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!target) return res.status(404).json({ error: 'Target not found' });

    const pdfBuffer = await PdfExportService.generateBrandedPdf(orgId, `Target Achievement Certificate: ${target.title}`, target, 'TARGET');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Target_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    errorLogger.log('ExportController.exportTargetPdf', err);
    return res.status(500).json({ error: 'Failed to generate target PDF' });
  }
};

export const exportAppraisalPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);

    const packet = await prisma.appraisalPacket.findUnique({
      where: { id, organizationId: orgId },
      include: {
        employee: { 
          select: { 
            fullName: true,
            jobTitle: true,
            employeeCode: true,
            departmentObj: { select: { name: true } }
          } 
        },
        cycle: { select: { title: true } },
        reviews: {
          include: { reviewer: { select: { fullName: true } } },
          orderBy: { submittedAt: 'asc' }
        },
        resolvedBy: { select: { fullName: true } }
      }
    });

    if (!packet) return res.status(404).json({ error: 'Appraisal packet not found' });

    const pdfBuffer = await PdfExportService.generateBrandedPdf(orgId, `Performance Appraisal: ${packet.employee?.fullName}`, packet, 'APPRAISAL');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Appraisal_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    errorLogger.log('ExportController.exportAppraisalPdf', err);
    return res.status(500).json({ error: 'Failed to generate appraisal PDF' });
  }
};

export const exportLeavePdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);

    const leave = await prisma.leaveRequest.findUnique({
      where: { id, organizationId: orgId },
      include: {
        employee: { 
            include: { departmentObj: { select: { name: true } } }
        },
        reliever: { select: { fullName: true } },
        manager: { select: { fullName: true } },
        hrReviewer: { select: { fullName: true } },
        handoverRecords: {
          include: { reliever: { select: { fullName: true } } }
        }
      }
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    const pdfBuffer = await PdfExportService.generateBrandedPdf(orgId, `Leave Authorization Certificate`, leave, 'LEAVE');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Leave_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    errorLogger.log('ExportController.exportLeavePdf', err);
    return res.status(500).json({ error: 'Failed to generate leave PDF' });
  }
};

