import { Router } from 'express';
import prisma from '../prisma/client';
import { authenticate, getRoleRank } from '../middleware/auth.middleware';
import { ROLE_RANK_MAP } from '../types/roles';
import { errorLogger } from '../services/error-log.service';

const router = Router();

router.get('/env', authenticate, async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const settings = await prisma.systemSettings.findFirst();
    res.json({
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      version: '2.2.0',
      databaseType: 'postgresql',
      userCount,
      maintenance: settings,
      headers: req.headers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/firebase-check', authenticate, (req, res) => {
  const user = (req as any).user;
  if (getRoleRank(user.role) < 90) return res.status(403).json({ error: 'Insufficient rank' });

  const pk = process.env.FIREBASE_PRIVATE_KEY || '';
  res.json({
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    pkLength: pk.length,
    pkStart: pk.substring(0, 20), // Show start to check for "---BEGIN"
    pkIncludesNewlines: pk.includes('\n'),
    pkIncludesEscapedNewlines: pk.includes('\\n'),
    isInitialized: require('../config/firebase.config').getBucket() !== null
  });
});

router.get('/whoami', authenticate, (req, res) => {
  res.json({
    user: (req as any).user,
    authHeader: req.headers.authorization ? 'Present' : 'Missing',
    path: req.path
  });
});

router.get('/users', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (getRoleRank(user.role) < 90) return res.status(403).json({ error: 'Insufficient rank' });

    const users = await prisma.user.findMany({
      select: { id: true, role: true, organizationId: true, fullName: true }
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/inspect-user/:id', authenticate, async (req, res) => {
  try {
    const u = (req as any).user;
    if (getRoleRank(u.role) < 90) return res.status(403).json({ error: 'Insufficient rank' });

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true, status: true, fullName: true, organizationId: true, leaveBalance: true, leaveAllowance: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const rank = getRoleRank(user.role);
    res.json({
      ...user,
      rank,
      isOrgMissing: !user.organizationId && user.role !== 'DEV'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/errors', authenticate, (req, res) => {
  const user = (req as any).user;
  if (getRoleRank(user.role) < 90) return res.status(403).json({ error: 'Insufficient rank' });

  res.json(errorLogger.getErrors());
});

export default router;
