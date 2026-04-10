"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reassignSupervisor = exports.getHierarchy = void 0;
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = __importDefault(require("../prisma/client"));
const getHierarchy = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const users = await client_1.default.user.findMany({
            where: {
                organizationId,
                isArchived: false,
                role: { not: 'DEV' }
            },
            select: {
                id: true,
                fullName: true,
                jobTitle: true,
                role: true,
                avatarUrl: true,
                departmentObj: { select: { name: true } },
                supervisorId: true,
            }
        });
        // Helper to build tree with sorting
        const buildTree = (parentId = null, processedIds = new Set()) => {
            return users
                .filter(u => u.supervisorId === parentId && !processedIds.has(u.id))
                .sort((a, b) => (0, auth_middleware_1.getRoleRank)(b.role) - (0, auth_middleware_1.getRoleRank)(a.role))
                .map(u => {
                processedIds.add(u.id);
                return {
                    id: u.id,
                    name: u.fullName,
                    title: u.jobTitle,
                    role: u.role,
                    avatar: u.avatarUrl,
                    department: u.departmentObj?.name,
                    children: buildTree(u.id, processedIds)
                };
            });
        };
        const processedIds = new Set();
        // 1. Start with explicit roots (no supervisor)
        let roots = buildTree(null, processedIds);
        // 2. Identify "island" nodes that have a supervisorId that doesn't exist 
        // or formed a cycle/disconnected graph.
        // We add any remaining unprocessed users as secondary roots if they have no valid parent in the current set.
        const remaining = users.filter(u => !processedIds.has(u.id));
        if (remaining.length > 0) {
            // Sort remaining by rank and add them
            remaining.sort((a, b) => (0, auth_middleware_1.getRoleRank)(b.role) - (0, auth_middleware_1.getRoleRank)(a.role));
            for (const u of remaining) {
                if (!processedIds.has(u.id)) {
                    roots.push({
                        id: u.id,
                        name: u.fullName,
                        title: u.jobTitle,
                        role: u.role,
                        avatar: u.avatarUrl,
                        department: u.departmentObj?.name,
                        children: buildTree(u.id, processedIds)
                    });
                }
            }
        }
        // 3. Final Sort of top-level roots by rank (MD first)
        roots.sort((a, b) => (0, auth_middleware_1.getRoleRank)(b.role) - (0, auth_middleware_1.getRoleRank)(a.role));
        res.json(roots);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getHierarchy = getHierarchy;
const reassignSupervisor = async (req, res) => {
    try {
        const { employeeId, supervisorId } = req.body;
        const user = await client_1.default.user.update({
            where: { id: employeeId },
            data: { supervisorId }
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.reassignSupervisor = reassignSupervisor;
