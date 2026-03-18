"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAnnouncement = exports.getAnnouncements = exports.createAnnouncement = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("./enterprise.controller");
const createAnnouncement = async (req, res) => {
    try {
        const { title, content, targetAudience, departmentId, expirationDate, priority } = req.body;
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const announcement = await client_1.default.announcement.create({
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createAnnouncement = createAnnouncement;
const getAnnouncements = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const now = new Date();
        // Visibility logic:
        // 1. ALL
        // 2. DEPARTMENT (if user.departmentId matches)
        // 3. MANAGERS (if rank >= 60)
        // 4. EXECUTIVES (if rank >= 80)
        const rank = user.rank || 50;
        const announcements = await client_1.default.announcement.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAnnouncements = getAnnouncements;
const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        await client_1.default.announcement.deleteMany({
            where: {
                id,
                ...whereOrg
            }
        });
        res.json({ message: 'Announcement deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteAnnouncement = deleteAnnouncement;
