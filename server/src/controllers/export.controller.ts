import { Request, Response } from 'express';
import prisma from '../prisma/client';
import PDFDocument from 'pdfkit';
import { getRoleRank } from '../middleware/auth.middleware';

export const exportEmployeesCSV = async (req: Request, res: Response) => {
  try {
  const employees = await prisma.user.findMany({
    where: { status: { not: 'TERMINATED' } },
    include: { departmentObj: { select: { name: true } }, supervisor: { select: { fullName: true } } },
    orderBy: { fullName: 'asc' }
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');

  let csv = 'Code,Full Name,Email,Job Title,Department,Role,Status,Employment Type,Join Date,Supervisor,Contact,Gender\n';
  employees.forEach(e => {
    csv += `"${e.employeeCode || ''}","${e.fullName}","${e.email}","${e.jobTitle}","${e.departmentObj?.name || ''}","${e.role}","${e.status}","${e.employmentType || ''}","${e.joinDate ? new Date(e.joinDate).toLocaleDateString() : ''}","${e.supervisor?.fullName || ''}","${e.contactNumber || ''}","${e.gender || ''}"\n`;
  });
  res.send(csv);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const exportLeaveReportCSV = async (req: Request, res: Response) => {
  try {
  const { year } = req.query;
  const leaves = await prisma.leaveRequest.findMany({
    where: year ? { startDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${parseInt(year as string) + 1}-01-01`) } } : {},
    include: { employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } } },
    orderBy: { startDate: 'desc' }
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="leave-report-${year || 'all'}.csv"`);

  let csv = 'Employee,Department,Job Title,Start Date,End Date,Days,Status,Reason\n';
  leaves.forEach(l => {
    csv += `"${l.employee.fullName}","${l.employee.departmentObj?.name || ''}","${l.employee.jobTitle}","${new Date(l.startDate).toLocaleDateString()}","${new Date(l.endDate).toLocaleDateString()}","${l.leaveDays}","${l.status}","${l.reason}"\n`;
  });
  res.send(csv);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const exportPerformanceReportCSV = async (_req: Request, res: Response) => {
  try {
  /* TODO: V3 - Update to use AppraisalPacket and AppraisalReview
  const appraisals = await prisma.appraisal.findMany({
    where: { status: 'COMPLETED' },
    ...
  });
  */
  res.status(501).json({ message: 'Performance report export is being updated for V3. Please use the Appraisal module directly.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const exportEmployeesPDF = async (req: Request, res: Response) => {
  try {
  const employees = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    include: { departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' }
  });

  const settings = await prisma.systemSettings.findFirst();
  const companyName = (settings as any)?.companyName || 'Nexus HRM';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="employee-directory.pdf"');

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(20).font('Helvetica-Bold').text(`${companyName} — Employee Directory`, 50, 50);
  doc.fontSize(11).font('Helvetica').fillColor('#64748b').text(`Generated: ${new Date().toLocaleDateString()} · ${employees.length} active employees`, 50, 78);
  doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#e2e8f0').stroke();

  let y = 115;
  employees.forEach((emp, i) => {
    if (y > 750) { doc.addPage(); y = 50; }
    const isEven = i % 2 === 0;
    if (isEven) doc.rect(50, y - 3, 495, 22).fillColor('#f8fafc').fill();
    doc.fontSize(10).font('Helvetica').fillColor('#1e293b');
    doc.text(emp.fullName, 55, y, { width: 160 });
    doc.text(emp.jobTitle, 220, y, { width: 140 });
    doc.text(emp.departmentObj?.name || '—', 365, y, { width: 100 });
    doc.text(emp.status, 470, y, { width: 70 });
    y += 22;
  });

  doc.end();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const exportLeavePDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).user?.organizationId || 'default-tenant';

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { fullName: true, employeeCode: true, jobTitle: true, departmentObj: { select: { name: true } } } },
        reliever: { select: { fullName: true } },
        manager: { select: { fullName: true } },
        hrReviewer: { select: { fullName: true } }
      }
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="leave-request-${leave.id}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // --- Header ---
    doc.fontSize(22).font('Helvetica-Bold').text('LEAVE REQUEST FORM', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('Nexus HRM Institutional OS', { align: 'center' });
    doc.moveDown(2);

    // --- Employee Info Table ---
    doc.rect(50, doc.y, 495, 20).fill('#f8fafc');
    doc.fillColor('#1e293b').font('Helvetica-Bold').text('EMPLOYEE INFORMATION', 60, doc.y + 5);
    doc.moveDown(1.5);
    
    doc.font('Helvetica-Bold').text('Name: ', 60, doc.y);
    doc.font('Helvetica').text(leave.employee.fullName, 150, doc.y - 12);
    doc.font('Helvetica-Bold').text('ID Code: ', 60, doc.y);
    doc.font('Helvetica').text(leave.employee.employeeCode || 'N/A', 150, doc.y - 12);
    doc.font('Helvetica-Bold').text('Job Title: ', 60, doc.y);
    doc.font('Helvetica').text(leave.employee.jobTitle, 150, doc.y - 12);
    doc.font('Helvetica-Bold').text('Dept: ', 60, doc.y);
    doc.font('Helvetica').text(leave.employee.departmentObj?.name || '—', 150, doc.y - 12);
    doc.moveDown(2);

    // --- Leave Details ---
    doc.rect(50, doc.y, 495, 20).fill('#f8fafc');
    doc.fillColor('#1e293b').font('Helvetica-Bold').text('LEAVE DETAILS', 60, doc.y + 5);
    doc.moveDown(1.5);

    doc.font('Helvetica-Bold').text('Leave Type: ', 60, doc.y);
    doc.font('Helvetica').text(leave.leaveType, 150, doc.y - 12);
    doc.font('Helvetica-Bold').text('Period: ', 60, doc.y);
    doc.font('Helvetica').text(`${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}`, 150, doc.y - 12);
    doc.font('Helvetica-Bold').text('Duration: ', 60, doc.y);
    doc.font('Helvetica').text(`${leave.leaveDays} Working Day(s)`, 150, doc.y - 12);
    doc.font('Helvetica-Bold').text('Reliever: ', 60, doc.y);
    doc.font('Helvetica').text(leave.reliever?.fullName || 'No reliever selected', 150, doc.y - 12);
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').text('Reason for Leave: ', 60, doc.y);
    doc.font('Helvetica').text(leave.reason, 60, doc.y + 5, { width: 475, align: 'justify' });
    doc.moveDown(1.5);
    
    if ((leave as any).handoverNotes) {
      doc.font('Helvetica-Bold').text('Handover Notes: ', 60, doc.y);
      doc.font('Helvetica').text((leave as any).handoverNotes, 60, doc.y + 5, { width: 475, align: 'justify' });
      doc.moveDown(1.5);
    }
    doc.moveDown(1.5);

    // --- Approvals Section ---
    doc.rect(50, doc.y, 495, 20).fill('#f8fafc');
    doc.fillColor('#1e293b').font('Helvetica-Bold').text('INSTITUTIONAL APPROVALS', 60, doc.y + 5);
    doc.moveDown(1.5);

    // Stage 1
    doc.font('Helvetica-Bold').text('1. Departmental Approval (Line Manager)', 60, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Status: ${leave.status.includes('REJECTED') ? 'REJECTED' : (['HR_REVIEW', 'APPROVED'].includes(leave.status) ? 'APPROVED' : 'PENDING')}`, 80, doc.y);
    doc.text(`Approver: ${leave.manager?.fullName || '—'}`, 80, doc.y);
    doc.text(`Comments: ${leave.managerComment || '—'}`, 80, doc.y, { width: 450 });
    doc.moveDown(1.5);

    // Stage 2
    doc.font('Helvetica-Bold').text('2. Final Sign-off (Head of HR / MD)', 60, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Status: ${leave.status === 'APPROVED' ? 'APPROVED' : (leave.status === 'HR_REJECTED' ? 'REJECTED' : 'PENDING')}`, 80, doc.y);
    doc.text(`Approver: ${leave.hrReviewer?.fullName || '—'}`, 80, doc.y);
    doc.text(`Comments: ${leave.hrComment || '—'}`, 80, doc.y, { width: 450 });
    doc.moveDown(3);

    // --- Footer / Signatures ---
    const bottomY = 720;
    doc.moveTo(50, bottomY).lineTo(250, bottomY).stroke();
    doc.fontSize(8).text('Employee Signature', 50, bottomY + 5);
    
    doc.moveTo(350, bottomY).lineTo(545, bottomY).stroke();
    doc.fontSize(8).text('Institutional Rubber Stamp & Date', 350, bottomY + 5);

    doc.end();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

export const exportAppraisalPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const packet: any = await prisma.appraisalPacket.findUnique({
      where: { id },
      include: {
        employee: { select: { fullName: true, employeeCode: true, jobTitle: true, departmentObj: { select: { name: true } } } },
        cycle: true,
        reviews: {
          include: { reviewer: { select: { fullName: true } } },
          orderBy: { submittedAt: 'asc' }
        },
        resolvedBy: { select: { fullName: true } }
      }
    });

    if (!packet) return res.status(404).json({ error: 'Appraisal packet not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="appraisal-${packet.id}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('PERFORMANCE APPRAISAL REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(packet.cycle?.title || 'Annual Review Cycle', { align: 'center' });
    doc.moveDown(2);

    // Employee Section
    doc.rect(50, doc.y, 495, 20).fill('#f8fafc');
    doc.fillColor('#1e293b').font('Helvetica-Bold').text('EMPLOYEE INFORMATION', 60, doc.y + 5);
    doc.moveDown(1.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${packet.employee.fullName}`, 60, doc.y);
    doc.text(`ID: ${packet.employee.employeeCode || 'N/A'}`, 300, doc.y - 12);
    doc.moveDown(0.5);
    doc.text(`Title: ${packet.employee.jobTitle}`, 60, doc.y);
    doc.text(`Dept: ${packet.employee.departmentObj?.name || '—'}`, 300, doc.y - 12);
    doc.moveDown(2);

    // Reviews Section
    packet.reviews.forEach((rev, idx) => {
      if (doc.y > 650) doc.addPage();
      
      const stageName = rev.reviewStage.replace(/_/g, ' ');
      doc.rect(50, doc.y, 495, 20).fill('#eff6ff');
      doc.fillColor('#1d4ed8').font('Helvetica-Bold').text(`${stageName} — ${rev.reviewer?.fullName || 'Self'}`, 60, doc.y + 5);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica');
      doc.moveDown(1.5);
      
      if (rev.overallRating) {
        doc.font('Helvetica-Bold').text(`Overall Score: ${rev.overallRating}%`, 60, doc.y);
        doc.moveDown(0.5);
      }

      if (rev.summary) {
        doc.font('Helvetica-Bold').text('Summary: ', 60, doc.y);
        doc.font('Helvetica').text(rev.summary, 60, doc.y + 2, { width: 475, align: 'justify' });
        doc.moveDown(1);
      }

      const gridY = doc.y;
      if (rev.strengths) {
        doc.font('Helvetica-Bold').text('Key Strengths: ', 60, gridY);
        doc.font('Helvetica').text(rev.strengths, 60, gridY + 12, { width: 220 });
      }
      if (rev.weaknesses) {
        doc.font('Helvetica-Bold').text('Areas for Improvement: ', 300, gridY);
        doc.font('Helvetica').text(rev.weaknesses, 300, gridY + 12, { width: 220 });
      }
      doc.moveDown(4.5);
    });

    // Dispute Section
    if (packet.disputeResolution) {
      if (doc.y > 700) doc.addPage();
      doc.rect(50, doc.y, 495, 20).fill('#fff1f2');
      doc.fillColor('#be123c').font('Helvetica-Bold').text('DISPUTE RESOLUTION VERDICT', 60, doc.y + 5);
      doc.moveDown(1.5);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica');
      doc.text(packet.disputeResolution, 60, doc.y, { width: 475 });
      doc.moveDown(1);
      doc.fontSize(8).text(`Resolved by: ${packet.resolvedBy?.fullName || 'HR/MD'} on ${packet.disputeResolvedAt?.toLocaleDateString()}`);
      doc.moveDown(2);
    }

    // Signatures
    const finalY = doc.y > 700 ? (doc.addPage(), 100) : doc.y + 50;
    doc.moveTo(50, finalY).lineTo(200, finalY).strokeColor('#e2e8f0').stroke();
    doc.fontSize(8).text('Employee Signature', 50, finalY + 5);
    
    doc.moveTo(225, finalY).lineTo(375, finalY).stroke();
    doc.fontSize(8).text('Reviewer Signature', 225, finalY + 5);
    
    doc.moveTo(400, finalY).lineTo(545, finalY).stroke();
    doc.fontSize(8).text('Executive Approval', 400, finalY + 5);

    doc.end();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};
