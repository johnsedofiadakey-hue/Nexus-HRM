import { Request, Response } from 'express';
import prisma from '../prisma/client';
import * as maintenanceService from '../services/maintenance.service';

// 1. Dev Login (Just validates key)
export const devLogin = async (req: Request, res: Response) => {
    // The middleware already validated the key if we reached here.
    res.json({ success: true, message: "Dev Access Granted" });
};

// 2. Get System Stats (Backups, Health, Settings)
export const getDevStats = async (req: Request, res: Response) => {
    try {
        const health = await maintenanceService.getSystemHealth();
        const settings = await prisma.systemSettings.findFirst();

        // Count users (Database might be locked, but Dev bypasses - for now getting basic info)
        const userCount = await prisma.user.count();

        res.json({
            health,
            settings,
            userCount
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Toggle Kill Switch (Maintenance Mode)
export const toggleKillSwitch = async (req: Request, res: Response) => {
    try {
        const { active } = req.body; // true/false

        // Update first settings found
        const settings = await prisma.systemSettings.findFirst();
        if (settings) {
            await prisma.systemSettings.update({
                where: { id: settings.id },
                data: { isMaintenanceMode: active }
            });
            res.json({ success: true, isMaintenanceMode: active });
        } else {
            res.status(404).json({ message: "System settings not initialized" });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Update Paystack Keys / Env Config (Simulation)
// In a real app writing to .env is risky/hard at runtime. 
// We will store "live" keys in DB SystemSettings but "DEV" keys might be env.
// For now, let's allow updating the SystemSettings payment fields.
export const updateSystemConfig = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.systemSettings.findFirst();
        if (settings) {
            await prisma.systemSettings.update({
                where: { id: settings.id },
                data: req.body
            });
            res.json({ success: true });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Department management
export const getDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            include: { manager: true, employees: true },
        });
        res.json(departments);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
};

export const createDepartment = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const department = await prisma.department.create({ data: { name } });
        res.json(department);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create department' });
    }
};
