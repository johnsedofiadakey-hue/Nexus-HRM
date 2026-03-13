import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getMyNotifications = async (req: Request, res: Response) => {
  try {  // @ts-ignore
  const userId = req.user?.id;
  const unreadOnly = req.query.unread === 'true';
  const notifications = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json(notifications);
  } catch (err: any) {
    console.error('[notification.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {  // @ts-ignore
  const userId = req.user?.id;
  const { ids } = req.body; // array of IDs, or empty = mark all
  await prisma.notification.updateMany({
    where: { userId, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { isRead: true }
  });
  res.json({ success: true });
  } catch (err: any) {
    console.error('[notification.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {  // @ts-ignore
  const userId = req.user?.id;
  const count = await prisma.notification.count({ where: { userId, isRead: false } });
  res.json({ count });
  } catch (err: any) {
    console.error('[notification.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
