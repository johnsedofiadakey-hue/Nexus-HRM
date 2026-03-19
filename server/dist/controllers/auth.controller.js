"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.impersonateTenant = exports.signup = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.getMe = exports.revokeRefreshToken = exports.refreshAccessToken = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../prisma/client"));
const email_service_1 = require("../services/email.service");
const roles_1 = require("../types/roles");
const getRoleRank = (role) => {
    if (!role)
        return 0;
    return roles_1.ROLE_RANK_MAP[role.toUpperCase()] ?? 0;
};
if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET is not set.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 7;
const signAccessToken = (payload) => jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
const hashToken = (value) => crypto_1.default.createHash('sha256').update(value).digest('hex');
const getClientMeta = (req) => ({
    ipAddress: req.ip || req.socket.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
});
const safeLogSecurityEvent = async (params) => {
    try {
        const { email, success, organizationId, reason, req } = params;
        const meta = getClientMeta(req);
        await client_1.default.loginSecurityEvent.create({
            data: {
                organizationId: organizationId || 'default-tenant',
                email: email.toLowerCase().trim(),
                success,
                reason,
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
            },
        });
    }
    catch {
        // Intentionally non-blocking
    }
};
const issueRefreshToken = async (userId, organizationId, req) => {
    const raw = crypto_1.default.randomBytes(48).toString('hex');
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
    const meta = getClientMeta(req);
    await client_1.default.refreshToken.create({
        data: {
            userId,
            organizationId: organizationId || 'default-tenant',
            tokenHash,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            expiresAt,
        },
    });
    return raw;
};
// ─── LOGIN ────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await client_1.default.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, fullName: true, role: true, status: true,
                passwordHash: true, avatarUrl: true, organizationId: true, jobTitle: true,
                departmentId: true }
        });
        if (!user) {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: 'default-tenant', reason: 'USER_NOT_FOUND', req });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.status === 'TERMINATED') {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: user.organizationId || 'default-tenant', reason: 'ACCOUNT_TERMINATED', req });
            return res.status(403).json({ error: 'This account has been deactivated. Contact HR.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        const orgId = user.organizationId || 'default-tenant';
        if (!isMatch) {
            await safeLogSecurityEvent({ email: normalizedEmail, success: false, organizationId: orgId, reason: 'BAD_PASSWORD', req });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = signAccessToken({
            id: user.id,
            role: user.role,
            name: user.fullName,
            status: user.status || 'ACTIVE',
            organizationId: orgId
        });
        const refreshToken = await issueRefreshToken(user.id, orgId, req);
        await safeLogSecurityEvent({ email: normalizedEmail, success: true, organizationId: orgId, reason: 'LOGIN_OK', req });
        return res.status(200).json({
            token,
            refreshToken,
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                jobTitle: user.jobTitle,
                rank: getRoleRank(user.role),
                organizationId: orgId,
                avatar: user.avatarUrl,
                departmentId: user.departmentId,
            },
            tokenMeta: {
                accessExpiresIn: ACCESS_TOKEN_TTL,
                refreshExpiresInDays: REFRESH_TOKEN_DAYS,
            },
        });
    }
    catch (error) {
        console.error('[Auth] Login error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.login = login;
// ─── REFRESH ACCESS TOKEN ────────────────────────────────────────────────
const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'refreshToken is required' });
        }
        const tokenHash = hashToken(refreshToken);
        const found = await client_1.default.refreshToken.findUnique({ where: { tokenHash } });
        if (!found || found.revokedAt || found.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
        const user = await client_1.default.user.findUnique({
            where: { id: found.userId },
            select: { id: true, fullName: true, role: true, status: true, email: true, avatarUrl: true, organizationId: true, jobTitle: true },
        });
        if (!user || user.status === 'TERMINATED') {
            return res.status(403).json({ error: 'Account unavailable' });
        }
        const orgId = user.organizationId || 'default-tenant';
        // Rotate refresh token for security
        await client_1.default.refreshToken.update({ where: { id: found.id }, data: { revokedAt: new Date() } });
        const nextRefreshToken = await issueRefreshToken(user.id, orgId, req);
        const token = signAccessToken({
            id: user.id,
            role: user.role,
            name: user.fullName,
            status: user.status || 'ACTIVE',
            organizationId: orgId
        });
        return res.json({
            token,
            refreshToken: nextRefreshToken,
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                jobTitle: user.jobTitle,
                rank: getRoleRank(user.role),
                organizationId: orgId,
                avatar: user.avatarUrl,
            },
            tokenMeta: {
                accessExpiresIn: ACCESS_TOKEN_TTL,
                refreshExpiresInDays: REFRESH_TOKEN_DAYS,
            },
        });
    }
    catch (error) {
        console.error('[Auth] Refresh error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.refreshAccessToken = refreshAccessToken;
// ─── LOGOUT / REVOKE REFRESH TOKEN ───────────────────────────────────────
const revokeRefreshToken = async (req, res) => {
    try {
        const { refreshToken, revokeAll } = req.body;
        if (revokeAll) {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            await client_1.default.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
            return res.json({ success: true });
        }
        if (!refreshToken)
            return res.status(400).json({ error: 'refreshToken is required' });
        const tokenHash = hashToken(refreshToken);
        await client_1.default.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('[Auth] Revoke refresh token error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.revokeRefreshToken = revokeRefreshToken;
// ─── GET CURRENT USER ─────────────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true, fullName: true, email: true, role: true,
                status: true, avatarUrl: true, jobTitle: true,
                organizationId: true,
                departmentObj: { select: { name: true } },
            },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        if (user.status === 'TERMINATED')
            return res.status(403).json({ error: 'Account deactivated' });
        return res.json(user);
    }
    catch {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getMe = getMe;
// ─── CHANGE PASSWORD (authenticated) ─────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }
        if (newPassword.length < 8)
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        if (newPassword.length > 128)
            return res.status(400).json({ error: 'Password too long' });
        const user = await client_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isMatch)
            return res.status(401).json({ error: 'Current password is incorrect' });
        const newHash = await bcryptjs_1.default.hash(newPassword, 12);
        await client_1.default.$transaction([
            client_1.default.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
            client_1.default.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
        return res.json({ success: true, message: 'Password updated successfully. Please login again.' });
    }
    catch {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.changePassword = changePassword;
// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ error: 'Email is required' });
        const GENERIC_OK = { success: true, message: 'If that email exists, a reset link has been sent.' };
        const user = await client_1.default.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, fullName: true, email: true, status: true },
        });
        if (!user || user.status === 'TERMINATED') {
            return res.json(GENERIC_OK);
        }
        await client_1.default.passwordResetToken.deleteMany({ where: { userId: user.id } });
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const hashedToken = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await client_1.default.passwordResetToken.create({ data: { userId: user.id, token: hashedToken, expiresAt } });
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
        await (0, email_service_1.sendEmail)({
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
      `,
        });
        return res.json(GENERIC_OK);
    }
    catch (error) {
        console.error('[Auth] Forgot password error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.forgotPassword = forgotPassword;
// ─── RESET PASSWORD ───────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        if (newPassword.length < 8)
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        if (newPassword.length > 128)
            return res.status(400).json({ error: 'Password too long' });
        const hashedToken = hashToken(token);
        const resetRecord = await client_1.default.passwordResetToken.findUnique({
            where: { token: hashedToken },
            include: { user: { select: { id: true, status: true } } },
        });
        if (!resetRecord)
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        if (resetRecord.expiresAt < new Date()) {
            await client_1.default.passwordResetToken.delete({ where: { id: resetRecord.id } });
            return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
        }
        if (resetRecord.usedAt)
            return res.status(400).json({ error: 'This reset link has already been used' });
        if (resetRecord.user.status === 'TERMINATED')
            return res.status(403).json({ error: 'Account is deactivated' });
        const newHash = await bcryptjs_1.default.hash(newPassword, 12);
        await client_1.default.$transaction([
            client_1.default.user.update({ where: { id: resetRecord.userId }, data: { passwordHash: newHash } }),
            client_1.default.passwordResetToken.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } }),
            client_1.default.refreshToken.updateMany({ where: { userId: resetRecord.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        ]);
        return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    }
    catch (error) {
        console.error('[Auth] Reset password error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.resetPassword = resetPassword;
// ─── TENANT SIGNUP ────────────────────────────────────────────────────────
const signup = async (req, res) => {
    try {
        const { fullName, email, password, companyName, phone, city, country } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await client_1.default.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // Atomic transaction: Create Org + Create MD User
        const result = await client_1.default.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: companyName,
                    email: normalizedEmail,
                    phone,
                    city,
                    country,
                    billingStatus: 'FREE',
                    subscriptionPlan: 'FREE',
                    trialStartDate: new Date(),
                    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    settings: {
                        create: {
                            trialDays: 14
                        }
                    }
                }
            });
            const user = await tx.user.create({
                data: {
                    organizationId: org.id,
                    fullName,
                    email: normalizedEmail,
                    passwordHash,
                    role: 'MD',
                    jobTitle: 'Managing Director',
                    status: 'ACTIVE'
                }
            });
            return { org, user };
        });
        const token = signAccessToken({
            id: result.user.id,
            role: result.user.role,
            name: result.user.fullName,
            status: result.user.status,
            organizationId: result.org.id
        });
        const refreshToken = await issueRefreshToken(result.user.id, result.org.id, req);
        return res.status(201).json({
            message: 'Registration successful',
            token,
            refreshToken,
            user: {
                id: result.user.id,
                name: result.user.fullName,
                email: result.user.email,
                role: result.user.role,
                organizationId: result.org.id
            }
        });
    }
    catch (error) {
        console.error('[Auth] Signup error:', error);
        return res.status(500).json({ error: 'Tenant registration failed. Please try again.' });
    }
};
exports.signup = signup;
const impersonateTenant = async (req, res) => {
    try {
        const adminUser = req.user;
        if (adminUser.role !== 'DEV')
            return res.status(403).json({ error: 'Unauthorized override' });
        const { organizationId } = req.body;
        if (!organizationId)
            return res.status(400).json({ error: 'Target tenant ID required' });
        // Verify tenant exists
        const organization = await client_1.default.organization.findUnique({ where: { id: organizationId } });
        if (!organization)
            return res.status(404).json({ error: 'Tenant not found' });
        // Generate a temporary impersonation token
        const token = jsonwebtoken_1.default.sign({
            id: `impersonated-${adminUser.id}`,
            email: adminUser.email,
            role: 'MD', // Default to MD for the tenant
            organizationId: organizationId,
            isImpersonating: true,
            realAdminId: adminUser.id
        }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { name: `Impersonating: ${organization.name}`, role: 'MD', organizationId, isImpersonating: true } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.impersonateTenant = impersonateTenant;
