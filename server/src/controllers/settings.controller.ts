import { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';
import { getRoleRank } from '../middleware/auth.middleware';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    // Public endpoint — user may not be authenticated (login page branding)
    const orgId = user?.organizationId || 'default-tenant';
    const isAdmin = user ? getRoleRank(user.role) >= 85 : false; 
    const settings = await settingsService.getSettings(orgId, isAdmin);
    res.json(settings || {});
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (getRoleRank(user.role) < 90) {
      return res.status(403).json({ error: 'Only MD can update admin settings' });
    }
    const orgId = user?.organizationId || 'default-tenant';
    const settings = await settingsService.updateSettings(orgId, req.body);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
