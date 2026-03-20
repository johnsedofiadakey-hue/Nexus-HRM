import { Router } from 'express';
import prisma from '../prisma/client';

const router = Router();

router.get('/env', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      databaseType: 'sqlite', // as per schema.prisma
      userCount,
      headers: req.headers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
