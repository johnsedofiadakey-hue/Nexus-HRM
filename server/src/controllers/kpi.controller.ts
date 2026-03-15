import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

// ─── HELPER: can reviewer assign to this employee? ────────────────────────
const canAssignTo = async (organizationId: string, reviewerId: string, employeeId: string, role: string) => {
  if (getRoleRank(role) >= 80) return true;
  if (role === 'MANAGER' || role === 'MID_MANAGER') {
    const emp = await prisma.user.findFirst({
      where: { id: employeeId, organizationId },
      select: { supervisorId: true }
    });
    return emp?.supervisorId === reviewerId;
  }
  return false;
};

// 1. ASSIGN KPI TARGETS
export const createKpiSheet = async (req: Request, res: Response) => {
  try {
    const { title, employeeId, month, year, items } = req.body;
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const reviewerId = user.id;
    const reviewerRole = user.role;

    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    if (!items?.length) return res.status(400).json({ error: 'At least one KPI item is required' });

    // Enforce org chart chain
    if (!(await canAssignTo(organizationId, reviewerId, employeeId, reviewerRole))) {
      return res.status(403).json({ error: 'You can only assign KPIs to your direct reports.' });
    }

    // Weights must sum to 100
    const totalWeight = items.reduce((s: number, i: any) => s + parseFloat(i.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.5) {
      return res.status(400).json({ error: `KPI weights must sum to 100%. Current: ${totalWeight.toFixed(1)}%` });
    }

    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    const sheet = await prisma.kpiSheet.create({
      data: {
        organizationId,
        title: title || `KPI Sheet — ${monthName}`,
        month: parseInt(month), year: parseInt(year),
        employeeId, reviewerId, status: 'ACTIVE',
        items: {
          create: items.map((i: any) => ({
            organizationId,
            name: i.name || i.description || 'KPI Goal',
            category: i.category || 'General',
            description: i.description || '',
            weight: parseFloat(i.weight),
            targetValue: parseFloat(i.target || i.targetValue || 0),
            actualValue: 0, score: 0
          }))
        }
      },
      include: { items: true, employee: { select: { fullName: true } } }
    });

    await notify(employeeId, '🎯 New KPI Targets Set',
      `Your manager has set KPI targets for ${monthName}.`, 'INFO', '/performance');
    await logAction(reviewerId, 'KPI_ASSIGNED', 'KpiSheet', sheet.id, { employeeId, month, year }, req.ip);
    return res.status(201).json(sheet);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// 2. MY SHEETS (assigned to me)
export const getMySheets = async (req: Request, res: Response) => {
  try {  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  const start = Date.now();
  const sheets = await prisma.kpiSheet.findMany({
    where: { employeeId: user.id, organizationId },
    include: { items: true, reviewer: { select: { fullName: true, role: true, avatarUrl: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  });
  console.log(`[PERF] getMySheets for ${user.id} took ${Date.now() - start}ms`);
  return res.json(sheets);
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 3. SHEETS I ASSIGNED (as reviewer/manager)
export const getSheetsIAssigned = async (req: Request, res: Response) => {
  try {  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  const { id: reviewerId, role } = user;
  const where: any = { organizationId };
  if (getRoleRank(role) < 80) where.reviewerId = reviewerId;

  const sheets = await prisma.kpiSheet.findMany({
    where: where,
    include: {
      items: true,
      employee: { select: { fullName: true, avatarUrl: true } },
      reviewer: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  return res.json(sheets);
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 4. SINGLE SHEET
export const getSheetById = async (req: Request, res: Response) => {
  try {  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  const { id: userId, role } = user;
  const sheet = await prisma.kpiSheet.findFirst({
    where: { id: req.params.id, organizationId },
    include: {
      items: true,
      employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
      reviewer: { select: { id: true, fullName: true, role: true } }
    }
  });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  const canView = sheet.employeeId === userId || sheet.reviewerId === userId
    || getRoleRank(role) >= 80;
  if (!canView) return res.status(403).json({ error: 'Access denied' });
  return res.json(sheet);
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 5. UPDATE PROGRESS (employee enters actuals)
export const updateKpiProgress = async (req: Request, res: Response) => {
  try {  const { sheetId, items, submit } = req.body;
  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  const userId = user.id;
  const sheet = await prisma.kpiSheet.findFirst({
    where: { id: sheetId, organizationId }
  });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.employeeId !== userId) return res.status(403).json({ error: 'Not your sheet' });
  if (sheet.isLocked) return res.status(403).json({ error: 'Sheet is locked after approval' });
  if (sheet.status === 'PENDING_APPROVAL') return res.status(403).json({ error: 'Sheet is pending review — recall it first to edit' });

  let total = 0;
  if (items?.length) {
    for (const upd of items) {
      const item = await prisma.kpiItem.findFirst({
        where: { id: upd.id, organizationId }
      });
      if (!item || item.sheetId !== sheetId) continue;
      const actual = parseFloat(upd.actualValue);
      const raw = item.targetValue > 0 ? (actual / item.targetValue) * item.weight : 0;
      const score = Math.min(raw, item.weight * 1.2);
      await prisma.kpiItem.updateMany({
        where: { id: upd.id, organizationId },
        data: { actualValue: actual, score, lastEntryDate: new Date() }
      });
      total += score;
    }
  } else {
    const existing = await prisma.kpiItem.findMany({
      where: { sheetId: sheetId, organizationId }
    });
    total = existing.reduce((s, i) => s + (i.score || 0), 0);
  }

  const status = submit ? 'PENDING_APPROVAL' : 'ACTIVE';
  await prisma.kpiSheet.updateMany({
    where: { id: sheetId, organizationId },
    data: { totalScore: total, status }
  });

  if (submit && sheet.reviewerId) {
    await notify(sheet.reviewerId, 'KPI Sheet Submitted for Review',
      'An employee submitted their KPI sheet.', 'INFO', '/team');
  }
  await logAction(userId, submit ? 'KPI_SUBMITTED' : 'KPI_UPDATED', 'KpiSheet', sheetId, { score: total }, req.ip);
  return res.json({ success: true, totalScore: total, status });
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 6. REVIEW (approve/reject)
export const reviewKpiSheet = async (req: Request, res: Response) => {
  try {  const { sheetId, decision, feedback } = req.body;
  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  const { id: managerId, role } = user;
  const sheet = await prisma.kpiSheet.findFirst({
    where: { id: sheetId, organizationId }
  });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.reviewerId !== managerId && getRoleRank(role) < 80)
    return res.status(403).json({ error: 'Only the assigned reviewer can approve' });
  if (sheet.status !== 'PENDING_APPROVAL')
    return res.status(400).json({ error: 'Sheet must be PENDING_APPROVAL to review' });

  const approved = decision === 'APPROVE';
  await prisma.kpiSheet.updateMany({
    where: { id: sheetId, organizationId },
    data: { status: approved ? 'LOCKED' : 'ACTIVE', isLocked: approved, lockedAt: approved ? new Date() : null }
  });

  if (sheet.employeeId) {
    await notify(sheet.employeeId,
      approved ? '🎉 KPI Sheet Approved' : '🔄 KPI Sheet Returned for Revision',
      approved ? 'Your KPI sheet has been approved.' : `Returned for changes. ${feedback || ''}`,
      approved ? 'SUCCESS' : 'WARNING', '/performance');
  }
  await logAction(managerId, 'KPI_REVIEWED', 'KpiSheet', sheetId, { decision, feedback }, req.ip);
  return res.json({ success: true, status: approved ? 'LOCKED' : 'ACTIVE' });
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 7. RECALL (employee pulls back submitted sheet)
export const recallKpiSheet = async (req: Request, res: Response) => {
  try {  const { sheetId } = req.body;
  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  const userId = user.id;
  const sheet = await prisma.kpiSheet.findFirst({
    where: { id: sheetId, organizationId }
  });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.employeeId !== userId) return res.status(403).json({ error: 'Not your sheet' });
  if (sheet.isLocked) return res.status(400).json({ error: 'Approved sheets cannot be recalled' });
  if (sheet.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Sheet is not pending' });
  await prisma.kpiSheet.updateMany({
    where: { id: sheetId, organizationId },
    data: { status: 'ACTIVE' }
  });
  return res.json({ success: true });
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 8. DELETE (MD/HR only)
export const deleteKpiSheet = async (req: Request, res: Response) => {
  try {  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  await prisma.kpiItem.deleteMany({
    where: { sheetId: req.params.id, organizationId }
  });
  await prisma.kpiSheet.deleteMany({
    where: { id: req.params.id, organizationId }
  });
  return res.status(204).send();
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// 9. ALL SHEETS (MD overview)
export const getAllSheets = async (req: Request, res: Response) => {
  try {  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  const { month, year, employeeId } = req.query;
  const sheets = await prisma.kpiSheet.findMany({
    where: {
      organizationId,
      ...(month ? { month: parseInt(month as string) } : {}),
      ...(year ? { year: parseInt(year as string) } : {}),
      ...(employeeId ? { employeeId: employeeId as string } : {})
    },
    include: {
      employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
      reviewer: { select: { fullName: true } },
      items: true
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  });
  return res.json(sheets);
  } catch (err: any) {
    console.error('[kpi.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
