import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

// ─── HELPER: can reviewer assign to this employee? ────────────────────────
const canAssignTo = async (reviewerId: string, employeeId: string, role: string) => {
  if (role === 'MD' || role === 'HR_ADMIN') return true;
  if (role === 'SUPERVISOR') {
    const emp = await prisma.user.findUnique({ where: { id: employeeId }, select: { supervisorId: true } });
    return emp?.supervisorId === reviewerId;
  }
  return false;
};

// 1. ASSIGN KPI TARGETS
export const createKpiSheet = async (req: Request, res: Response) => {
  try {
    const { title, employeeId, month, year, items } = req.body;
    // @ts-ignore
    const reviewerId = req.user?.id;
    // @ts-ignore
    const reviewerRole = req.user?.role;

    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    if (!items?.length) return res.status(400).json({ error: 'At least one KPI item is required' });

    // Enforce org chart chain
    if (!(await canAssignTo(reviewerId, employeeId, reviewerRole))) {
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
        title: title || `KPI Sheet — ${monthName}`,
        month: parseInt(month), year: parseInt(year),
        employeeId, reviewerId, status: 'ACTIVE',
        items: {
          create: items.map((i: any) => ({
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
  // @ts-ignore
  const sheets = await prisma.kpiSheet.findMany({
    // @ts-ignore
    where: { employeeId: req.user?.id },
    include: { items: true, reviewer: { select: { fullName: true, role: true, avatarUrl: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  });
  return res.json(sheets);
};

// 3. SHEETS I ASSIGNED (as reviewer/manager)
export const getSheetsIAssigned = async (req: Request, res: Response) => {
  // @ts-ignore
  const { id: reviewerId, role } = req.user;
  const where = ['MD', 'HR_ADMIN'].includes(role) ? {} : { reviewerId };
  const sheets = await prisma.kpiSheet.findMany({
    where,
    include: {
      items: true,
      employee: { select: { fullName: true, jobTitle: true, avatarUrl: true, role: true } },
      reviewer: { select: { fullName: true } }
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  });
  return res.json(sheets);
};

// 4. SINGLE SHEET
export const getSheetById = async (req: Request, res: Response) => {
  // @ts-ignore
  const { id: userId, role } = req.user;
  const sheet = await prisma.kpiSheet.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
      reviewer: { select: { id: true, fullName: true, role: true } }
    }
  });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  const canView = sheet.employeeId === userId || sheet.reviewerId === userId
    || ['MD', 'HR_ADMIN'].includes(role);
  if (!canView) return res.status(403).json({ error: 'Access denied' });
  return res.json(sheet);
};

// 5. UPDATE PROGRESS (employee enters actuals)
export const updateKpiProgress = async (req: Request, res: Response) => {
  const { sheetId, items, submit } = req.body;
  // @ts-ignore
  // @ts-ignore
  const userId = req.user?.id;
  const sheet = await prisma.kpiSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.employeeId !== userId) return res.status(403).json({ error: 'Not your sheet' });
  if (sheet.isLocked) return res.status(403).json({ error: 'Sheet is locked after approval' });
  if (sheet.status === 'PENDING_APPROVAL') return res.status(403).json({ error: 'Sheet is pending review — recall it first to edit' });

  let total = 0;
  if (items?.length) {
    for (const upd of items) {
      const item = await prisma.kpiItem.findUnique({ where: { id: upd.id } });
      if (!item || item.sheetId !== sheetId) continue;
      const actual = parseFloat(upd.actualValue);
      const raw = item.targetValue > 0 ? (actual / item.targetValue) * item.weight : 0;
      const score = Math.min(raw, item.weight * 1.2);
      await prisma.kpiItem.update({ where: { id: upd.id }, data: { actualValue: actual, score, lastEntryDate: new Date() } });
      total += score;
    }
  } else {
    const existing = await prisma.kpiItem.findMany({ where: { sheetId: sheetId } });
    total = existing.reduce((s, i) => s + (i.score || 0), 0);
  }

  const status = submit ? 'PENDING_APPROVAL' : 'ACTIVE';
  await prisma.kpiSheet.update({ where: { id: sheetId }, data: { totalScore: total, status } });

  if (submit && sheet.reviewerId) {
    await notify(sheet.reviewerId, 'KPI Sheet Submitted for Review',
      'An employee submitted their KPI sheet.', 'INFO', '/team');
  }
  await logAction(userId, submit ? 'KPI_SUBMITTED' : 'KPI_UPDATED', 'KpiSheet', sheetId, { score: total }, req.ip);
  return res.json({ success: true, totalScore: total, status });
};

// 6. REVIEW (approve/reject)
export const reviewKpiSheet = async (req: Request, res: Response) => {
  const { sheetId, decision, feedback } = req.body;
  // @ts-ignore
  const { id: managerId, role } = req.user;
  const sheet = await prisma.kpiSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.reviewerId !== managerId && !['MD', 'HR_ADMIN'].includes(role))
    return res.status(403).json({ error: 'Only the assigned reviewer can approve' });
  if (sheet.status !== 'PENDING_APPROVAL')
    return res.status(400).json({ error: 'Sheet must be PENDING_APPROVAL to review' });

  const approved = decision === 'APPROVE';
  await prisma.kpiSheet.update({
    where: { id: sheetId },
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
};

// 7. RECALL (employee pulls back submitted sheet)
export const recallKpiSheet = async (req: Request, res: Response) => {
  const { sheetId } = req.body;
  // @ts-ignore
  const userId = req.user?.id;
  const sheet = await prisma.kpiSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) return res.status(404).json({ error: 'Not found' });
  if (sheet.employeeId !== userId) return res.status(403).json({ error: 'Not your sheet' });
  if (sheet.isLocked) return res.status(400).json({ error: 'Approved sheets cannot be recalled' });
  if (sheet.status !== 'PENDING_APPROVAL') return res.status(400).json({ error: 'Sheet is not pending' });
  await prisma.kpiSheet.update({ where: { id: sheetId }, data: { status: 'ACTIVE' } });
  return res.json({ success: true });
};

// 8. DELETE (MD/HR only)
export const deleteKpiSheet = async (req: Request, res: Response) => {
  await prisma.kpiItem.deleteMany({ where: { sheetId: req.params.id } });
  await prisma.kpiSheet.delete({ where: { id: req.params.id } });
  return res.status(204).send();
};

// 9. ALL SHEETS (MD overview)
export const getAllSheets = async (req: Request, res: Response) => {
  // @ts-ignore
  const { month, year, employeeId } = req.query;
  const sheets = await prisma.kpiSheet.findMany({
    where: {
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
};
