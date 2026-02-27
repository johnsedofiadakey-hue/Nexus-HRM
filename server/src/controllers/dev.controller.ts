import { Request, Response } from 'express';
import prisma from '../prisma/client';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

// Get or Create Singleton System Settings
export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { companyName: 'Nexus HRM' }
      });
    }
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update System Settings
export const updateSystemSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    let settings = await prisma.systemSettings.findFirst();

    if (settings) {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data
      });
    } else {
      settings = await prisma.systemSettings.create({ data });
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error updating system settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Get Server & DB Health Stats
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    // 1. Basic Server Stats (OS)
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

    const cpuLoadResult = os.loadavg();

    const serverUptime = os.uptime(); // in seconds

    // 2. DB Stats (Prisma)
    const usersCount = await prisma.user.count();
    const departmentsCount = await prisma.department.count();

    // Attempt raw query to verify Neon DB latency/health
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - start;

    return res.status(200).json({
      status: 'healthy',
      database: {
        latencyMs: dbLatency,
        totalUsers: usersCount,
        totalDepartments: departmentsCount
      },
      server: {
        uptimeSeconds: serverUptime,
        memoryUsagePercent: memUsagePercent,
        cpuLoadAvg: cpuLoadResult,
        platform: os.platform(),
        arch: os.arch()
      }
    });

  } catch (error) {
    console.error('Error generating system health report:', error);
    return res.status(500).json({ error: 'Failed to generate health report' });
  }
};

// Trigger Manual DB Backup (Logical Dump if pg_dump available, otherwise Prisma raw export)
export const triggerBackup = async (req: Request, res: Response) => {
  try {
    // For cloud environments without pg_dump locally, we simulate a backup by writing JSON dumps
    // Ideally, pg_dump is used. For this prototype, we'll extract core tables to JSON.
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    // Fetch critical data
    const users = await prisma.user.findMany();
    const departments = await prisma.department.findMany();
    const settings = await prisma.systemSettings.findFirst();

    const backupData = {
      timestamp,
      data: {
        users, departments, settings
      }
    };

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    // Log the backup
    const log = await prisma.backupLog.create({
      data: {
        filename,
        sizeBytes: stats.size,
        status: 'SUCCESS'
      }
    });

    return res.status(200).json({ message: 'Backup completed successfully', log });
  } catch (error: any) {
    console.error('Backup failed:', error);
    await prisma.backupLog.create({
      data: {
        filename: 'Failed Backup',
        sizeBytes: 0,
        status: 'FAILED',
        errorMessage: error.message
      }
    });
    return res.status(500).json({ error: 'Database backup failed' });
  }
};

export const getBackupLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch backup logs' });
  }
};
