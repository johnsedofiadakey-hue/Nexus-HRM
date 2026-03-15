import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';

export const clockIn = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const user = (req as any).user;
        const employeeId = user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingLog = await prisma.attendanceLog.findFirst({
            where: {
                employeeId,
                date: today,
                organizationId
            }
        });

        if (existingLog) return res.status(400).json({ error: 'Already clocked in for today.' });

        const log = await prisma.attendanceLog.create({
            data: {
                organizationId,
                employeeId,
                date: today,
                clockIn: new Date(),
                status: 'PRESENT'
            }
        });
        res.status(201).json(log);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const clockOut = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const user = (req as any).user;
        const employeeId = user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const log = await prisma.attendanceLog.findFirst({
            where: {
                employeeId,
                date: today,
                organizationId
            }
        });

        if (!log) return res.status(404).json({ error: 'No active clock-in found for today.' });
        if (log.clockOut) return res.status(400).json({ error: 'Already clocked out today.' });

        const updatedLog = await prisma.attendanceLog.update({
            where: { id: log.id },
            data: { clockOut: new Date() }
        });
        res.json(updatedLog);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getMyAttendance = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const user = (req as any).user;
        const employeeId = user.id;
        const logs = await prisma.attendanceLog.findMany({
            where: {
                employeeId,
                ...whereOrg
            },
            orderBy: { date: 'desc' },
            take: 30
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllAttendance = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const logs = await prisma.attendanceLog.findMany({
            where: whereOrg,
            include: { employee: { select: { fullName: true, departmentObj: true } } },
            orderBy: { date: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
