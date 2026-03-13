import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start safely.');
}
const JWT_SECRET = process.env.JWT_SECRET;

import { RoleRank, ROLE_RANK_MAP } from '../types/roles';

const normalizeRole = (role?: string): string => {
  if (!role) return '';
  return String(role).toUpperCase();
};

export const getRoleRank = (role?: string): number => {
  const normalized = normalizeRole(role);
  if (!normalized) return 0;
  return ROLE_RANK_MAP[normalized] ?? 0;
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role?: string; name?: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, status: true, fullName: true, organizationId: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Account not found' });
    }

    if (user.status === 'TERMINATED') {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact HR.' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.fullName,
      organizationId: user.role === 'DEV' ? user.organizationId : (user.organizationId || "default-tenant"),
      rank: getRoleRank(user.role),
    };

    next();
  } catch (error) {
    if ((error as { name?: string }).name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    const normalized = normalizeRole(userRole);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

    if (normalized === 'DEV' || normalizedAllowed.includes(normalized)) {
      return next();
    }
    return res.status(403).json({ error: 'Access denied: insufficient permissions' });
  };
};

// New middleware required by directive: requireRole(rank)
export const requireRole = (rank: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRank = getRoleRank(req.user?.role);
    if (userRank >= rank) {
      return next();
    }
    return res.status(403).json({ error: `Access denied: requires role rank ${rank}+` });
  };
};

export const authorizeMinimumRole = (minimumRole: string) => {
  const requiredRank = getRoleRank(minimumRole);
  return requireRole(requiredRank || 999);
};
