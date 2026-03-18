"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantBankTransferAccess = exports.triggerBackup = exports.getTenantDetails = exports.getSystemLogs = exports.extendTrial = exports.toggleTenantFeature = exports.getSecurityTelemetry = exports.checkIntegrity = exports.getSystemStats = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const os_1 = __importDefault(require("os"));
const system_logger_1 = require("../utils/system-logger");
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
                monthlyPrice: masterSettings?.monthlyPriceGHS || 100,
                annualPrice: masterSettings?.annualPriceGHS || 1000,
                trialDays: masterSettings?.trialDays || 14,
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
        await client_1.default.$executeRawUnsafe(`VACUUM INTO 'prisma/backup-${Date.now()}.db'`);
        await (0, system_logger_1.logSystemAction)({
            action: 'TRIGGER_BACKUP',
            details: 'Manual database backup initiated',
            operatorId: user.id,
            operatorEmail: user.email,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        res.json({ success: true, message: 'Backup created successfully in prisma/ folder' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.triggerBackup = triggerBackup;
// Manual Bank Transfer Override
const grantBankTransferAccess = async (req, res) => {
    try {
        const { organizationId, plan, paymentReference, amountGHS, notes } = req.body;
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
                    priceGHS: amountGHS || 0,
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
            details: `Granted ${plan} access to ${org.name}. Ref: ${paymentReference || 'N/A'}. Amount: GHS ${amountGHS || 'N/A'}. Notes: ${notes || 'None'}`,
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
