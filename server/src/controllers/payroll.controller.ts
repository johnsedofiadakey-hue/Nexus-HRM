import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import * as payrollService from '../services/payroll.service';
import { logAction } from '../services/audit.service';
import prisma from '../prisma/client';
import PDFDocument from 'pdfkit';
import { createObjectCsvStringifier } from 'csv-writer';
import { getOrgId } from './enterprise.controller';

export const createRun = async (req: Request, res: Response) => {
  try {
    const { month, year, employeeIds, adjustments } = req.body;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const userReq = (req as any).user;

    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });
    const result = await payrollService.createPayrollRun(
      organizationId, parseInt(month), parseInt(year), employeeIds, adjustments
    );
    await logAction(userReq.id, 'PAYROLL_RUN_CREATED', 'PayrollRun', result.run.id,
      { period: result.run.period, employeeCount: result.items.length }, req.ip);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const approveRun = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    if (getRoleRank(userReq.role) < 90) {
      return res.status(403).json({ error: 'Only MD can approve payroll runs' });
    }
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const approverId = userReq.id;
    const run = await payrollService.approvePayrollRun(organizationId, req.params.id, approverId);
    await logAction(approverId, 'PAYROLL_APPROVED', 'PayrollRun', run.id, { period: run.period }, req.ip);
    res.json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const voidRun = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    if (getRoleRank(userReq.role) < 90) {
      return res.status(403).json({ error: 'Only MD can void payroll runs' });
    }
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const actorId = userReq.id;
    const run = await payrollService.voidPayrollRun(organizationId, req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    await logAction(actorId, 'PAYROLL_VOIDED', 'PayrollRun', run.id, {}, req.ip);
    res.json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const item = await payrollService.updatePayrollItem(organizationId, req.params.itemId, req.body);
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getRuns = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const data = await payrollService.getPayrollRuns(
      organizationId,
      parseInt(req.query.page as string) || 1
    );
    res.json(data);
  } catch (err: any) {
    console.error('[payroll.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getRunDetail = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const run = await payrollService.getPayrollRunDetail(organizationId, req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    res.json(run);
  } catch (err: any) {
    console.error('[payroll.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getMyPayslips = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const employeeId = userReq.id;
    const slips = await payrollService.getMyPayslips(organizationId, employeeId);
    res.json(slips);
  } catch (err: any) {
    console.error('[payroll.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getYearlySummary = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const summary = await payrollService.getPayrollSummaryByYear(organizationId, year);
    res.json(summary);
  } catch (err: any) {
    console.error('[payroll.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const downloadPayslipPDF = async (req: Request, res: Response) => {
  try {
    const { runId, employeeId } = req.params;
    const userReq = (req as any).user;
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const requesterId = userReq.id;
    const requesterRole = userReq.role;

    if (getRoleRank(requesterRole) < 80 && requesterId !== employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [item, org] = await Promise.all([
      prisma.payrollItem.findFirst({
        where: { runId, employeeId, organizationId },
        include: {
          run: true,
          employee: {
            select: {
              fullName: true, jobTitle: true, email: true, employeeCode: true,
              bankName: true, bankAccountNumber: true,
              address: true, contactNumber: true,
              departmentObj: { select: { name: true } }
            }
          }
        }
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, logoUrl: true, address: true, phone: true, email: true, language: true }
      })
    ]);

    if (!item) return res.status(404).json({ error: 'Payslip not found' });
    
    // ── Translation Layer ──────────────────────────────────
    const lang = org?.language || 'en';
    const t = (key: string) => {
      const dict: Record<string, Record<string, string>> = {
        en: {
          PAYSLIP: 'OFFICIAL PAYSLIP',
          PERIOD: 'PERIOD',
          EMP_CODE: 'EMPLOYEE CODE',
          DEPT: 'DEPARTMENT',
          CURRENCY: 'CURRENCY',
          STATUS: 'STATUS',
          PAY_DETAILS: 'PAYMENT DETAILS',
          BANK: 'BANK NAME',
          ACC_NUM: 'ACCOUNT NUMBER',
          PAY_DATE: 'PAYMENT DATE',
          EARNINGS: 'EARNINGS',
          BASIC: 'Basic Salary',
          OVERTIME: 'Overtime',
          BONUS: 'Bonus',
          ALLOWANCE: 'Allowances',
          GROSS: 'GROSS PAY',
          DEDUCTIONS: 'DEDUCTIONS',
          TAX: 'Income Tax (PAYE)',
          SSNIT: 'SSNIT (5.5%)',
          SS_GENERIC: 'Social Security',
          OTHER_DED: 'Other Deductions',
          TOTAL_DED: 'TOTAL DEDUCTIONS',
          NET: 'NET PAY',
          GENERATED: 'Generated on',
          CONFIDENTIAL: 'Confidential Document'
        },
        fr: {
          PAYSLIP: 'BULLETIN DE PAIE OFFICIEL',
          PERIOD: 'PÉRIODE',
          EMP_CODE: 'CODE EMPLOYÉ',
          DEPT: 'DÉPARTEMENT',
          CURRENCY: 'DEVISE',
          STATUS: 'STATUT',
          PAY_DETAILS: 'DÉTAILS DE PAIEMENT',
          BANK: 'NOM DE LA BANQUE',
          ACC_NUM: 'NUMÉRO DE COMPTE',
          PAY_DATE: 'DATE DE PAIEMENT',
          EARNINGS: 'GAINS',
          BASIC: 'Salaire de Base',
          OVERTIME: 'Heures Supplémentaires',
          BONUS: 'Prime',
          ALLOWANCE: 'Indemnités',
          GROSS: 'SALAIRE BRUT',
          DEDUCTIONS: 'DÉDUCTIONS',
          TAX: 'Impôt sur le Revenu',
          SSNIT: 'CNSS (2.5%)',
          SS_GENERIC: 'Sécurité Sociale',
          OTHER_DED: 'Autres Déductions',
          TOTAL_DED: 'TOTAL DÉDUCTIONS',
          NET: 'SALAIRE NET',
          GENERATED: 'Généré le',
          CONFIDENTIAL: 'Document Confidentiel'
        }
      };
      return (dict[lang] || dict.en)[key] || key;
    };

    const companyName = org?.name || 'Nexus HRM';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="payslip-${item.employee.employeeCode || employeeId}-${item.run.period}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // ── Header band (Now White-Label branded) ────────────────
    const headerColor = '#1e293b';
    doc.rect(0, 0, 595, 100).fill(headerColor);
    
    // Embed Logo if exists
    if (org?.logoUrl) {
       try {
         // Note: In a production environment, we'd use a buffer fetcher for remote URLs
         // For now we'll attempt to place the URL if PDFKit supports it via remote, 
         // else we fallback to text
         doc.image(org.logoUrl, 50, 20, { height: 40 });
         doc.fontSize(20).font('Helvetica-Bold').fillColor('#f1f5f9').text(companyName, 110, 28);
       } catch (e) {
         doc.fontSize(20).font('Helvetica-Bold').fillColor('#f1f5f9').text(companyName, 50, 28);
       }
    } else {
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#f1f5f9').text(companyName, 50, 28);
    }
    
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(t('PAYSLIP'), 50, 64);
    doc.fillColor('#6366f1').text(item.run.period, 50, 78);

    // Organization details in header (right side)
    doc.fontSize(8).fillColor('#94a3b8');
    doc.text(org?.address || '', 350, 28, { align: 'right', width: 200 });
    doc.text(`${org?.phone || ''} ${org?.email ? '· ' + org.email : ''}`, 350, 40, { align: 'right', width: 200 });

    // ── Employee details ─────────────────────────────────────
    const empY = 120;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text(item.employee.fullName, 50, empY);
    doc.font('Helvetica').fontSize(10).fillColor('#475569');
    doc.text(`${item.employee.jobTitle} · ${item.employee.departmentObj?.name || 'N/A'}`, 50, empY + 16);
    doc.text(item.employee.email, 50, empY + 30);
    // Right side
    doc.fontSize(10).fillColor('#475569');
    doc.text(`${t('EMP_CODE')}: ${item.employee.employeeCode || 'N/A'}`, 350, empY);
    doc.text(`${t('CURRENCY')}: ${item.currency}`, 350, empY + 16);
    doc.text(`${t('STATUS')}: ${item.run.status}`, 350, empY + 30);

    doc.moveTo(50, 175).lineTo(545, 175).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

    // ── Payment Information ──────────────────────────────────
    let y = 190;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#94a3b8').text(t('PAY_DETAILS'), 50, y);
    y += 15;
    
    const drawSpec = (label: string, value: string, x: number) => {
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(label, x, y);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text(value, x, y + 12);
    };

    drawSpec(t('BANK'), item.employee.bankName || 'N/A', 50);
    drawSpec(t('ACC_NUM'), item.employee.bankAccountNumber || 'N/A', 200);
    drawSpec(t('PAY_DATE'), new Date(item.run.updatedAt).toLocaleDateString(lang), 350);
    drawSpec('ID', item.id.split('-')[0].toUpperCase(), 480);

    y += 45;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
    y += 20;

    // ── Financial Table ───────────────────────────────────────
    const formatValue = (val: number) => val.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const drawRow = (label: string, amount: number, color = '#1e293b', bold = false) => {
      doc.rect(50, y - 2, 495, 22).fill(y % 44 < 22 ? '#f8fafc' : '#ffffff');
      doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(color);
      doc.text(label, 65, y + 4);
      doc.text(formatValue(amount), 445, y + 4, { align: 'right', width: 85 });
      y += 22;
    };

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#6366f1').text(t('EARNINGS'), 50, y); y += 20;
    drawRow(t('BASIC'), Number(item.baseSalary));
    if (Number(item.overtime)) drawRow(t('OVERTIME'), Number(item.overtime));
    if (Number(item.bonus)) drawRow(t('BONUS'), Number(item.bonus));
    if (Number(item.allowances)) drawRow(t('ALLOWANCE'), Number(item.allowances));
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke(); y += 4;
    drawRow(t('GROSS'), Number(item.grossPay), '#1e293b', true);

    y += 10;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ef4444').text(t('DEDUCTIONS'), 50, y); y += 20;
    drawRow(t('TAX'), Number(item.tax), '#ef4444');
    if (Number(item.ssnit)) drawRow(item.currency === 'GNF' ? t('SSNIT') : t('SS_GENERIC'), Number(item.ssnit), '#ef4444');
    if (Number(item.otherDeductions)) drawRow(t('OTHER_DED'), Number(item.otherDeductions), '#ef4444');
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke(); y += 4;
    const totalDeductions = Number(item.tax) + Number(item.ssnit) + Number(item.otherDeductions);
    drawRow(t('TOTAL_DED'), totalDeductions, '#ef4444', true);

    // ── Net pay box ──────────────────────────────────────────
    y += 16;
    doc.rect(50, y, 495, 54).fill('#f0fdf4').stroke();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#059669').text(t('NET'), 60, y + 18);
    doc.fontSize(18).text(`${item.currency} ${formatValue(Number(item.netPay))}`, 445, y + 13, { align: 'right', width: 90 });

    if (item.notes) {
      y += 70;
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text(`Note: ${item.notes}`, 50, y);
    }

    // ── Footer ───────────────────────────────────────────────
    doc.fontSize(8).fillColor('#94a3b8').text(
      `${t('GENERATED')} ${new Date().toLocaleDateString(lang)} · ${companyName} · ${t('CONFIDENTIAL')}`,
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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const run = await payrollService.getPayrollRunDetail(organizationId, req.params.id);
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

export const exportBankCSV = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, organizationId },
      include: {
        items: {
          include: {
            employee: {
              select: {
                fullName: true,
                bankName: true,
                bankAccountNumber: true,
                bankBranch: true
              }
            }
          }
        }
      }
    });

    if (!run) return res.status(404).json({ error: 'Payroll run not found' });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'name', title: 'ACCOUNT NAME' },
        { id: 'number', title: 'ACCOUNT NUMBER' },
        { id: 'bank', title: 'BANK NAME' },
        { id: 'branch', title: 'BRANCH' },
        { id: 'amount', title: 'AMOUNT' },
        { id: 'currency', title: 'CURRENCY' },
        { id: 'narration', title: 'NARRATION' }
      ]
    });

    const records = run.items.map(item => ({
      name: item.employee.fullName,
      number: item.employee.bankAccountNumber || 'N/A',
      bank: item.employee.bankName || 'N/A',
      branch: item.employee.bankBranch || 'N/A',
      amount: item.netPay,
      currency: item.currency,
      narration: `Salary Payment - ${run.period}`
    }));

    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bank-transfer-${run.period}.csv"`);
    res.send(csvString);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
