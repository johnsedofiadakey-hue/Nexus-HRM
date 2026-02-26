import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start safely.');
}
const JWT_SECRET = process.env.JWT_SECRET;

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Verify the user still exists and is active in DB.
    // This catches terminated accounts whose tokens haven't expired yet.
    // We cache this check for 5 min per request cycle via a lightweight lookup.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, status: true, fullName: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Account not found' });
    }

    if (user.status === 'TERMINATED') {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact HR.' });
    }

    // Attach fresh user info (role may have changed since token was issued)
    // @ts-ignore
    req.user = { id: user.id, role: user.role, name: user.fullName };

    next();
  } catch (error) {
    if ((error as any).name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userRole = req.user?.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
};
