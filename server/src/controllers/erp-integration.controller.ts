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

/**
 * MANAGEMENT ENDPOINTS (Administrative)
 * These are used by the internal Nexus UI to manage the keys.
 */

export const listIntegrations = async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user.organizationId || 'default-tenant';
    const integrations = await prisma.erpIntegration.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(integrations);
  } catch (err: any) {
    errorLogger.log('ErpController.listIntegrations', err);
    return res.status(500).json({ error: 'Failed to list integrations' });
  }
};

export const createIntegration = async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user.organizationId || 'default-tenant';
    const { systemName, ipWhitelist } = req.body;

    if (!systemName) {
      return res.status(400).json({ error: 'System name is required' });
    }

    // Generate a secure random API key
    const { v4: uuidv4 } = require('uuid');
    const apiKey = `nx_${uuidv4().replace(/-/g, '')}`;

    const integration = await prisma.erpIntegration.create({
      data: {
        organizationId: orgId,
        systemName,
        apiKey,
        ipWhitelist: ipWhitelist || null,
        isActive: true
      }
    });

    return res.status(201).json(integration);
  } catch (err: any) {
    errorLogger.log('ErpController.createIntegration', err);
    return res.status(500).json({ error: 'Failed to create integration' });
  }
};

export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user.organizationId || 'default-tenant';
    const { id } = req.params;

    await prisma.erpIntegration.deleteMany({
      where: { id, organizationId: orgId }
    });

    return res.json({ success: true, message: 'Integration deleted' });
  } catch (err: any) {
    errorLogger.log('ErpController.deleteIntegration', err);
    return res.status(500).json({ error: 'Failed to delete integration' });
  }
};

export const toggleIntegration = async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user.organizationId || 'default-tenant';
    const { id } = req.params;
    const { isActive } = req.body;

    const integration = await prisma.erpIntegration.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: !!isActive }
    });

    return res.json({ success: true, count: integration.count });
  } catch (err: any) {
    errorLogger.log('ErpController.toggleIntegration', err);
    return res.status(500).json({ error: 'Failed to toggle integration' });
  }
};
