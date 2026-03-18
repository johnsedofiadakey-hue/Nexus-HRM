"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.logAction = void 0;
const client_1 = __importDefault(require("../prisma/client")); // FIX: Use shared client, not a separate PrismaClient()
const logAction = async (userId, action, entity, entityId, details, ipAddress) => {
    try {
        await client_1.default.auditLog.create({
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
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
    }
};
exports.logAction = logAction;
const getAuditLogs = async (page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        client_1.default.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { fullName: true, email: true } } },
            skip,
            take: limit,
        }),
        client_1.default.auditLog.count()
    ]);
    return {
        logs: logs.map(log => ({
            ...log,
            details: log.details ? (() => { try {
                return JSON.parse(log.details);
            }
            catch {
                return log.details;
            } })() : null
        })),
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};
exports.getAuditLogs = getAuditLogs;
