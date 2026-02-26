import prisma from '../prisma/client'; // FIX: Use shared client, not a separate PrismaClient()

export const logAction = async (
    userId: string | null | undefined,
    action: string,
    entity: string,
    entityId: string,
    details?: any,
    ipAddress?: string
) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                action,
                entity,
                entityId,
                // FIX: Serialize details as JSON string so it's human-readable in DB
                details: details ? JSON.stringify(details) : null,
                ipAddress: ipAddress
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};

export const getAuditLogs = async (page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { fullName: true, email: true } } },
            skip,
            take: limit,
        }),
        prisma.auditLog.count()
    ]);

    return {
        logs: logs.map(log => ({
            ...log,
            details: log.details ? (() => { try { return JSON.parse(log.details as string); } catch { return log.details; } })() : null
        })),
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};
