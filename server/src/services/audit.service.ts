import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const logAction = async (
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    details?: any,
    ipAddress?: string
) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                details: details ? details : undefined,
                ipAddress
            }
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // Don't throw, we don't want to break the main transaction just because logging failed (unless strict compliance required)
    }
};

export const getAuditLogs = async () => {
    return prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, email: true } } },
        take: 100 // Limit for performance
    });
};
