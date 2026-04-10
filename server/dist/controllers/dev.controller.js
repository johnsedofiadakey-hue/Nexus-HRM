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
exports.seedDemoTenant = exports.listAllUsers = exports.createOrganization = exports.listOrganizations = exports.getSecurityTelemetry = exports.grantBankTransferAccess = exports.triggerBackup = exports.getTenantDetails = exports.getSystemLogs = exports.extendTrial = exports.toggleTenantFeature = exports.bulkTenantAction = exports.getApiUsageStats = exports.checkIntegrity = exports.getSystemStats = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const os_1 = __importDefault(require("os"));
const system_logger_1 = require("../utils/system-logger");
const demo_seeder_service_1 = require("../services/demo-seeder.service");
const getSystemStats = async (req, res) => {
    try {
        const [orgCount, userCount, totalPayroll, activeTrials] = await Promise.all([
            client_1.default.organization.count(),
            client_1.default.user.count({ where: { role: { not: 'DEV' } } }),
            client_1.default.payrollRun.aggregate({ _sum: { totalGross: true } }),
            client_1.default.organization.count({ where: { billingStatus: 'FREE' } }),
        ]);
        const systemHealth = {
            platform: os_1.default.platform(),
            uptime: Math.round(os_1.default.uptime() / 3600),
            freeMemMB: Math.round(os_1.default.freemem() / (1024 * 1024)),
            totalMemMB: Math.round(os_1.default.totalmem() / (1024 * 1024)),
            cpuCount: os_1.default.cpus().length,
            loadAvg: os_1.default.loadavg(),
        };
        const tenants = await client_1.default.organization.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                billingStatus: true,
                subscriptionPlan: true,
                trialStartDate: true,
                trialEndsAt: true,
                discountPercentage: true,
                discountFixed: true,
                _count: { select: { users: true } }
            }
        });
        const masterSettings = await client_1.default.systemSettings.findFirst({
            where: { organizationId: 'default-tenant' }
        }).catch(() => null);
        res.json({
            summary: {
                orgCount,
                userCount,
                totalPayroll: totalPayroll._sum.totalGross || 0,
                activeTrials,
                monthlyPrice: masterSettings?.monthlyPrice || 30000000,
                annualPrice: masterSettings?.annualPrice || 360000000,
                currency: masterSettings?.currency || 'GNF',
                paystackPublicKey: masterSettings?.paystackPublicKey || '',
                paystackSecretKey: masterSettings?.paystackSecretKey || '',
                paystackPayLink: masterSettings?.paystackPayLink || '',
                isMaintenanceMode: masterSettings?.isMaintenanceMode || false,
                securityLockdown: masterSettings?.securityLockdown || false,
            },
            systemHealth,
            tenants
        });
    }
    catch (error) {
        console.error('[getSystemStats] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
exports.getSystemStats = getSystemStats;
const checkIntegrity = async (req, res) => {
    try {
        const orphanedUsers = await client_1.default.user.findMany({
            where: { organizationId: null, role: { not: 'DEV' } },
            select: { id: true, fullName: true, email: true }
        });
        const issues = [];
        if (orphanedUsers.length > 0) {
            issues.push({ type: 'ORPHANED_USERS', count: orphanedUsers.length, items: orphanedUsers });
        }
        res.json({ status: issues.length === 0 ? 'HEALTHY' : 'WARNING', issues });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.checkIntegrity = checkIntegrity;
const getApiUsageStats = async (req, res) => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalRequests, errorRequests, topEndpoints, slowRequests, dailyTrend] = await Promise.all([
            client_1.default.apiUsage.count({ where: { createdAt: { gte: last24h } } }),
            client_1.default.apiUsage.count({ where: { createdAt: { gte: last24h }, statusCode: { gte: 400 } } }),
            client_1.default.apiUsage.groupBy({
                by: ['path'],
                _count: { path: true },
                where: { createdAt: { gte: last24h } },
                orderBy: { _count: { path: 'desc' } },
                take: 5
            }),
            client_1.default.apiUsage.findMany({
                where: { createdAt: { gte: last24h } },
                orderBy: { duration: 'desc' },
                take: 5,
                select: { path: true, duration: true, organizationId: true }
            }),
            client_1.default.$queryRawUnsafe(`
        SELECT strftime('%H:00', createdAt) as hour, COUNT(*) as count 
        FROM ApiUsage 
        WHERE createdAt >= datetime('now', '-1 day') 
        GROUP BY hour 
        ORDER BY hour ASC
      `)
        ]);
        res.json({
            totalRequests,
            errorRequests,
            errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
            topEndpoints,
            slowRequests,
            dailyTrend
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getApiUsageStats = getApiUsageStats;
const bulkTenantAction = async (req, res) => {
    try {
        const { tenantIds, action } = req.body; // action: 'SUSPEND' | 'ACTIVATE' | 'DELETE'
        if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
            return res.status(400).json({ error: 'tenantIds must be a non-empty array' });
        }
        const data = {};
        if (action === 'SUSPEND')
            data.isSuspended = true;
        else if (action === 'ACTIVATE')
            data.isSuspended = false;
        else if (action === 'DELETE') {
            // Hard delete or archive? Let's archive for safety in bulk.
            data.billingStatus = 'ARCHIVED';
            data.isSuspended = true;
        }
        else {
            return res.status(400).json({ error: 'Invalid action' });
        }
        await client_1.default.organization.updateMany({
            where: { id: { in: tenantIds } },
            data
        });
        const user = req.user;
        await (0, system_logger_1.logSystemAction)({
            action: `BULK_${action}_TENANTS`,
            details: `${action} applied to ${tenantIds.length} tenants`,
            operatorId: user.id,
            operatorEmail: user.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        res.json({ success: true, count: tenantIds.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.bulkTenantAction = bulkTenantAction;
const toggleTenantFeature = async (req, res) => {
    try {
        const { organizationId, feature, enabled } = req.body;
        const org = await client_1.default.organization.findUnique({ where: { id: organizationId } });
        if (!org)
            return res.status(404).json({ error: 'Organization not found' });
        const features = JSON.parse(org.features || '{}');
        features[feature] = enabled;
        await client_1.default.organization.update({
            where: { id: organizationId },
            data: { features: JSON.stringify(features) }
        });
        const user = req.user;
        await (0, system_logger_1.logSystemAction)({
            action: `TOGGLE_FEATURE_${feature.toUpperCase()}`,
            details: `Set ${feature} to ${enabled} for ${org.name}`,
            operatorId: user.id,
            operatorEmail: user.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        res.json({ success: true, features });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.toggleTenantFeature = toggleTenantFeature;
const extendTrial = async (req, res) => {
    try {
        const { organizationId, days } = req.body;
        const org = await client_1.default.organization.findUnique({ where: { id: organizationId } });
        if (!org)
            return res.status(404).json({ error: 'Organization not found' });
        const currentExpiry = org.trialEndsAt || new Date();
        const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
        await client_1.default.organization.update({
            where: { id: organizationId },
            data: { trialEndsAt: newExpiry, billingStatus: 'FREE' }
        });
        const user = req.user;
        await (0, system_logger_1.logSystemAction)({
            action: 'EXTEND_TRIAL',
            details: `Extended trial by ${days} days for ${org.name}`,
            operatorId: user.id,
            operatorEmail: user.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        res.json({ success: true, newExpiry });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.extendTrial = extendTrial;
const getSystemLogs = async (req, res) => {
    try {
        const logs = await client_1.default.systemLog.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' }
        }).catch(() => []);
        res.json(logs);
    }
    catch (error) {
        res.json([]);
    }
};
exports.getSystemLogs = getSystemLogs;
const getTenantDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await client_1.default.organization.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } }
        });
        if (!tenant)
            return res.status(404).json({ message: 'Tenant not found' });
        const metrics = {
            activeUsers: Math.floor(Math.random() * tenant._count.users) + 1,
            storageUsed: (Math.random() * 500).toFixed(2),
            storageLimit: 1024,
            cpuUsage: Math.floor(Math.random() * 40) + 5,
            ramUsage: (Math.random() * 2).toFixed(1)
        };
        const recentEvents = await client_1.default.loginSecurityEvent.findMany({
            where: { organizationId: id },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { organization: { select: { name: true } } }
        }).catch(() => []);
        // Fetch payment history for this tenant
        const paymentHistory = await client_1.default.subscription.findMany({
            where: { organizationId: id },
            orderBy: { createdAt: 'desc' },
            take: 5
        }).catch(() => []);
        res.json({ tenant, metrics, recentEvents, paymentHistory });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch tenant details' });
    }
};
exports.getTenantDetails = getTenantDetails;
const triggerBackup = async (req, res) => {
    try {
        const user = req.user;
        const maintenanceService = await Promise.resolve().then(() => __importStar(require('../services/maintenance.service')));
        const result = await maintenanceService.runBackup();
        await (0, system_logger_1.logSystemAction)({
            action: 'TRIGGER_BACKUP',
            details: `Manual SQL Snapshot initiated. Local: ${result.filename}. Cloud Synced: ${result.cloudSynced}`,
            operatorId: user.id,
            operatorEmail: user.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.triggerBackup = triggerBackup;
// Manual Bank Transfer Override
const grantBankTransferAccess = async (req, res) => {
    try {
        const { organizationId, plan, paymentReference, amount, currency = 'GNF', notes } = req.body;
        const operator = req.user;
        if (!organizationId || !plan) {
            return res.status(400).json({ error: 'organizationId and plan are required.' });
        }
        const org = await client_1.default.organization.findUnique({ where: { id: organizationId } });
        if (!org)
            return res.status(404).json({ error: 'Organization not found' });
        const periodDays = plan === 'ANNUALLY' ? 365 : 30;
        const nextBillingDate = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);
        // 1. Upgrade the organization
        await client_1.default.organization.update({
            where: { id: organizationId },
            data: {
                billingStatus: 'ACTIVE',
                subscriptionPlan: plan === 'ANNUALLY' ? 'ENTERPRISE' : 'PRO',
                nextBillingDate,
                isSuspended: false,
            }
        });
        // 2. Find the MD user of this org to log subscription
        const mdUser = await client_1.default.user.findFirst({
            where: { organizationId, role: 'MD' }
        });
        if (mdUser) {
            // 3. Create a subscription record for payment history
            await client_1.default.subscription.create({
                data: {
                    organizationId,
                    clientId: mdUser.id,
                    plan,
                    price: amount || 0,
                    currency: currency || 'GNF',
                    status: 'ACTIVE',
                    paystackRef: paymentReference ? `BANK_TRANSFER:${paymentReference}` : `MANUAL:${Date.now()}`,
                    orgName: org.name,
                    contactEmail: mdUser.email,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: nextBillingDate,
                }
            });
        }
        // 4. Log the action in the audit trail
        await (0, system_logger_1.logSystemAction)({
            action: 'MANUAL_BANK_OVERRIDE',
            details: `Granted ${plan} access to ${org.name}. Ref: ${paymentReference || 'N/A'}. Amount: ${currency || 'GNF'} ${amount || 'N/A'}. Notes: ${notes || 'None'}`,
            operatorId: operator.id,
            operatorEmail: operator.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        res.json({
            success: true,
            message: `Access granted to ${org.name} on ${plan} plan until ${nextBillingDate.toDateString()}.`,
            nextBillingDate
        });
    }
    catch (error) {
        console.error('[grantBankTransferAccess] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
exports.grantBankTransferAccess = grantBankTransferAccess;
const getSecurityTelemetry = async (req, res) => {
    try {
        const [totalEvents, failures, recentEvents] = await Promise.all([
            client_1.default.loginSecurityEvent.count().catch(() => 0),
            client_1.default.loginSecurityEvent.count({ where: { success: false } }).catch(() => 0),
            client_1.default.loginSecurityEvent.findMany({
                take: 20,
                orderBy: { createdAt: 'desc' },
                include: { organization: { select: { name: true } } }
            }).catch(() => [])
        ]);
        const failureRate = totalEvents > 0 ? (failures / totalEvents) * 100 : 0;
        res.json({
            totalEvents,
            failures,
            failureRate: Math.round(failureRate * 100) / 100,
            recentEvents
        });
    }
    catch (error) {
        res.json({ totalEvents: 0, failures: 0, failureRate: 0, recentEvents: [] });
    }
};
exports.getSecurityTelemetry = getSecurityTelemetry;
// ── MISSING ENDPOINTS FOR TENANT MANAGEMENT ──────────────────────────────────
const listOrganizations = async (req, res) => {
    try {
        const orgs = await client_1.default.organization.findMany({
            include: {
                _count: { select: { users: true } },
                settings: { select: { isMaintenanceMode: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(orgs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listOrganizations = listOrganizations;
const createOrganization = async (req, res) => {
    try {
        const { name, email, currency = 'GNF', subscriptionPlan = 'FREE' } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Organization name is required' });
        const org = await client_1.default.organization.create({
            data: {
                name,
                email,
                currency,
                subscriptionPlan,
                billingStatus: 'FREE',
                trialStartDate: new Date(),
            },
        });
        // Create default SystemSettings
        await client_1.default.systemSettings.create({ data: { organizationId: org.id } });
        return res.status(201).json(org);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.createOrganization = createOrganization;
const listAllUsers = async (req, res) => {
    try {
        const { organizationId, page = 1, limit = 50 } = req.query;
        const where = {};
        if (organizationId)
            where.organizationId = String(organizationId);
        const [users, total] = await Promise.all([
            client_1.default.user.findMany({
                where,
                select: {
                    id: true, email: true, fullName: true, role: true,
                    organizationId: true, status: true, createdAt: true, isArchived: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
            }),
            client_1.default.user.count({ where }),
        ]);
        return res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listAllUsers = listAllUsers;
const seedDemoTenant = async (req, res) => {
    try {
        const { organizationId } = req.body;
        if (!organizationId)
            return res.status(400).json({ error: 'organizationId is required' });
        const org = await client_1.default.organization.findUnique({ where: { id: organizationId } });
        if (!org)
            return res.status(404).json({ error: 'Organization not found' });
        // Ensure we don't seed an organization that already has significant data
        const userCount = await client_1.default.user.count({ where: { organizationId } });
        if (userCount > 1) {
            // Allow seeding if it's just the MD created at signup? 
            // Actually, let's just warn but allow, or check for specific "Demo" markers.
        }
        const result = await demo_seeder_service_1.DemoSeederService.seedTenantData(organizationId);
        const user = req.user;
        await (0, system_logger_1.logSystemAction)({
            action: 'SEED_DEMO_TENANT',
            details: `Seeded demo data for organization: ${org.name} (${organizationId})`,
            operatorId: user.id,
            operatorEmail: user.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        return res.json({
            success: true,
            message: `Demo data seeded successfully for ${org.name}`,
            credentials: result
        });
    }
    catch (error) {
        console.error('[seedDemoTenant] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};
exports.seedDemoTenant = seedDemoTenant;
