import { Request, Response } from 'express';
import * as maintenanceService from '../services/maintenance.service';

export const triggerBackup = async (req: Request, res: Response) => {
    try {
        const result = await maintenanceService.runBackup();
        res.json({ message: "Backup completed successfully", result });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Backup failed", error: error.message });
    }
};

// Export needed
export const checkHealth = async (req: Request, res: Response) => {
    try {
        const health = await maintenanceService.getSystemHealth();
        res.json(health);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
