import { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';

export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await settingsService.getSettings();
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const settings = await settingsService.updateSettings(req.body);
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
