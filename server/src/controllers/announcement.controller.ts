import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';

export const createAnnouncement = async (req: Request, res: Response) => {
    try {
        const { title, content, targetAudience, departmentId, expirationDate, priority } = req.body;
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';

        const announcement = await prisma.announcement.create({
            data: {
                organizationId,
                title,
                content,
                targetAudience,
                departmentId: departmentId ? parseInt(departmentId) : null,
                expirationDate: expirationDate ? new Date(expirationDate) : null,
                priority: priority || 'NORMAL',
                createdById: user.id,
            },
        });

        res.status(201).json(announcement);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAnnouncements = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const now = new Date();

        // Visibility logic:
        // 1. ALL
        // 2. DEPARTMENT (if user.departmentId matches)
        // 3. MANAGERS (if rank >= 60)
        // 4. EXECUTIVES (if rank >= 80)

        const rank = user.rank || 50;

        const announcements = await prisma.announcement.findMany({
            where: {
                ...whereOrg,
                AND: [
                    {
                        OR: [
                            { targetAudience: 'ALL' },
                            {
                                AND: [
                                    { targetAudience: 'DEPARTMENT' },
                                    { departmentId: user.departmentId }
                                ]
                            },
                            {
                                AND: [
                                    { targetAudience: 'MANAGERS' },
                                    { targetAudience: rank >= 60 ? 'MANAGERS' : 'NONE' }
                                ]
                            },
                            {
                                AND: [
                                    { targetAudience: 'EXECUTIVES' },
                                    { targetAudience: rank >= 80 ? 'EXECUTIVES' : 'NONE' }
                                ]
                            }
                        ]
                    },
                    {
                        OR: [
                            { expirationDate: null },
                            { expirationDate: { gt: now } }
                        ]
                    }
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { fullName: true, role: true } } }
        });

        res.json(announcements);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};

        await prisma.announcement.deleteMany({
            where: {
                id,
                ...whereOrg
            }
        });
        res.json({ message: 'Announcement deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
