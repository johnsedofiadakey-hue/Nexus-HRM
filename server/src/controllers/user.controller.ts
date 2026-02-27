import { Request, Response } from 'express';
import prisma from '../prisma/client';
import * as userService from '../services/user.service';
import * as riskService from '../services/risk.service';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';
import { sendWelcomeEmail } from '../services/email.service';

// ─── Field filter by role ─────────────────────────────────────────────────
const getSafeUser = (user: any, requestorRole: string) => {
  const { passwordHash, ...safe } = user;
  if (requestorRole !== 'MD') {
    delete safe.salary;
    delete safe.currency;
  }
  return safe;
};

const withDepartment = (u: any) => {
  const { departmentObj, ...rest } = u || {};
  return { ...rest, department: departmentObj?.name };
};

// ─── GET MY TEAM ──────────────────────────────────────────────────────────
export const getMyTeam = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { id: userId, role } = req.user;
    const requestedId = req.query.supervisorId as string;

    let supervisorId = userId;
    if (['MD', 'HR_ADMIN'].includes(role) && requestedId) supervisorId = requestedId;

    const team = await prisma.user.findMany({
      where: { supervisorId },
      include: {
        kpiSheets: { orderBy: { createdAt: 'desc' }, take: 1,
          select: { id: true, totalScore: true, status: true, isLocked: true } }
      }
    });

    return res.json(team.map(emp => ({
      id: emp.id, name: emp.fullName, role: emp.jobTitle,
      email: emp.email, avatar: emp.avatarUrl, status: emp.status,
      kpiSheets: emp.kpiSheets,
      lastSheetId: emp.kpiSheets[0]?.id,
      lastScore: emp.kpiSheets[0]?.totalScore || 0,
      performance: (emp.kpiSheets[0]?.totalScore || 0) > 80 ? 'On Track' : 'Needs Attention'
    })));
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── CREATE EMPLOYEE ──────────────────────────────────────────────────────
export const createEmployee = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const actorRole = req.user?.role;
    // @ts-ignore
    const actorId = req.user?.id;

    // IT Admin cannot set salary/compensation
    if (actorRole === 'IT_ADMIN') {
      delete req.body.salary;
      delete req.body.currency;
    }

    const tempPassword = req.body.password || 'Nexus123!';
    const user = await userService.createUser(req.body);
    const { passwordHash, ...safeUser } = user;

    // Fire-and-forget welcome email
    const settings = await prisma.systemSettings.findFirst();
    sendWelcomeEmail(user.email, user.fullName, tempPassword, settings?.companyName || 'Nexus HRM').catch(console.error);

    await logAction(actorId, 'EMPLOYEE_CREATED', 'User', user.id, { email: user.email, role: user.role }, req.ip);
    res.status(201).json(withDepartment(getSafeUser(safeUser, actorRole)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── GET ALL EMPLOYEES ────────────────────────────────────────────────────
export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const filters: any = { isArchived: false };
    if (req.query.department) filters.department = req.query.department as string;
    if (req.query.role) filters.role = req.query.role as any;
    if (req.query.status) filters.status = req.query.status as any;

    const users = await userService.getAllUsers(filters);
    // @ts-ignore
    const userRole = req.user?.role;
    res.json(users.map(u => withDepartment(getSafeUser(u, userRole))));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET SINGLE EMPLOYEE ──────────────────────────────────────────────────
export const getEmployee = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // @ts-ignore
    res.json(withDepartment(getSafeUser(user, req.user?.role)));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPDATE EMPLOYEE ──────────────────────────────────────────────────────
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const actorRole = req.user?.role;
    // @ts-ignore
    const actorId = req.user?.id;

    if (actorRole === 'IT_ADMIN') {
      delete req.body.salary;
      delete req.body.currency;
      delete req.body.role; // IT Admin cannot change roles
    }

    const user = await userService.updateUser(req.params.id, req.body);
    const { passwordHash, ...safe } = user;
    await logAction(actorId, 'EMPLOYEE_UPDATED', 'User', req.params.id, { fields: Object.keys(req.body) }, req.ip);
    res.json(withDepartment(getSafeUser(safe, actorRole)));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE EMPLOYEE (MD/HR only — hard delete with cascade) ─────────────
export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const actorId = req.user?.id;
    const targetId = req.params.id;

    // Prevent self-deletion
    if (actorId === targetId) return res.status(400).json({ message: 'Cannot delete your own account.' });

    // Check if target is MD (cannot delete MD via API)
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true, fullName: true } });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.role === 'MD' || target.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
    }

    await userService.deleteUser(targetId);
    await logAction(actorId, 'EMPLOYEE_DELETED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ASSIGN ROLE (MD only) ────────────────────────────────────────────────
export const assignRole = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const actorId = req.user?.id;
    const { userId, role, supervisorId } = req.body;

    const validRoles = ['MD', 'HR_ADMIN', 'IT_ADMIN', 'SUPERVISOR', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}` });
    }

    const updateData: any = { role };
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId || null;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, fullName: true, role: true, supervisorId: true }
    });

    await notify(userId, 'Your Role Has Been Updated',
      `Your role has been changed to ${role}.`, 'INFO');
    await logAction(actorId, 'ROLE_ASSIGNED', 'User', userId, { role, supervisorId }, req.ip);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── UPLOAD AVATAR ────────────────────────────────────────────────────────
export const uploadImage = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const { role: actorRole, id: actorId } = req.user;
    const targetId = req.params.id;

    if (!['MD', 'HR_ADMIN', 'IT_ADMIN'].includes(actorRole) && actorId !== targetId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let publicUrl: string | null = null;

    // A: Multipart file upload
    if (req.file) {
      const sharp = (await import('sharp')).default;
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;

      const outputPath = req.file.path.replace(/\.[^.]+$/, '-avatar.webp');
      await sharp(req.file.path)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(outputPath);

      try { fs.unlinkSync(req.file.path); } catch {}
      const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      publicUrl = `${baseUrl}/uploads/${path.basename(outputPath)}`;
    }

    // B: Base64
    if (!publicUrl && req.body.image) {
      const sharp = (await import('sharp')).default;
      const fs = (await import('fs')).default;
      const base64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      const filename = `avatar-${targetId}-${Date.now()}.webp`;
      const filepath = `public/uploads/${filename}`;
      if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });
      await sharp(buf).resize(400, 400, { fit: 'cover' }).webp({ quality: 85 }).toFile(filepath);
      const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
      publicUrl = `${baseUrl}/uploads/${filename}`;
    }

    // C: URL string provided directly
    if (!publicUrl && req.body.avatarUrl) {
      publicUrl = req.body.avatarUrl;
    }

    if (!publicUrl) return res.status(400).json({ message: 'No image provided.' });

    await userService.updateUser(targetId, { avatarUrl: publicUrl } as any);
    await logAction(actorId, 'AVATAR_UPDATED', 'User', targetId, {}, req.ip);
    res.json({ url: publicUrl, message: 'Avatar updated successfully' });
  } catch (err: any) {
    res.status(500).json({ message: 'Image upload failed: ' + err.message });
  }
};

// ─── GET SUPERVISORS LIST (for dropdowns) ────────────────────────────────
export const getSupervisors = async (_req: Request, res: Response) => {
  const supervisors = await prisma.user.findMany({
    where: { role: { in: ['MD', 'SUPERVISOR', 'HR_ADMIN'] }, status: 'ACTIVE' },
    select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' }
  });
  res.json(supervisors);
};

// ─── RISK PROFILE ─────────────────────────────────────────────────────────
export const getUserRiskProfile = async (req: Request, res: Response) => {
  try {
    const profile = await riskService.getRiskProfile(req.params.id);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Legacy alias
export const createEmployeeWithNotifications = createEmployee;
