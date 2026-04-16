import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { createObjectCsvStringifier } from 'csv-writer';
import { errorLogger } from '../services/error-log.service';

/**
 * ERP Integration Controller
 * Handles standardized CSV exports for external ERP systems (SAP, Sage, etc.)
 */
export const exportEmployeesCsv = async (req: Request, res: Response) => {
  try {
    const erp = (req as any).erp;
    const orgId = erp.organizationId;

    const employees = await prisma.user.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: {
        employeeCode: true,
        fullName: true,
        email: true,
        jobTitle: true,
        departmentObj: { select: { name: true } },
        joinDate: true,
        status: true,
        salary: true,
        currency: true
      }
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'employeeCode', title: 'EXTERNAL_ID' },
        { id: 'fullName', title: 'FULL_NAME' },
        { id: 'email', title: 'EMAIL' },
        { id: 'jobTitle', title: 'POSITION' },
        { id: 'deptName', title: 'DEPARTMENT' },
        { id: 'joinDate', title: 'JOIN_DATE' },
        { id: 'status', title: 'STATUS' },
        { id: 'salary', title: 'BASE_SALARY' },
        { id: 'currency', title: 'CURRENCY' }
      ]
    });

    const records = employees.map(e => ({
      ...e,
      deptName: e.departmentObj?.name || 'Unassigned',
      joinDate: e.joinDate ? e.joinDate.toISOString().split('T')[0] : ''
    }));

    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nexus_employees_${erp.systemName.replace(/\s+/g, '_')}.csv"`);
    return res.send(csvString);

  } catch (err: any) {
    errorLogger.log('ErpController.exportEmployeesCsv', err);
    return res.status(500).json({ error: 'Failed to generate ERP employee export' });
  }
};

export const exportPayrollCsv = async (req: Request, res: Response) => {
  try {
    const erp = (req as any).erp;
    const orgId = erp.organizationId;

    // Fetch finalized payroll runs
    const payrollRuns = await prisma.payrollRun.findMany({
      where: { organizationId: orgId, status: 'COMPLETED' },
      orderBy: { period: 'desc' },
      take: 1
    });

    if (payrollRuns.length === 0) {
      return res.status(404).json({ error: 'No finalized payroll runs found to export.' });
    }

    const lastRun = payrollRuns[0];
    const items = await prisma.payrollItem.findMany({
      where: { runId: lastRun.id },
      include: {
        employee: { select: { employeeCode: true, fullName: true, departmentObj: { select: { name: true } } } }
      }
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'externalId', title: 'ERP_INTERNAL_ID' },
        { id: 'fullName', title: 'EMPLOYEE_NAME' },
        { id: 'dept', title: 'COST_CENTER' },
        { id: 'period', title: 'POSTING_PERIOD' },
        { id: 'gross', title: 'DEBIT_GROSS' },
        { id: 'net', title: 'CREDIT_NET_PAYABLE' },
        { id: 'tax', title: 'TAX_WITHHOLDING' },
        { id: 'ss', title: 'SOCIAL_SECURITY' }
      ]
    });

    const records = items.map(i => ({
      externalId: i.employee?.employeeCode || i.employeeId,
      fullName: i.employee?.fullName,
      dept: i.employee?.departmentObj?.name || 'GENERAL',
      period: lastRun.period,
      gross: i.grossPay,
      net: i.netPay,
      tax: i.tax,
      ss: i.ssnit
    }));

    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nexus_payroll_${lastRun.period}.csv"`);
    return res.send(csvString);

  } catch (err: any) {
    errorLogger.log('ErpController.exportPayrollCsv', err);
    return res.status(500).json({ error: 'Failed to generate ERP payroll export' });
  }
};

export const exportLeaveCsv = async (req: Request, res: Response) => {
  try {
    const erp = (req as any).erp;
    const orgId = erp.organizationId;

    const users = await prisma.user.findMany({
      where: { organizationId: orgId, isArchived: false },
      select: {
        employeeCode: true,
        fullName: true,
        leaveBalance: true,
        leaveAllowance: true,
        leaveBroughtForward: true
      }
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'employeeCode', title: 'STAFF_ID' },
        { id: 'fullName', title: 'NAME' },
        { id: 'allowance', title: 'YEARLY_ALLOCATION' },
        { id: 'broughtForward', title: 'BROUGHT_FORWARD' },
        { id: 'totalReservoir', title: 'TOTAL_RESERVOIR' },
        { id: 'currentBalance', title: 'CURRENT_BALANCE' }
      ]
    });

    const records = users.map(u => ({
      employeeCode: u.employeeCode || u.fullName,
      fullName: u.fullName,
      allowance: Number(u.leaveAllowance || 30),
      broughtForward: Number(u.leaveBroughtForward || 0),
      totalReservoir: Number(u.leaveAllowance || 30) + Number(u.leaveBroughtForward || 0),
      currentBalance: Number(u.leaveBalance || 30)
    }));

    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nexus_leave_provisioning.csv"`);
    return res.send(csvString);

  } catch (err: any) {
    errorLogger.log('ErpController.exportLeaveCsv', err);
    return res.status(500).json({ error: 'Failed to generate ERP leave export' });
  }
};
