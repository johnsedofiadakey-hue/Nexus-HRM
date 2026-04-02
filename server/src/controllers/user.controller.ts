import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import prisma from '../prisma/client';
import * as userService from '../services/user.service';
import * as riskService from '../services/risk.service';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';
import { sendWelcomeEmail } from '../services/email.service';

import { decryptValue } from '../utils/encryption';

// ─── Field filter by role ─────────────────────────────────────────────────
const getSafeUser = (user: any, requestorRole: string) => {
  const { passwordHash, ...safe } = user;
  const userRank = getRoleRank(requestorRole);

  // Decrypt sensitive fields if authorized (HR/MD (>= 85))
  // 🛡️ REFINEMENT: Always try to decrypt if the Enc field exists, to ensure fresh plain text for the frontend.
  if (userRank >= 85) {
    if (safe.bankAccountEnc) {
        const dec = decryptValue(safe.bankAccountEnc);
        if (dec) safe.bankAccountNumber = dec;
    }
    if (safe.ghanaCardEnc) {
        const dec = decryptValue(safe.ghanaCardEnc);
        if (dec) safe.nationalId = dec;
    }
    if (safe.ssnitEnc) {
        const dec = decryptValue(safe.ssnitEnc);
        if (dec) safe.ssnitNumber = dec;
    }
    if (safe.salaryEnc) {
      const dec = decryptValue(safe.salaryEnc);
      if (dec) safe.salary = parseFloat(dec);
    }
  }

  // Parse certifications if stringified JSON
  if (typeof safe.certifications === 'string' && safe.certifications.startsWith('[')) {
    try {
      safe.certifications = JSON.parse(safe.certifications);
    } catch (e) {
      safe.certifications = [];
    }
  }

  if (userRank < 85) {
    delete safe.salary;
    delete safe.currency;
    delete safe.bankAccountEnc;
    delete safe.ghanaCardEnc;
    delete safe.ssnitEnc;
    delete safe.salaryEnc;
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
    const isDev = userReq.role === 'DEV';
    const organizationId = isDev ? undefined : (userReq.organizationId || 'default-tenant');
    const whereOrg = organizationId ? { organizationId } : {};
    const { id: userId, role } = userReq;
    const requestedId = req.query.supervisorId as string;

    let supervisorId = userId;
    if (getRoleRank(role) >= 80 && requestedId) supervisorId = requestedId;

    const team = await prisma.user.findMany({
      where: { supervisorId, ...whereOrg },
      include: {
        kpiSheets: {
          where: whereOrg,
          orderBy: { createdAt: 'desc' }, take: 10,
          select: { id: true, totalScore: true, status: true, isLocked: true }
        }
      }
    });

    return res.json(team.map(emp => ({
      id: emp.id, 
      name: emp.fullName, 
      fullName: emp.fullName, // For consistency with TargetCascadeModal
      role: emp.jobTitle,
      jobTitle: emp.jobTitle,  // For consistency with TargetCascadeModal
      email: emp.email, 
      avatar: emp.avatarUrl, 
      avatarUrl: emp.avatarUrl,
      status: emp.status,
      kpiSheets: emp.kpiSheets,
      lastSheetId: emp.kpiSheets[0]?.id,
      lastScore: Number(emp.kpiSheets[0]?.totalScore || 0),
      performance: Number(emp.kpiSheets[0]?.totalScore || 0) > 80 ? 'On Track' : 'Needs Attention'
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
    const actorRank = userReq.rank;
    const actorRole = userReq.role;
    const actorId = userReq.id;

    // Only HR/MD (>= 85) can set salary/currency on create
    // HR can create Directors/Managers, but only MD can create HR (85+)
    const targetRank = getRoleRank(req.body.role);
    if (actorRank < 85) {
      delete req.body.salary;
      delete req.body.currency;
    }
    if (actorRank < 90 && targetRank >= 85 && actorRank < targetRank) {
        return res.status(403).json({ error: 'Access denied: Only the MD can create high-level administrative accounts.' });
    }

    const tempPassword = req.body.password || 'Nexus123!';
    
    // 🛡️ Validate SubUnit/Department pairing
    if (req.body.subUnitId && req.body.departmentId) {
      const subUnit = await prisma.subUnit.findUnique({ where: { id: req.body.subUnitId } });
      if (subUnit && subUnit.departmentId !== Number(req.body.departmentId)) {
        return res.status(400).json({ error: 'The selected sub-unit does not belong to the selected department.' });
      }
    }

    const user = await userService.createUser(organizationId, req.body);
    const { passwordHash, ...safeUser } = user;

    // Fire-and-forget welcome email
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    sendWelcomeEmail(user.email, user.fullName, tempPassword, org?.name || 'Nexus HRM').catch(console.error);

    // 🚀 AUTO-ONBOARDING: Attach default template if exists
    try {
      const defaultTemplate = await prisma.onboardingTemplate.findFirst({
        where: { organizationId, isDefault: true },
        include: { tasks: { orderBy: { order: 'asc' } } }
      });

      if (defaultTemplate && defaultTemplate.tasks.length > 0) {
        await prisma.onboardingSession.create({
          data: {
            employeeId: user.id,
            organizationId,
            templateId: defaultTemplate.id,
            progress: 0,
            items: {
              create: defaultTemplate.tasks.map(task => ({
                taskId: task.id,
                organizationId,
                title: task.title,
                category: task.category,
                isRequired: task.isRequired,
                dueDate: new Date(Date.now() + task.dueAfterDays * 24 * 60 * 60 * 1000)
              }))
            }
          }
        });
      }
    } catch (onboardErr) {
      console.error('[Onboarding Trigger Error]:', onboardErr);
    }

    res.status(201).json(withDepartment(getSafeUser(safeUser, actorRole)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── GET ALL EMPLOYEES (Hardened for Managers) ───────────────────────────
export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const filters: any = { organizationId };
    const showArchived = req.query.archived === 'true';

    if (showArchived) {
      filters.isArchived = true;
    } else {
      filters.isArchived = false;
    }

    if (req.query.department) filters.departmentId = parseInt(req.query.department as string);
    if (req.query.role) filters.role = req.query.role as any;
    if (req.query.status) filters.status = req.query.status as any;

    const userRole = userReq.role;
    const userRank = getRoleRank(userRole);
    const userId = userReq.id;

    // 🛡️ DEV ISOLATION: Always exclude DEV role from staff lists
    filters.role = { not: 'DEV' };

    // 🛡️ DEPARTMENTAL ISOLATION: 
    // - MD (90), DIRECTOR (80), HR_MANAGER (85) can see all.
    // - MANAGER (70), SUPERVISOR (60), STAFF (50) only see their department.
    if (userRank < 80 && userRole !== 'DEV') {
      filters.departmentId = userReq.departmentId;
    }

    const users = await userService.getAllUsers(organizationId, { ...filters, take: 100 });
    res.json(users.map(u => withDepartment(getSafeUser(u, userRole))));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET SINGLE EMPLOYEE (Hardened) ──────────────────────────────────────
export const getEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const targetId = req.params.id;
    const user = await userService.getUserById(organizationId, targetId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const userRole = userReq.role;
    const userRank = getRoleRank(userRole);
    const actorId = userReq.id;

    // 🛡️ ACCESS CONTROL: 
    // - MD/HR/Director (>= 80) can view all.
    // - Manager/Staff (< 80) can only view their department or themselves.
    if (userRank < 80 && userRole !== 'DEV' && actorId !== targetId) {
      if (user.departmentId !== userReq.departmentId) {
        return res.status(403).json({ message: 'Access denied: You can only view employees in your department.' });
      }
    }

    res.json(withDepartment(getSafeUser(user, userRole)));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPDATE EMPLOYEE (Hardened) ──────────────────────────────────────────
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const actorRole = userReq.role;
    const actorRank = getRoleRank(actorRole);
    const actorId = userReq.id;
    const targetId = req.params.id;

    // Fetch target to check hierarchy
    const targetUser = await prisma.user.findUnique({ where: { id: targetId, organizationId } });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // 🛡️ ACCESS CONTROL: 
    // - MD/HR/Director (>= 80) can manage all.
    // - Manager (< 80 and >= 70) can manage their department reports.
    // - Staff (< 70) cannot manage others.
    if (actorRank < 80 && actorRole !== 'DEV' && actorId !== targetId) {
      if (targetUser.departmentId !== userReq.departmentId) {
        return res.status(403).json({ message: 'Access denied: You can only manage employees in your department.' });
      }
      // Staff cannot manage others at all
      if (actorRank < 70) {
        return res.status(403).json({ message: 'Access denied: Only managers can update employee records.' });
      }
      // Cannot edit someone with equal or higher rank
      if (getRoleRank(targetUser.role) >= actorRank) {
        return res.status(403).json({ message: 'Access denied: You cannot manage users with equal or higher rank.' });
      }
    }

    // Only HR/MD (>= 85) can change salary/currency
    if (actorRank < 85) {
      delete req.body.salary;
      delete req.body.currency;
    }
    // Only MD/DEV (>= 90) can assign roles higher than 80 (Director+)
    const targetRank = req.body.role ? getRoleRank(req.body.role) : undefined;
    if (actorRank < 90 && actorRole !== 'DEV') {
      if (targetRank && (targetRank >= 85 || getRoleRank(targetUser.role) >= 85)) {
          return res.status(403).json({ message: 'Access denied: Only the MD can manage administrative roles (HR/MD).' });
      }
    }

    // 🛡️ Validate SubUnit/Department pairing
    const newDeptId = req.body.departmentId ? Number(req.body.departmentId) : targetUser.departmentId;
    const newSubUnitId = req.body.subUnitId !== undefined ? req.body.subUnitId : targetUser.subUnitId;

    if (newSubUnitId && newDeptId) {
      const subUnit = await prisma.subUnit.findUnique({ where: { id: newSubUnitId } });
      if (subUnit && subUnit.departmentId !== newDeptId) {
        return res.status(400).json({ error: 'The selected sub-unit does not belong to the selected department.' });
      }
    }

    const user = await userService.updateUser(organizationId, targetId, req.body);
    const { passwordHash, ...safe } = user;
    await logAction(actorId, 'EMPLOYEE_UPDATED', 'User', targetId, { fields: Object.keys(req.body) }, req.ip);
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

    // Restrict HARD DELETE to MD/DEV only (Rank 90+)
    if (userReq.rank < 90 && userReq.role !== 'DEV') {
        return res.status(403).json({ message: 'Access denied: Only the MD or System Admin can perform destructive hard deletions.' });
    }

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
    const actorRole = userReq.role;
    const { userId, role, supervisorId } = req.body;

    const validRoles = ['DEV', 'MD', 'HR', 'DIRECTOR', 'MANAGER', 'MID_MANAGER', 'STAFF', 'CASUAL'];
    // 🛡️ Hierarchy Guard: Only MD/DEV (90+) can assign roles >= 85 (HR/MD)
    const targetRoleRank = getRoleRank(role);
    if (actorRank < 90 && actorRole !== 'DEV' && targetRoleRank >= 85) {
        return res.status(403).json({ error: 'Access denied: Only the MD can assign administrative roles (HR/MD).' });
    }

    // 🛡️ Hierarchy Guard: Only MD/DEV (90+) can assign roles >= 85 (HR/MD)
    const targetRoleRank = getRoleRank(role);
    if (actorRank < 90 && actorRole !== 'DEV' && targetRoleRank >= 85) {
        return res.status(403).json({ error: 'Access denied: Only the MD can assign administrative roles (HR/MD).' });
    }

    // 🛡️ Cannot promote someone to a rank higher than yourself
    if (actorRank < targetRoleRank && actorRole !== 'DEV') {
        return res.status(403).json({ error: 'Access denied: You cannot assign a role with a higher rank than your own.' });
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
      const path = (await import('path')).default;
      
      const base64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      const filename = `avatar-${targetId}-${Date.now()}.webp`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filepath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      await sharp(buf)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(filepath);
        
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
    where: { 
      organizationId, 
      role: { in: ['MD', 'DIRECTOR', 'MANAGER', 'MID_MANAGER', 'SUPERVISOR'] }, 
      status: 'ACTIVE',
      NOT: { role: 'DEV' } // Redundant but safe
    },
    select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' },
    take: 100
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
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';
    const profile = await riskService.getRiskProfile(organizationId, req.params.id);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Legacy alias
export const createEmployeeWithNotifications = createEmployee;
