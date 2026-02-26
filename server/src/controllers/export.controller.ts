import { Request, Response } from 'express';
import prisma from '../prisma/client';
import PDFDocument from 'pdfkit';

export const exportEmployeesCSV = async (req: Request, res: Response) => {
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
};

export const exportLeaveReportCSV = async (req: Request, res: Response) => {
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
};

export const exportPerformanceReportCSV = async (req: Request, res: Response) => {
  const appraisals = await prisma.appraisal.findMany({
    where: { status: 'COMPLETED' },
    include: {
      employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
      reviewer: { select: { fullName: true } },
      cycle: { select: { name: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="performance-report.csv"');

  let csv = 'Employee,Department,Job Title,Cycle,Reviewer,Final Score,Status\n';
  appraisals.forEach(a => {
    csv += `"${a.employee.fullName}","${a.employee.departmentObj?.name || ''}","${a.employee.jobTitle}","${a.cycle.name}","${a.reviewer.fullName}","${a.finalScore || ''}","${a.status}"\n`;
  });
  res.send(csv);
};

export const exportEmployeesPDF = async (req: Request, res: Response) => {
  const employees = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    include: { departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' }
  });

  const settings = await prisma.systemSettings.findFirst();
  const companyName = settings?.companyName || 'Nexus HRM';

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
};
