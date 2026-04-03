"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmployeeWithNotifications = exports.getUserRiskProfile = exports.promoteEmployee = exports.transferEmployee = exports.restoreEmployee = exports.archiveEmployee = exports.getSupervisors = exports.uploadImage = exports.assignRole = exports.hardDeleteEmployee = exports.deleteEmployee = exports.updateEmployee = exports.getEmployee = exports.getAllEmployees = exports.createEmployee = exports.getMyTeam = void 0;
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = __importDefault(require("../prisma/client"));
const userService = __importStar(require("../services/user.service"));
const riskService = __importStar(require("../services/risk.service"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
const email_service_1 = require("../services/email.service");
const encryption_1 = require("../utils/encryption");
// ─── Field filter by role ─────────────────────────────────────────────────
const getSafeUser = (user, requestorRole) => {
    const { passwordHash, ...safe } = user;
    const userRank = (0, auth_middleware_1.getRoleRank)(requestorRole);
    // Decrypt sensitive fields if authorized (HR/MD (>= 85))
    // 🛡️ REFINEMENT: Always try to decrypt if the Enc field exists, to ensure fresh plain text for the frontend.
    if (userRank >= 85) {
        if (safe.bankAccountEnc) {
            const dec = (0, encryption_1.decryptValue)(safe.bankAccountEnc);
            if (dec)
                safe.bankAccountNumber = dec;
        }
        if (safe.ghanaCardEnc) {
            const dec = (0, encryption_1.decryptValue)(safe.ghanaCardEnc);
            if (dec)
                safe.nationalId = dec;
        }
        if (safe.ssnitEnc) {
            const dec = (0, encryption_1.decryptValue)(safe.ssnitEnc);
            if (dec)
                safe.ssnitNumber = dec;
        }
        if (safe.salaryEnc) {
            const dec = (0, encryption_1.decryptValue)(safe.salaryEnc);
            if (dec)
                safe.salary = parseFloat(dec);
        }
    }
    // Parse certifications if stringified JSON
    if (typeof safe.certifications === 'string' && safe.certifications.startsWith('[')) {
        try {
            safe.certifications = JSON.parse(safe.certifications);
        }
        catch (e) {
            safe.certifications = [];
        }
    }
    if (userRank < 85) {
        delete safe.salary;
        delete safe.currency;
        delete safe.bankAccountEnc;
        delete safe.ghanaCardEnc;
        delete safe.ssnitEnc;
        delete safe.salaryEnc;
    }
    return safe;
};
const withDepartment = (u) => {
    const { departmentObj, ...rest } = u || {};
    return { ...rest, department: departmentObj?.name };
};
// ─── GET MY TEAM ──────────────────────────────────────────────────────────
const getMyTeam = async (req, res) => {
    try {
        const userReq = req.user;
        const isDev = userReq.role === 'DEV';
        const organizationId = isDev ? undefined : (userReq.organizationId || 'default-tenant');
        const whereOrg = organizationId ? { organizationId } : {};
        const { id: userId, role } = userReq;
        const requestedId = req.query.supervisorId;
        let supervisorId = userId;
        if ((0, auth_middleware_1.getRoleRank)(role) >= 80 && requestedId)
            supervisorId = requestedId;
        const team = await client_1.default.user.findMany({
            where: { supervisorId, ...whereOrg },
            include: {
                kpiSheets: {
                    where: whereOrg,
                    orderBy: { createdAt: 'desc' }, take: 10,
                    select: { id: true, totalScore: true, status: true, isLocked: true }
                }
            }
        });
        return res.json(team.map(emp => ({
            id: emp.id,
            name: emp.fullName,
            fullName: emp.fullName, // For consistency with TargetCascadeModal
            role: emp.jobTitle,
            jobTitle: emp.jobTitle, // For consistency with TargetCascadeModal
            email: emp.email,
            avatar: emp.avatarUrl,
            avatarUrl: emp.avatarUrl,
            status: emp.status,
            kpiSheets: emp.kpiSheets,
            lastSheetId: emp.kpiSheets[0]?.id,
            lastScore: Number(emp.kpiSheets[0]?.totalScore || 0),
            performance: Number(emp.kpiSheets[0]?.totalScore || 0) > 80 ? 'On Track' : 'Needs Attention'
        })));
    }
    catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getMyTeam = getMyTeam;
// ─── CREATE EMPLOYEE ──────────────────────────────────────────────────────
const createEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const actorRank = userReq.rank;
        const actorRole = userReq.role;
        const actorId = userReq.id;
        // Only HR/MD (>= 85) can set salary/currency on create
        // HR can create Directors/Managers, but only MD can create HR (85+)
        const targetRank = (0, auth_middleware_1.getRoleRank)(req.body.role);
        if (actorRank < 85) {
            delete req.body.salary;
            delete req.body.currency;
        }
        if (actorRank < 90 && targetRank >= 85 && actorRank < targetRank) {
            return res.status(403).json({ error: 'Access denied: Only the MD can create high-level administrative accounts.' });
        }
        const tempPassword = req.body.password || 'SecureInit!';
        // 🛡️ Validate SubUnit/Department pairing
        if (req.body.subUnitId && req.body.departmentId) {
            const subUnit = await client_1.default.subUnit.findUnique({ where: { id: req.body.subUnitId } });
            if (subUnit && subUnit.departmentId !== Number(req.body.departmentId)) {
                return res.status(400).json({ error: 'The selected sub-unit does not belong to the selected department.' });
            }
        }
        const user = await userService.createUser(organizationId, req.body);
        const { passwordHash, ...safeUser } = user;
        // Fire-and-forget welcome email
        const org = await client_1.default.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
        (0, email_service_1.sendWelcomeEmail)(user.email, user.fullName, tempPassword, org?.name || 'HRM Engine').catch(console.error);
        // 🚀 AUTO-ONBOARDING: Attach default template if exists
        try {
            const defaultTemplate = await client_1.default.onboardingTemplate.findFirst({
                where: { organizationId, isDefault: true },
                include: { tasks: { orderBy: { order: 'asc' } } }
            });
            if (defaultTemplate && defaultTemplate.tasks.length > 0) {
                await client_1.default.onboardingSession.create({
                    data: {
                        employeeId: user.id,
                        organizationId,
                        templateId: defaultTemplate.id,
                        progress: 0,
                        items: {
                            create: defaultTemplate.tasks.map(task => ({
                                taskId: task.id,
                                organizationId,
                                title: task.title,
                                category: task.category,
                                isRequired: task.isRequired,
                                dueDate: new Date(Date.now() + task.dueAfterDays * 24 * 60 * 60 * 1000)
                            }))
                        }
                    }
                });
            }
        }
        catch (onboardErr) {
            console.error('[Onboarding Trigger Error]:', onboardErr);
        }
        res.status(201).json(withDepartment(getSafeUser(safeUser, actorRole)));
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.createEmployee = createEmployee;
// ─── GET ALL EMPLOYEES (Hardened for Managers) ───────────────────────────
const getAllEmployees = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const filters = { organizationId };
        const showArchived = req.query.archived === 'true';
        if (showArchived) {
            filters.isArchived = true;
        }
        else {
            filters.isArchived = false;
        }
        if (req.query.department)
            filters.departmentId = parseInt(req.query.department);
        if (req.query.role)
            filters.role = req.query.role;
        if (req.query.status)
            filters.status = req.query.status;
        const userRole = userReq.role;
        const userRank = (0, auth_middleware_1.getRoleRank)(userRole);
        const userId = userReq.id;
        // 🛡️ DEV ISOLATION: Always exclude DEV role from staff lists
        filters.role = { not: 'DEV' };
        // 🛡️ DEPARTMENTAL ISOLATION: 
        // - MD (90), DIRECTOR (80), HR_MANAGER (85) can see all.
        // - MANAGER (70), SUPERVISOR (60), STAFF (50) only see their department.
        if (userRank < 80 && userRole !== 'DEV') {
            filters.departmentId = userReq.departmentId;
        }
        const users = await userService.getAllUsers(organizationId, { ...filters, take: 100 });
        res.json(users.map(u => withDepartment(getSafeUser(u, userRole))));
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getAllEmployees = getAllEmployees;
// ─── GET SINGLE EMPLOYEE (Hardened) ──────────────────────────────────────
const getEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const targetId = req.params.id;
        const user = await userService.getUserById(organizationId, targetId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const userRole = userReq.role;
        const userRank = (0, auth_middleware_1.getRoleRank)(userRole);
        const actorId = userReq.id;
        // 🛡️ ACCESS CONTROL: 
        // - MD/HR/Director (>= 80) can view all.
        // - Manager/Staff (< 80) can only view their department or themselves.
        if (userRank < 80 && userRole !== 'DEV' && actorId !== targetId) {
            if (user.departmentId !== userReq.departmentId) {
                return res.status(403).json({ message: 'Access denied: You can only view employees in your department.' });
            }
        }
        res.json(withDepartment(getSafeUser(user, userRole)));
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getEmployee = getEmployee;
// ─── UPDATE EMPLOYEE (Hardened) ──────────────────────────────────────────
const updateEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const actorRole = userReq.role;
        const actorRank = (0, auth_middleware_1.getRoleRank)(actorRole);
        const actorId = userReq.id;
        const targetId = req.params.id;
        // Fetch target to check hierarchy
        const targetUser = await client_1.default.user.findUnique({ where: { id: targetId, organizationId } });
        if (!targetUser)
            return res.status(404).json({ message: 'User not found' });
        // 🛡️ ACCESS CONTROL: 
        // - MD/HR/Director (>= 80) can manage all.
        // - Manager (< 80 and >= 70) can manage their department reports.
        // - Staff (< 70) cannot manage others.
        if (actorRank < 80 && actorRole !== 'DEV' && actorId !== targetId) {
            if (targetUser.departmentId !== userReq.departmentId) {
                return res.status(403).json({ message: 'Access denied: You can only manage employees in your department.' });
            }
            // Staff cannot manage others at all
            if (actorRank < 70) {
                return res.status(403).json({ message: 'Access denied: Only managers can update employee records.' });
            }
            // Cannot edit someone with equal or higher rank
            if ((0, auth_middleware_1.getRoleRank)(targetUser.role) >= actorRank) {
                return res.status(403).json({ message: 'Access denied: You cannot manage users with equal or higher rank.' });
            }
        }
        // Only HR/MD (>= 85) can change salary/currency
        if (actorRank < 85) {
            delete req.body.salary;
            delete req.body.currency;
        }
        // Only MD/DEV (>= 90) can assign roles higher than 80 (Director+)
        const targetRank = req.body.role ? (0, auth_middleware_1.getRoleRank)(req.body.role) : undefined;
        if (actorRank < 90 && actorRole !== 'DEV') {
            if (targetRank && (targetRank >= 85 || (0, auth_middleware_1.getRoleRank)(targetUser.role) >= 85)) {
                return res.status(403).json({ message: 'Access denied: Only the MD can manage administrative roles (HR/MD).' });
            }
        }
        // 🛡️ Validate SubUnit/Department pairing
        const newDeptId = req.body.departmentId ? Number(req.body.departmentId) : targetUser.departmentId;
        const newSubUnitId = req.body.subUnitId !== undefined ? req.body.subUnitId : targetUser.subUnitId;
        if (newSubUnitId && newDeptId) {
            const subUnit = await client_1.default.subUnit.findUnique({ where: { id: newSubUnitId } });
            if (subUnit && subUnit.departmentId !== newDeptId) {
                return res.status(400).json({ error: 'The selected sub-unit does not belong to the selected department.' });
            }
        }
        const user = await userService.updateUser(organizationId, targetId, req.body);
        const { passwordHash, ...safe } = user;
        await (0, audit_service_1.logAction)(actorId, 'EMPLOYEE_UPDATED', 'User', targetId, { fields: Object.keys(req.body) }, req.ip);
        res.json(withDepartment(getSafeUser(safe, actorRole)));
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.updateEmployee = updateEmployee;
// ─── DELETE EMPLOYEE (MD/HR only — hard delete with cascade) ─────────────
const deleteEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const actorId = userReq.id;
        const targetId = req.params.id;
        // Prevent self-deletion
        if (actorId === targetId)
            return res.status(400).json({ message: 'Cannot delete your own account.' });
        // Check if target is MD (cannot delete MD via API)
        const target = await client_1.default.user.findFirst({
            where: { id: targetId, organizationId },
            select: { role: true, fullName: true }
        });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        if ((0, auth_middleware_1.getRoleRank)(target.role) >= 90) {
            return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
        }
        await userService.deleteUser(organizationId, targetId);
        await (0, audit_service_1.logAction)(actorId, 'EMPLOYEE_ARCHIVED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.deleteEmployee = deleteEmployee;
// ─── HARD DELETE EMPLOYEE (MD/HR only — destructive) ─────────────
const hardDeleteEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const actorId = userReq.id;
        const targetId = req.params.id;
        if (actorId === targetId)
            return res.status(400).json({ message: 'Cannot delete your own account.' });
        // Restrict HARD DELETE to MD/DEV only (Rank 90+)
        if (userReq.rank < 90 && userReq.role !== 'DEV') {
            return res.status(403).json({ message: 'Access denied: Only the MD or System Admin can perform destructive hard deletions.' });
        }
        const target = await client_1.default.user.findFirst({
            where: { id: targetId, organizationId },
            select: { role: true, fullName: true }
        });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        if ((0, auth_middleware_1.getRoleRank)(target.role) >= 90) {
            return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
        }
        await userService.hardDeleteUser(organizationId, targetId);
        await (0, audit_service_1.logAction)(actorId, 'EMPLOYEE_HARD_DELETED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.hardDeleteEmployee = hardDeleteEmployee;
// ─── ASSIGN ROLE (MD only) ────────────────────────────────────────────────
const assignRole = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const actorId = userReq.id;
        const actorRole = userReq.role;
        const actorRank = (0, auth_middleware_1.getRoleRank)(actorRole);
        const { userId, role, supervisorId } = req.body;
        const validRoles = ['DEV', 'MD', 'HR', 'DIRECTOR', 'MANAGER', 'MID_MANAGER', 'STAFF', 'CASUAL'];
        // 🛡️ Hierarchy Guard: Only MD/DEV (90+) can assign roles >= 85 (HR/MD)
        const targetRoleRank = (0, auth_middleware_1.getRoleRank)(role);
        if (actorRank < 90 && actorRole !== 'DEV' && targetRoleRank >= 85) {
            return res.status(403).json({ error: 'Access denied: Only the MD can assign administrative roles (HR/MD).' });
        }
        // 🛡️ Cannot promote someone to a rank higher than yourself
        if (actorRank < targetRoleRank && actorRole !== 'DEV') {
            return res.status(403).json({ error: 'Access denied: You cannot assign a role with a higher rank than your own.' });
        }
        const updateData = { role };
        if (supervisorId !== undefined)
            updateData.supervisorId = supervisorId || null;
        const user = await client_1.default.user.update({
            where: { id: userId, organizationId },
            data: updateData,
            select: { id: true, fullName: true, role: true, supervisorId: true }
        });
        await (0, websocket_service_1.notify)(userId, 'Your Role Has Been Updated', `Your role has been changed to ${role}.`, 'INFO');
        await (0, audit_service_1.logAction)(actorId, 'ROLE_ASSIGNED', 'User', userId, { role, supervisorId }, req.ip);
        res.json({ success: true, user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.assignRole = assignRole;
// ─── UPLOAD AVATAR ────────────────────────────────────────────────────────
const uploadImage = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const { role: actorRole, id: actorId } = userReq;
        const targetId = req.params.id;
        if ((0, auth_middleware_1.getRoleRank)(actorRole) < 80 && actorId !== targetId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        let publicUrl = null;
        // A: Multipart file upload
        if (req.file) {
            const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
            const fs = (await Promise.resolve().then(() => __importStar(require('fs')))).default;
            const path = (await Promise.resolve().then(() => __importStar(require('path')))).default;
            const outputPath = req.file.path.replace(/\.[^.]+$/, '-avatar.webp');
            await sharp(req.file.path)
                .resize(400, 400, { fit: 'cover' })
                .webp({ quality: 85 })
                .toFile(outputPath);
            try {
                fs.unlinkSync(req.file.path);
            }
            catch { }
            const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
            publicUrl = `${baseUrl}/uploads/${path.basename(outputPath)}`;
        }
        // B: Base64
        if (!publicUrl && req.body.image) {
            const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
            const fs = (await Promise.resolve().then(() => __importStar(require('fs')))).default;
            const path = (await Promise.resolve().then(() => __importStar(require('path')))).default;
            const base64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
            const buf = Buffer.from(base64, 'base64');
            const filename = `avatar-${targetId}-${Date.now()}.webp`;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads');
            const filepath = path.join(uploadDir, filename);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            await sharp(buf)
                .resize(400, 400, { fit: 'cover' })
                .webp({ quality: 85 })
                .toFile(filepath);
            const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
            publicUrl = `${baseUrl}/uploads/${filename}`;
        }
        // C: URL string provided directly
        if (!publicUrl && req.body.avatarUrl) {
            publicUrl = req.body.avatarUrl;
        }
        if (!publicUrl)
            return res.status(400).json({ message: 'No image provided.' });
        await userService.updateUser(organizationId, targetId, { avatarUrl: publicUrl });
        await (0, audit_service_1.logAction)(actorId, 'AVATAR_UPDATED', 'User', targetId, {}, req.ip);
        res.json({ url: publicUrl, message: 'Avatar updated successfully' });
    }
    catch (err) {
        res.status(500).json({ message: 'Image upload failed: ' + err.message });
    }
};
exports.uploadImage = uploadImage;
// ─── GET SUPERVISORS LIST (for dropdowns) ────────────────────────────────
const getSupervisors = async (req, res) => {
    const user = req.user;
    const organizationId = user.organizationId || 'default-tenant';
    const supervisors = await client_1.default.user.findMany({
        where: {
            organizationId,
            role: { in: ['MD', 'DIRECTOR', 'MANAGER', 'MID_MANAGER', 'SUPERVISOR'] },
            status: 'ACTIVE',
            NOT: { role: 'DEV' } // Redundant but safe
        },
        select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
        orderBy: { fullName: 'asc' },
        take: 100
    });
    res.json(supervisors);
};
exports.getSupervisors = getSupervisors;
// ─── RISK PROFILE ─────────────────────────────────────────────────────────
// ─── ARCHIVE EMPLOYEE (Soft Delete) ──────────────────────────────────────
const archiveEmployee = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'default-tenant';
        const { id } = req.params;
        await client_1.default.user.update({
            where: { id, organizationId },
            data: { isArchived: true, status: 'ARCHIVED', archivedDate: new Date() }
        });
        await (0, audit_service_1.logAction)(user.id, 'EMPLOYEE_ARCHIVED', 'User', id, {}, req.ip);
        res.json({ message: 'Employee archived successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.archiveEmployee = archiveEmployee;
// ─── RESTORE EMPLOYEE ─────────────────────────────────────────────────────
const restoreEmployee = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'default-tenant';
        const { id } = req.params;
        await client_1.default.user.update({
            where: { id, organizationId },
            data: { isArchived: false, status: 'ACTIVE', archivedDate: null }
        });
        await (0, audit_service_1.logAction)(user.id, 'EMPLOYEE_RESTORED', 'User', id, {}, req.ip);
        res.json({ message: 'Employee restored successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.restoreEmployee = restoreEmployee;
// ─── TRANSFER DEPARTMENT ──────────────────────────────────────────────────
const transferEmployee = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'default-tenant';
        const { id } = req.params;
        const { departmentId, reason } = req.body;
        await client_1.default.user.update({
            where: { id, organizationId },
            data: { departmentId: parseInt(departmentId) }
        });
        await (0, audit_service_1.logAction)(user.id, 'EMPLOYEE_TRANSFERRED', 'User', id, { departmentId, reason }, req.ip);
        res.json({ message: 'Employee transferred successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.transferEmployee = transferEmployee;
// ─── PROMOTE EMPLOYEE ─────────────────────────────────────────────────────
const promoteEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const { id } = req.params;
        const { jobTitle, role, salary, reason } = req.body;
        const updateData = { jobTitle, role };
        if (salary)
            updateData.salary = salary;
        await client_1.default.user.update({
            where: { id, organizationId },
            data: updateData
        });
        // Optionally log in history
        await client_1.default.employeeHistory.create({
            data: {
                organizationId,
                employeeId: id,
                title: 'Promotion',
                description: `Promoted to ${jobTitle} (${role}). Reason: ${reason || 'N/A'}`,
                type: 'PROMOTION',
                createdById: userReq.id
            }
        });
        await (0, audit_service_1.logAction)(userReq.id, 'EMPLOYEE_PROMOTED', 'User', id, { jobTitle, role, reason }, req.ip);
        res.json({ message: 'Employee promoted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.promoteEmployee = promoteEmployee;
const getUserRiskProfile = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const profile = await riskService.getRiskProfile(organizationId, req.params.id);
        res.json(profile);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getUserRiskProfile = getUserRiskProfile;
// Legacy alias
exports.createEmployeeWithNotifications = exports.createEmployee;
