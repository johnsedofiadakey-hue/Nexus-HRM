import { Request, Response } from 'express';
import * as payrollService from '../services/payroll.service';
import { logAction } from '../services/audit.service';
import prisma from '../prisma/client';
import PDFDocument from 'pdfkit';

export const createRun = async (req: Request, res: Response) => {
  try {
    const { month, year, employeeIds, adjustments } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });
    const result = await payrollService.createPayrollRun(
      parseInt(month), parseInt(year), employeeIds, adjustments
    );
    // @ts-ignore
    await logAction(req.user?.id, 'PAYROLL_RUN_CREATED', 'PayrollRun', result.run.id,
      { period: result.run.period, employeeCount: result.items.length }, req.ip);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const approveRun = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const approverId = req.user?.id;
    const run = await payrollService.approvePayrollRun(req.params.id, approverId);
    await logAction(approverId, 'PAYROLL_APPROVED', 'PayrollRun', run.id, { period: run.period }, req.ip);
    res.json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const voidRun = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const actorId = req.user?.id;
    const run = await payrollService.voidPayrollRun(req.params.id);
    await logAction(actorId, 'PAYROLL_VOIDED', 'PayrollRun', run.id, {}, req.ip);
    res.json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const item = await payrollService.updatePayrollItem(req.params.itemId, req.body);
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getRuns = async (req: Request, res: Response) => {
  const data = await payrollService.getPayrollRuns(
    parseInt(req.query.page as string) || 1
  );
  res.json(data);
};

export const getRunDetail = async (req: Request, res: Response) => {
  const run = await payrollService.getPayrollRunDetail(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
};

export const getMyPayslips = async (req: Request, res: Response) => {
  // @ts-ignore
  const employeeId = req.user?.id;
  const slips = await payrollService.getMyPayslips(employeeId);
  res.json(slips);
};

export const getYearlySummary = async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const summary = await payrollService.getPayrollSummaryByYear(year);
  res.json(summary);
};

export const downloadPayslipPDF = async (req: Request, res: Response) => {
  try {
    const { runId, employeeId } = req.params;
    // @ts-ignore
    const requesterId = req.user?.id;
    // @ts-ignore
    const requesterRole = req.user?.role;

    if (!['MD', 'HR_ADMIN'].includes(requesterRole) && requesterId !== employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const item = await prisma.payrollItem.findFirst({
      where: { runId, employeeId },
      include: {
        run: true,
        employee: {
          select: {
            fullName: true, jobTitle: true, email: true, employeeCode: true,
            departmentObj: { select: { name: true } }
          }
        }
      }
    });
    if (!item) return res.status(404).json({ error: 'Payslip not found' });

    const settings = await prisma.systemSettings.findFirst();
    const companyName = settings?.companyName || 'Nexus HRM';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="payslip-${item.employee.employeeCode || employeeId}-${item.run.period}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // ── Header band ─────────────────────────────────────────
    doc.rect(0, 0, 595, 90).fill('#1e293b');
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#f1f5f9').text(companyName, 50, 28);
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('PAYSLIP', 50, 54);
    doc.fillColor('#6366f1').text(item.run.period, 50, 68);

    // ── Employee details ─────────────────────────────────────
    const empY = 110;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text(item.employee.fullName, 50, empY);
    doc.font('Helvetica').fontSize(10).fillColor('#475569');
    doc.text(`${item.employee.jobTitle} · ${item.employee.departmentObj?.name || 'N/A'}`, 50, empY + 16);
    doc.text(item.employee.email, 50, empY + 30);
    // Right side
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Employee Code: ${item.employee.employeeCode || 'N/A'}`, 350, empY);
    doc.text(`Currency: ${item.currency}`, 350, empY + 16);
    doc.text(`Status: ${item.run.status}`, 350, empY + 30);

    doc.moveTo(50, 160).lineTo(545, 160).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // ── Earnings table ───────────────────────────────────────
    let y = 175;
    const drawRow = (label: string, amount: number, color = '#1e293b', bold = false) => {
      doc.rect(50, y - 2, 495, 20).fill(y % 40 < 20 ? '#f8fafc' : '#ffffff');
      doc.fontSize(10).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(color);
      doc.text(label, 60, y);
      doc.text(amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 445, y, { align: 'right', width: 90 });
      y += 22;
    };

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#6366f1').text('EARNINGS', 50, y); y += 20;
    drawRow('Basic Salary', Number(item.baseSalary));
    if (Number(item.overtime)) drawRow('Overtime', Number(item.overtime));
    if (Number(item.bonus)) drawRow('Bonus', Number(item.bonus));
    if (Number(item.allowances)) drawRow('Allowances', Number(item.allowances));
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke(); y += 4;
    drawRow('GROSS PAY', Number(item.grossPay), '#1e293b', true);

    y += 10;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ef4444').text('DEDUCTIONS', 50, y); y += 20;
    drawRow('Income Tax (PAYE)', Number(item.tax), '#ef4444');
    if (Number(item.ssnit)) drawRow(item.currency === 'GNF' ? 'CNSS (2.5%)' : 'SSNIT (5.5%)', Number(item.ssnit), '#ef4444');
    if (Number(item.otherDeductions)) drawRow('Other Deductions', Number(item.otherDeductions), '#ef4444');
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke(); y += 4;
    const totalDeductions = Number(item.tax) + Number(item.ssnit) + Number(item.otherDeductions);
    drawRow('TOTAL DEDUCTIONS', totalDeductions, '#ef4444', true);

    // ── Net pay box ──────────────────────────────────────────
    y += 16;
    doc.rect(50, y, 495, 54).fill('#f0fdf4').stroke();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#059669').text('NET PAY', 60, y + 18);
    doc.fontSize(18).text(`${item.currency} ${Number(item.netPay).toLocaleString('en', { minimumFractionDigits: 2 })}`, 445, y + 13, { align: 'right', width: 90 });

    if (item.notes) {
      y += 70;
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text(`Note: ${item.notes}`, 50, y);
    }

    // ── Footer ───────────────────────────────────────────────
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated on ${new Date().toLocaleDateString()} · ${companyName} · Confidential`,
      50, 780, { align: 'center', width: 495 }
    );

    doc.end();
  } catch (err: any) {
    console.error('PDF error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'PDF generation failed' });
  }
};

export const exportPayrollCSV = async (req: Request, res: Response) => {
  try {
    const run = await payrollService.getPayrollRunDetail(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${run.period}.csv"`);

    const headers = 'Employee Code,Name,Department,Job Title,Base Salary,Overtime,Bonus,Allowances,Gross Pay,Tax,SSNIT/Social Security,Other Deductions,Net Pay,Currency,Notes\n';
    const rows = run.items.map(item =>
      `"${item.employee.employeeCode || ''}","${item.employee.fullName}","${item.employee.departmentObj?.name || ''}","${item.employee.jobTitle}",${item.baseSalary},${item.overtime},${item.bonus},${item.allowances},${item.grossPay},${item.tax},${item.ssnit},${item.otherDeductions},${item.netPay},${item.currency},"${item.notes || ''}"`
    ).join('\n');

    res.send(headers + rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
