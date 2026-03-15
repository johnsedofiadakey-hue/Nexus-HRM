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
    }).catch(err => {
      console.error('[Auth Middleware] Database Error:', err.message);
      throw err; // Re-throw to be caught by the outer catch
    });

    if (!user) {
      console.warn(`[Auth Middleware] Account not found for ID: ${decoded.id}`);
      return res.status(401).json({ error: 'Account not found' });
    }

    if (user.status === 'TERMINATED') {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact HR.' });
    }

    if (user.role !== 'DEV' && !user.organizationId) {
      return res.status(403).json({ error: 'Account configuration error: missing organization affiliation.' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.fullName,
      organizationId: user.organizationId || null,
      rank: getRoleRank(user.role),
    };

    next();

  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // For other errors (like DB issues), return 500 instead of 401
    console.error('[Auth Middleware] Critical Error:', error.message);
    return res.status(500).json({ error: 'Internal Authentication Error' });
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
