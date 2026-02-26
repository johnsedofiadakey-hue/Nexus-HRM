import { Request, Response } from 'express';
import prisma from '../prisma/client';
import * as userService from '../services/user.service';
import { sendWelcomeEmail } from '../services/email.service';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

/**
 * IT Admin specific controller.
 * IT Admins can:
 *   - Create and manage user accounts (not salary/payroll)
 *   - Manage asset inventory and assignment
 *   - Reset employee passwords (force reset flag)
 *   - View system users (no salary data)
 *   - Manage onboarding IT tasks
 */

// Create employee account (IT Admin version — no salary fields exposed)
export const itCreateEmployee = async (req: Request, res: Response) => {
  try {
    // Strip salary/compensation fields — IT Admin should not set these
    const { salary, currency, ...safeData } = req.body;

    const tempPassword = safeData.password || 'Nexus123!';
    const user = await userService.createUser({ ...safeData, password: tempPassword });
    const { passwordHash, ...safeUser } = user;

    // Send welcome email asynchronously
    const settings = await prisma.systemSettings.findFirst();
    sendWelcomeEmail(user.email, user.fullName, tempPassword, settings?.companyName || 'Nexus HRM').catch(console.error);

    // Audit log
    // @ts-ignore
    await logAction(req.user?.id, 'IT_ADMIN_CREATE_ACCOUNT', 'User', user.id, { email: user.email, role: user.role }, req.ip);

    // Notify HR admins
    const hrAdmins = await prisma.user.findMany({ where: { role: { in: ['HR_ADMIN', 'MD'] } }, select: { id: true } });
    for (const admin of hrAdmins) {
      await notify(admin.id, 'New Account Created', `IT Admin created account for ${user.fullName} (${user.email})`, 'INFO', '/employees');
    }

    res.status(201).json({ ...safeUser, message: `Account created. Welcome email sent to ${user.email}.` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Force password reset — sends a new temp password to the user's email
export const itResetPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    // @ts-ignore
    const actorId = req.user?.id;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const bcrypt = await import('bcryptjs');
    const tempPassword = `Nexus${Math.random().toString(36).slice(-6).toUpperCase()}!`;
    const passwordHash = await bcrypt.default.hash(tempPassword, 12);

    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    const settings = await prisma.systemSettings.findFirst();
    sendWelcomeEmail(user.email, user.fullName, tempPassword, settings?.companyName || 'Nexus HRM').catch(console.error);

    await notify(user.id, 'Password Reset', 'Your password has been reset by IT. Check your email for the temporary password.', 'WARNING');
    await logAction(actorId, 'IT_PASSWORD_RESET', 'User', userId, { email: user.email }, req.ip);

    res.json({ success: true, message: `Temporary password sent to ${user.email}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get system overview for IT dashboard
export const itSystemOverview = async (_req: Request, res: Response) => {
  try {
    const [totalUsers, activeUsers, assets, availableAssets, assignedAssets] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'AVAILABLE' } }),
      prisma.asset.count({ where: { status: 'ASSIGNED' } }),
    ]);

    const recentAccounts = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, fullName: true, email: true, role: true, status: true, createdAt: true, jobTitle: true }
    });

    res.json({ totalUsers, activeUsers, assets, availableAssets, assignedAssets, recentAccounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users (no salary data) for IT management
export const itGetUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { fullName: 'asc' },
    select: {
      id: true, fullName: true, email: true, role: true, status: true,
      jobTitle: true, employeeCode: true, departmentObj: { select: { name: true } },
      createdAt: true, avatarUrl: true, contactNumber: true
      // NOTE: salary, passwordHash deliberately excluded
    }
  });
  res.json(users);
};

// Deactivate account (IT can disable, not delete)
export const itDeactivateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    // @ts-ignore
    const actorId = req.user?.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: 'TERMINATED' }
    });

    await logAction(actorId, 'IT_ACCOUNT_DEACTIVATED', 'User', userId, { email: user.email }, req.ip);
    await notify(userId, 'Account Deactivated', 'Your account has been deactivated. Contact HR for more information.', 'WARNING');

    res.json({ success: true, message: `Account for ${user.fullName} has been deactivated` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
