import prisma from '../prisma/client';
import { sendPayslipEmail } from './email.service';
import { notify } from './websocket.service';

// ─── TAX ENGINES ──────────────────────────────────────────────────────────

// Ghana PAYE 2025 (annual brackets)
const calculateGhanaTax = (grossMonthly: number): number => {
  const annual = grossMonthly * 12;
  const brackets = [
    { limit: 4380,  rate: 0.00 },
    { limit: 1320,  rate: 0.05 },
    { limit: 1560,  rate: 0.10 },
    { limit: 38000, rate: 0.175 },
    { limit: 192000, rate: 0.25 },
    { limit: Infinity, rate: 0.30 },
  ];
  let remaining = annual, tax = 0;
  for (const b of brackets) {
    const taxable = Math.min(remaining, b.limit);
    tax += taxable * b.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return Math.round((tax / 12) * 100) / 100;
};

// Guinea (GNF) — flat 5% for simplicity (customize as needed)
const calculateGuineaTax = (gross: number) => Math.round(gross * 0.05 * 100) / 100;

// Generic 20% for USD/EUR/GBP payrolls (international standard placeholder)
const calculateGenericTax = (gross: number) => Math.round(gross * 0.20 * 100) / 100;

// SSNIT 5.5% (Ghana) — employer pays 13%, employee pays 5.5%
const calculateSSNIT = (gross: number) => Math.round(gross * 0.055 * 100) / 100;

// CNSS Guinea — approx 2.5% employee share
const calculateCNSS = (gross: number) => Math.round(gross * 0.025 * 100) / 100;

type TaxResult = { tax: number; socialSecurity: number };

const computeTaxes = (baseSalary: number, currency: string): TaxResult => {
  switch (currency) {
    case 'GHS':
      return { tax: calculateGhanaTax(baseSalary), socialSecurity: calculateSSNIT(baseSalary) };
    case 'GNF':
      return { tax: calculateGuineaTax(baseSalary), socialSecurity: calculateCNSS(baseSalary) };
    case 'USD': case 'EUR': case 'GBP':
      return { tax: calculateGenericTax(baseSalary), socialSecurity: 0 };
    default:
      return { tax: calculateGhanaTax(baseSalary), socialSecurity: calculateSSNIT(baseSalary) };
  }
};

// ─── PAYROLL ADJUSTMENTS ─────────────────────────────────────────────────
// Per-employee overrides passed in by the HR/MD user
export interface PayrollAdjustment {
  employeeId: string;
  overtime?: number;
  bonus?: number;
  allowances?: number;
  otherDeductions?: number;
  notes?: string;
}

export const createPayrollRun = async (
  month: number,
  year: number,
  employeeIds?: string[],
  adjustments?: PayrollAdjustment[]
) => {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const existing = await prisma.payrollRun.findFirst({ where: { period } });
  if (existing) throw new Error(`Payroll run for ${period} already exists. Delete or void it first.`);

  const employees = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      salary: { not: null },
      ...(employeeIds?.length ? { id: { in: employeeIds } } : {})
    }
  });
  if (!employees.length) throw new Error('No active employees with salary records found.');

  const run = await prisma.payrollRun.create({ data: { period, month, year } });

  let totalGross = 0, totalNet = 0;
  const items = [];
  const adjMap = new Map((adjustments || []).map(a => [a.employeeId, a]));

  for (const emp of employees) {
    const base = Number(emp.salary) || 0;
    const currency = (emp.currency as string) || 'GHS';
    const adj = adjMap.get(emp.id);

    const overtime = adj?.overtime ?? 0;
    const bonus = adj?.bonus ?? 0;
    const allowances = adj?.allowances ?? 0;
    const otherDeductions = adj?.otherDeductions ?? 0;

    const grossPay = base + overtime + bonus + allowances;
    const { tax, socialSecurity: ssnit } = computeTaxes(grossPay, currency);
    const netPay = Math.max(0, grossPay - tax - ssnit - otherDeductions);

    const item = await prisma.payrollItem.create({
      data: {
        runId: run.id, employeeId: emp.id,
        baseSalary: base, currency, overtime, bonus, allowances, otherDeductions,
        tax, ssnit, grossPay, netPay,
        notes: adj?.notes
      }
    });
    items.push({ ...item, employee: emp });
    totalGross += grossPay;
    totalNet += netPay;
  }

  await prisma.payrollRun.update({ where: { id: run.id }, data: { totalGross, totalNet } });
  return { run, items };
};

export const approvePayrollRun = async (runId: string, approverId: string) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { items: { include: { employee: true } } }
  });
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'DRAFT') throw new Error('Only DRAFT runs can be approved');

  const updated = await prisma.payrollRun.update({
    where: { id: runId },
    data: { status: 'APPROVED', approvedBy: approverId, approvedAt: new Date() }
  });

  for (const item of run.items) {
    const emp = item.employee;
    if (emp.email) {
      await sendPayslipEmail(
        emp.email, emp.fullName, run.period,
        Number(item.netPay).toLocaleString('en-GH', { minimumFractionDigits: 2 }),
        item.currency
      ).catch(console.error);
    }
    await notify(emp.id, 'Payslip Ready 💰',
      `Your ${run.period} payslip is ready. Net pay: ${item.currency} ${Number(item.netPay).toLocaleString()}`,
      'SUCCESS', '/payroll'
    );
  }
  return updated;
};

export const voidPayrollRun = async (runId: string) => {
  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error('Not found');
  if (run.status === 'PAID') throw new Error('Cannot void a PAID run');
  return prisma.payrollRun.update({ where: { id: runId }, data: { status: 'CANCELLED' } });
};

export const updatePayrollItem = async (
  itemId: string,
  data: Partial<{ overtime: number; bonus: number; allowances: number; otherDeductions: number; notes: string }>
) => {
  const item = await prisma.payrollItem.findUnique({ where: { id: itemId } });
  if (!item) throw new Error('Item not found');
  if ((await prisma.payrollRun.findUnique({ where: { id: item.runId } }))?.status !== 'DRAFT') {
    throw new Error('Can only edit items in a DRAFT run');
  }

  const base = Number(item.baseSalary);
  const overtime = data.overtime ?? Number(item.overtime);
  const bonus = data.bonus ?? Number(item.bonus);
  const allowances = data.allowances ?? Number(item.allowances);
  const otherDeductions = data.otherDeductions ?? Number(item.otherDeductions);
  const grossPay = base + overtime + bonus + allowances;
  const { tax, socialSecurity: ssnit } = computeTaxes(grossPay, item.currency);
  const netPay = Math.max(0, grossPay - tax - ssnit - otherDeductions);

  const updated = await prisma.payrollItem.update({
    where: { id: itemId },
    data: { overtime, bonus, allowances, otherDeductions, grossPay, tax, ssnit, netPay, notes: data.notes ?? item.notes }
  });

  // Recalculate run totals
  const allItems = await prisma.payrollItem.findMany({ where: { runId: item.runId } });
  const totalGross = allItems.reduce((sum, i) => sum + Number(i.grossPay), 0);
  const totalNet = allItems.reduce((sum, i) => sum + Number(i.netPay), 0);
  await prisma.payrollRun.update({ where: { id: item.runId }, data: { totalGross, totalNet } });

  return updated;
};

export const getPayrollRuns = async (page = 1, limit = 20) => {
  const [runs, total] = await Promise.all([
    prisma.payrollRun.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip: (page - 1) * limit, take: limit
    }),
    prisma.payrollRun.count()
  ]);
  return { runs, total, page, pages: Math.ceil(total / limit) };
};

export const getPayrollRunDetail = async (runId: string) => {
  return prisma.payrollRun.findUnique({
    where: { id: runId },
    include: {
      items: {
        include: {
          employee: {
            select: {
              fullName: true, jobTitle: true, email: true, employeeCode: true,
              departmentObj: { select: { name: true } }
            }
          }
        },
        orderBy: { employee: { fullName: 'asc' } }
      }
    }
  });
};

export const getMyPayslips = async (employeeId: string) => {
  return prisma.payrollItem.findMany({
    where: { employeeId },
    include: { run: { select: { period: true, status: true, approvedAt: true } } },
    orderBy: { run: { year: 'desc' } }
  });
};

// Multi-currency summary across all paid runs for a given year
export const getPayrollSummaryByYear = async (year: number) => {
  const items = await prisma.payrollItem.findMany({
    where: { run: { year, status: { in: ['APPROVED', 'PAID'] } } },
    select: { currency: true, grossPay: true, netPay: true, tax: true, ssnit: true }
  });

  const byCurrency: Record<string, { gross: number; net: number; tax: number; ssnit: number; count: number }> = {};
  for (const i of items) {
    if (!byCurrency[i.currency]) byCurrency[i.currency] = { gross: 0, net: 0, tax: 0, ssnit: 0, count: 0 };
    byCurrency[i.currency].gross += Number(i.grossPay);
    byCurrency[i.currency].net += Number(i.netPay);
    byCurrency[i.currency].tax += Number(i.tax);
    byCurrency[i.currency].ssnit += Number(i.ssnit);
    byCurrency[i.currency].count++;
  }
  return byCurrency;
};
