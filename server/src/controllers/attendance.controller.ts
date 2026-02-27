import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const clockIn = async (req: Request, res: Response) => {
    try {
        const employeeId = (req as any).user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingLog = await prisma.attendanceLog.findUnique({
            where: { employeeId_date: { employeeId, date: today } }
        });

        if (existingLog) return res.status(400).json({ error: 'Already clocked in for today.' });

        const log = await prisma.attendanceLog.create({
            data: {
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
        const employeeId = (req as any).user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const log = await prisma.attendanceLog.findUnique({
            where: { employeeId_date: { employeeId, date: today } }
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
        const employeeId = (req as any).user.id;
        const logs = await prisma.attendanceLog.findMany({
            where: { employeeId },
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
        const logs = await prisma.attendanceLog.findMany({
            include: { employee: { select: { fullName: true, departmentObj: true } } },
            orderBy: { date: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
