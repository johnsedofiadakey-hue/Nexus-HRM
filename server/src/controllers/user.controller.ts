import { getRoleRank } from '../middleware/auth.middleware';
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
  if (getRoleRank(requestorRole) < 80) {
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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const { id: userId, role } = userReq;
    const requestedId = req.query.supervisorId as string;

    let supervisorId = userId;
    if (getRoleRank(role) >= 80 && requestedId) supervisorId = requestedId;

    const team = await prisma.user.findMany({
      where: { supervisorId, organizationId },
      include: {
        kpiSheets: {
          where: { organizationId },
          orderBy: { createdAt: 'desc' }, take: 1,
          select: { id: true, totalScore: true, status: true, isLocked: true }
        }
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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const actorRole = userReq.role;
    const actorId = userReq.id;

    // Non-directors cannot set salary on create
    if (getRoleRank(actorRole) < 80) {
      delete req.body.salary;
      delete req.body.currency;
    }

    const tempPassword = req.body.password || 'Nexus123!';
    const user = await userService.createUser(organizationId, req.body);
    const { passwordHash, ...safeUser } = user;

    // Fire-and-forget welcome email
    const settings = await prisma.systemSettings.findFirst({
      where: { organizationId }
    });
    // Get company name from Organization for welcome email
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    sendWelcomeEmail(user.email, user.fullName, tempPassword, org?.name || 'Nexus HRM').catch(console.error);

    await logAction(actorId, 'EMPLOYEE_CREATED', 'User', user.id, { email: user.email, role: user.role }, req.ip);
    res.status(201).json(withDepartment(getSafeUser(safeUser, actorRole)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── GET ALL EMPLOYEES ────────────────────────────────────────────────────
export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const filters: any = {};
    const showArchived = req.query.archived === 'true';

    if (showArchived) {
      filters.isArchived = true;
    } else {
      filters.isArchived = false;
    }

    if (req.query.department) filters.departmentId = parseInt(req.query.department as string);
    if (req.query.role) filters.role = req.query.role as any;
    if (req.query.status) filters.status = req.query.status as any;

    const users = await userService.getAllUsers(organizationId, filters);
    const userRole = userReq.role;
    res.json(users.map(u => withDepartment(getSafeUser(u, userRole))));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET SINGLE EMPLOYEE ──────────────────────────────────────────────────
export const getEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const user = await userService.getUserById(organizationId, req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(withDepartment(getSafeUser(user, userReq.role)));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPDATE EMPLOYEE ──────────────────────────────────────────────────────
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const actorRole = userReq.role;
    const actorId = userReq.id;

    // Non-directors cannot change salary or role
    if (getRoleRank(actorRole) < 80) {
      delete req.body.salary;
      delete req.body.currency;
    }
    // Only MD/DEV can reassign roles
    if (getRoleRank(actorRole) < 90 && actorRole !== 'DEV') {
      delete req.body.role;
    }

    const user = await userService.updateUser(organizationId, req.params.id, req.body);
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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const actorId = userReq.id;
    const targetId = req.params.id;

    // Prevent self-deletion
    if (actorId === targetId) return res.status(400).json({ message: 'Cannot delete your own account.' });

    // Check if target is MD (cannot delete MD via API)
    const target = await prisma.user.findFirst({
      where: { id: targetId, organizationId },
      select: { role: true, fullName: true }
    });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (getRoleRank(target.role) >= 90) {
      return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
    }

    await userService.deleteUser(organizationId, targetId);
    await logAction(actorId, 'EMPLOYEE_ARCHIVED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── HARD DELETE EMPLOYEE (MD/HR only — destructive) ─────────────
export const hardDeleteEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const actorId = userReq.id;
    const targetId = req.params.id;

    if (actorId === targetId) return res.status(400).json({ message: 'Cannot delete your own account.' });

    const target = await prisma.user.findFirst({
      where: { id: targetId, organizationId },
      select: { role: true, fullName: true }
    });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (getRoleRank(target.role) >= 90) {
      return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
    }

    await userService.hardDeleteUser(organizationId, targetId);
    await logAction(actorId, 'EMPLOYEE_HARD_DELETED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ASSIGN ROLE (MD only) ────────────────────────────────────────────────
export const assignRole = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const actorId = userReq.id;
    const { userId, role, supervisorId } = req.body;

    const validRoles = ['DEV', 'MD', 'DIRECTOR', 'MANAGER', 'MID_MANAGER', 'STAFF', 'CASUAL'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}` });
    }

    const updateData: any = { role };
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId || null;

    const user = await prisma.user.update({
      where: { id: userId, organizationId },
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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const { role: actorRole, id: actorId } = userReq;
    const targetId = req.params.id;

    if (getRoleRank(actorRole) < 80 && actorId !== targetId) {
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

      try { fs.unlinkSync(req.file.path); } catch { }
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

    await userService.updateUser(organizationId, targetId, { avatarUrl: publicUrl } as any);
    await logAction(actorId, 'AVATAR_UPDATED', 'User', targetId, {}, req.ip);
    res.json({ url: publicUrl, message: 'Avatar updated successfully' });
  } catch (err: any) {
    res.status(500).json({ message: 'Image upload failed: ' + err.message });
  }
};

// ─── GET SUPERVISORS LIST (for dropdowns) ────────────────────────────────
export const getSupervisors = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.organizationId || 'default-tenant';
  const supervisors = await prisma.user.findMany({
    where: { organizationId, role: { in: ['MD', 'DIRECTOR', 'MANAGER'] }, status: 'ACTIVE' },
    select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' }
  });
  res.json(supervisors);
};

// ─── RISK PROFILE ─────────────────────────────────────────────────────────
// ─── ARCHIVE EMPLOYEE (Soft Delete) ──────────────────────────────────────
export const archiveEmployee = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const { id } = req.params;
    await prisma.user.update({
      where: { id, organizationId },
      data: { isArchived: true, status: 'ARCHIVED', archivedDate: new Date() }
    });
    await logAction(user.id, 'EMPLOYEE_ARCHIVED', 'User', id, {}, req.ip);
    res.json({ message: 'Employee archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── RESTORE EMPLOYEE ─────────────────────────────────────────────────────
export const restoreEmployee = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const { id } = req.params;
    await prisma.user.update({
      where: { id, organizationId },
      data: { isArchived: false, status: 'ACTIVE', archivedDate: null }
    });
    await logAction(user.id, 'EMPLOYEE_RESTORED', 'User', id, {}, req.ip);
    res.json({ message: 'Employee restored successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── TRANSFER DEPARTMENT ──────────────────────────────────────────────────
export const transferEmployee = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || 'default-tenant';
    const { id } = req.params;
    const { departmentId, reason } = req.body;
    await prisma.user.update({
      where: { id, organizationId },
      data: { departmentId: parseInt(departmentId) }
    });
    await logAction(user.id, 'EMPLOYEE_TRANSFERRED', 'User', id, { departmentId, reason }, req.ip);
    res.json({ message: 'Employee transferred successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PROMOTE EMPLOYEE ─────────────────────────────────────────────────────
export const promoteEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const { id } = req.params;
    const { jobTitle, role, salary, reason } = req.body;
    const updateData: any = { jobTitle, role };
    if (salary) updateData.salary = salary;

    await prisma.user.update({
      where: { id, organizationId },
      data: updateData
    });

    // Optionally log in history
    await prisma.employeeHistory.create({
      data: {
        organizationId,
        employeeId: id,
        title: 'Promotion',
        description: `Promoted to ${jobTitle} (${role}). Reason: ${reason || 'N/A'}`,
        type: 'PROMOTION',
        createdById: userReq.id
      }
    });

    await logAction(userReq.id, 'EMPLOYEE_PROMOTED', 'User', id, { jobTitle, role, reason }, req.ip);
    res.json({ message: 'Employee promoted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

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
