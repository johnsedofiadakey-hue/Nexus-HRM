import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma/client';
import { sendEmail } from '../services/email.service';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is not set.');
}
const JWT_SECRET = process.env.JWT_SECRET;

// ─── LOGIN ────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Use generic message to prevent user enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block terminated/inactive accounts before checking password
    if (user.status === 'TERMINATED') {
      return res.status(403).json({ error: 'This account has been deactivated. Contact HR.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.fullName, status: user.status },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, role: true,
        status: true, avatarUrl: true, jobTitle: true,
        departmentObj: { select: { name: true } }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Enforce: terminated users cannot use the API
    if (user.status === 'TERMINATED') {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── CHANGE PASSWORD (authenticated) ─────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Password too long' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Always return success to prevent user enumeration
    const GENERIC_OK = { success: true, message: 'If that email exists, a reset link has been sent.' };

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, fullName: true, email: true, status: true }
    });

    if (!user || user.status === 'TERMINATED') {
      return res.json(GENERIC_OK); // Don't reveal that user doesn't exist
    }

    // Invalidate existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Create cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: hashedToken, expiresAt }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2 style="color:#f1f5f9;margin:0 0 16px">Password Reset</h2>
        <p>Hi ${user.fullName}, you requested a password reset. Click the button below to set a new password.</p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${resetUrl}" style="background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">
            Reset My Password
          </a>
        </div>
        <p style="font-size:12px;color:#64748b">If you didn't request this, ignore this email. Your password will not change.</p>
      `
    });

    return res.json(GENERIC_OK);
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Password too long' });
    }

    // Hash the incoming raw token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: { select: { id: true, status: true } } }
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    if (resetRecord.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetRecord.id } });
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    if (resetRecord.usedAt) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    if (resetRecord.user.status === 'TERMINATED') {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() }
      })
    ]);

    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
