import { Request, Response } from 'express';
import * as maintenanceService from '../services/maintenance.service';
import prisma from '../prisma/client';

export const triggerBackup = async (req: Request, res: Response) => {
    try {
        const result = await maintenanceService.runBackup();
        res.json({ message: "Backup completed successfully", result });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Backup failed", error: error.message });
    }
};

export const checkHealth = async (req: Request, res: Response) => {
    try {
        const health = await maintenanceService.getSystemHealth();
        res.json(health);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBackups = async (req: Request, res: Response) => {
    try {
        const backups = maintenanceService.listBackups();
        res.json(backups);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDataIntegrity = async (req: Request, res: Response) => {
    try {
        const organizationId = req.user?.organizationId ?? 'default-tenant';
        const where = { organizationId };

        const [
            organization,
            users,
            archivedUsers,
            departments,
            subUnits,
            leaves,
            payrollRuns,
            appraisalPackets,
            auditLogs,
            latestBackup,
        ] = await Promise.all([
            prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } }),
            prisma.user.count({ where }),
            prisma.user.count({ where: { ...where, isArchived: true } }),
            prisma.department.count({ where }),
            prisma.subUnit.count({ where }),
            prisma.leaveRequest.count({ where }),
            prisma.payrollRun.count({ where }),
            prisma.appraisalPacket.count({ where }),
            prisma.auditLog.count({ where }),
            prisma.backupLog.findFirst({
                where,
                orderBy: { createdAt: 'desc' },
                select: { filename: true, sizeBytes: true, status: true, errorMessage: true, createdAt: true },
            }),
        ]);

        return res.json({
            timestamp: new Date().toISOString(),
            organization: organization || { id: organizationId, name: null },
            counts: {
                users,
                activeDirectoryUsers: users - archivedUsers,
                archivedUsers,
                departments,
                subUnits,
                leaveRequests: leaves,
                payrollRuns,
                appraisalPackets,
                auditLogs,
            },
            latestBackup,
        });
    } catch (error: any) {
        return res.status(500).json({ message: 'Unable to read data-integrity snapshot', error: error.message });
    }
};

export const downloadBackup = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const fs = await import('fs');
        const path = await import('path');
        const BACKUP_DIR = path.join(process.cwd(), 'storage', 'backups');
        const safeFilename = path.basename(filename);
        if (safeFilename !== filename || !safeFilename.startsWith('backup-core-') || !safeFilename.endsWith('.dump')) {
            return res.status(400).json({ message: 'Invalid backup filename' });
        }
        const filepath = path.join(BACKUP_DIR, safeFilename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: "Backup file not found" });
        }

        res.download(filepath);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
