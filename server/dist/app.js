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
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = __importDefault(require("./prisma/client"));
const maintenanceService = __importStar(require("./services/maintenance.service"));
const leave_balance_service_1 = require("./services/leave-balance.service");
const reminder_service_1 = require("./services/reminder.service");
const websocket_service_1 = require("./services/websocket.service");
const scheduler_service_1 = require("./services/scheduler.service");
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
const xss_sanitizer_middleware_1 = require("./middleware/xss-sanitizer.middleware");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const announcement_routes_1 = __importDefault(require("./routes/announcement.routes"));
const sub_unit_routes_1 = __importDefault(require("./routes/sub-unit.routes"));
const kpi_routes_1 = __importDefault(require("./routes/kpi.routes"));
const team_routes_1 = __importDefault(require("./routes/team.routes"));
const leave_routes_1 = __importDefault(require("./routes/leave.routes"));
const cycle_routes_1 = __importDefault(require("./routes/cycle.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const appraisal_routes_1 = __importDefault(require("./routes/appraisal.routes"));
const history_routes_1 = __importDefault(require("./routes/history.routes"));
const asset_routes_1 = __importDefault(require("./routes/asset.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const department_routes_1 = __importDefault(require("./routes/department.routes"));
const activity_routes_1 = __importDefault(require("./routes/activity.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const payroll_routes_1 = __importDefault(require("./routes/payroll.routes"));
const onboarding_routes_1 = __importDefault(require("./routes/onboarding.routes"));
const training_routes_1 = __importDefault(require("./routes/training.routes"));
const holiday_routes_1 = __importDefault(require("./routes/holiday.routes"));
const orgchart_routes_1 = __importDefault(require("./routes/orgchart.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const itadmin_routes_1 = __importDefault(require("./routes/itadmin.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const privacy_routes_1 = __importDefault(require("./routes/privacy.routes"));
const dev_routes_1 = __importDefault(require("./routes/dev.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const query_routes_1 = __importDefault(require("./routes/query.routes"));
const finance_routes_1 = __importDefault(require("./routes/finance.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const compensation_routes_1 = __importDefault(require("./routes/compensation.routes"));
const enterprise_routes_1 = __importDefault(require("./routes/enterprise.routes"));
const performance_v2_routes_1 = __importDefault(require("./routes/performance-v2.routes"));
const target_routes_1 = __importDefault(require("./routes/target.routes"));
const inbox_routes_1 = __importDefault(require("./routes/inbox.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const reporting_routes_1 = __importDefault(require("./routes/reporting.routes"));
const recruitment_routes_1 = __importDefault(require("./routes/recruitment.routes"));
const expense_routes_1 = __importDefault(require("./routes/expense.routes"));
const support_routes_1 = __importDefault(require("./routes/support.routes"));
const offboarding_routes_1 = __importDefault(require("./routes/offboarding.routes"));
dotenv_1.default.config();
const validateConfig = () => {
    const required = ['JWT_SECRET', 'DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`\n[FATAL] Missing mandatory environment variables: ${missing.join(', ')}`);
        console.error(`Please check your .env file or production secrets configuration.\n`);
        process.exit(1);
    }
};
validateConfig();
const app = (0, express_1.default)();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
// Create HTTP server (needed for WebSocket)
const server = http_1.default.createServer(app);
// Init WebSocket
(0, websocket_service_1.initWebSocket)(server);
// ─── CRON JOBS ─────────────────────────────────────────────────────────────
node_cron_1.default.schedule('0 */12 * * *', async () => {
    console.log('[CRON] Running backup...');
    try {
        await maintenanceService.runBackup();
    }
    catch (e) {
        console.error('[CRON] Backup failed:', e);
    }
});
node_cron_1.default.schedule('0 2 * * *', async () => {
    try {
        const n = await (0, leave_balance_service_1.accrueLeaveBalances)();
        if (n)
            console.log(`[CRON] Accrued leave for ${n} users`);
    }
    catch (e) {
        console.error('[CRON] Leave accrual failed:', e);
    }
});
node_cron_1.default.schedule('0 8 * * *', async () => {
    try {
        const [leaves, appraisals] = await Promise.all([(0, reminder_service_1.sendLeaveReminders)(), (0, reminder_service_1.sendAppraisalReminders)()]);
        if (leaves || appraisals)
            console.log(`[CRON] Reminders: ${leaves} leave, ${appraisals} appraisals`);
    }
    catch (e) {
        console.error('[CRON] Reminder sweep failed:', e);
    }
});
// ─── FORCE-FLOW CORS BRIDGE (Entry Point) ──────────────────────────────────
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://mcbauchemieguinea.com',
            'https://www.mcbauchemieguinea.com',
            'https://nexus-hrm.web.app',
            'https://nexus-hrm.firebaseapp.com',
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(ao => origin.startsWith(ao))) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-dev-master-key']
}));
// Handle Preflight Circuit Breaker
app.options('*', (0, cors_1.default)());
// ─── STANDARD SECURITY (Below CORS Bridge) ──────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(xss_sanitizer_middleware_1.xssSanitizer);
app.use(rate_limit_middleware_1.generalLimiter);
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
app.use(express_1.default.static('public'));
app.use('/uploads', express_1.default.static('public/uploads'));
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// ─── TELEMETRY ─────────────────────────────────────────────────────────────
const telemetry_middleware_1 = require("./middleware/telemetry.middleware");
app.use(telemetry_middleware_1.apiUsageMiddleware);
// ─── DEV ROUTES (bypass maintenance, high rate limit) ────────────────────────
app.use('/api/dev', rate_limit_middleware_1.devLimiter, dev_routes_1.default);
// ─── MAINTENANCE GUARD ──────────────────────────────────────────────────────
const maintenance_middleware_1 = require("./middleware/maintenance.middleware");
const subscription_middleware_1 = require("./middleware/subscription.middleware");
app.use(maintenance_middleware_1.maintenanceMiddleware);
app.use(subscription_middleware_1.subscriptionGuard);
// ─── ROUTES ─────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        // Perform a shallow DB check
        await client_1.default.$queryRaw `SELECT 1`;
        return res.json({
            status: 'UP',
            database: 'CONNECTED',
            version: '2.1.5-PROD-READY',
            buildTime: new Date().toISOString(),
            nodeEnv: process.env.NODE_ENV
        });
    }
    catch (err) {
        console.error('[Health] System Degraded:', err.message);
        return res.status(503).json({
            status: 'DEGRADED',
            database: 'DISCONNECTED',
            error: err.message
        });
    }
});
// Route discovery tool
app.get('/api/routes', (req, res) => {
    const routes = [];
    function print(path, layer) {
        if (layer.route) {
            layer.route.stack.forEach((s) => routes.push({ path: path + layer.route.path, method: s.method.toUpperCase() }));
        }
        else if (layer.name === 'router' && layer.handle.stack) {
            layer.handle.stack.forEach((s) => print(path + (layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^', '').replace('\\/', '/')), s));
        }
    }
    app._router.stack.forEach((l) => print('', l));
    res.json(routes.filter(r => r.path !== ''));
});
app.get('/', (_req, res) => res.json({ message: '🚀 HRM Core Engine Running', version: '2.0.1' }));
const debug_routes_1 = __importDefault(require("./routes/debug.routes"));
app.use('/api/debug-env', debug_routes_1.default);
// ─── STARTUP FIXES (HANDOVER SANCTITY) ───────────────────────────────────
(async () => {
    try {
        const { prismaClient } = await Promise.resolve().then(() => __importStar(require('./prisma/client')));
        console.log('[Startup] INITIATING ABSOLUTE APPRAISAL WIPE (HANDOVER MODE)...');
        await prismaClient.$transaction(async (tx) => {
            // 1. Wipe Modern System (Absolute)
            const r1 = await tx.appraisalReview.deleteMany({});
            const r2 = await tx.appraisalPacket.deleteMany({});
            const r3 = await tx.appraisalCycle.deleteMany({});
            // 2. Wipe Legacy System
            const r4 = await tx.performanceScore.deleteMany({});
            const r5 = await tx.performanceReviewV2.deleteMany({});
            const r6 = await tx.reviewCycle.deleteMany({});
            // 3. Clear Auxiliaries
            const r7 = await tx.employeeHistory.deleteMany({ where: { type: 'PERFORMANCE' } });
            const r8 = await tx.notification.deleteMany({
                where: {
                    OR: [
                        { link: { contains: '/reviews/packet/' } },
                        { link: { contains: '/appraisals' } },
                        { title: { contains: 'Appraisal' } }
                    ]
                }
            });
            console.log(`[Startup] PERFECTION ACHIEVED. Purged: Reviews(${r1.count}), Packets(${r2.count}), Cycles(${r3.count}), History(${r7.count})`);
        });
        const { TargetService } = await Promise.resolve().then(() => __importStar(require('./services/target.service')));
        // 🎯 Target Progress Sync
        await TargetService.syncAllTargets('default-tenant');
    }
    catch (err) {
        console.error('[Startup] Failed to run Handover Purge:', err);
    }
})();
app.use('/api/auth', auth_routes_1.default);
app.use('/api/announcements', announcement_routes_1.default);
app.use('/api/sub-units', sub_unit_routes_1.default);
app.use('/api/team', team_routes_1.default);
app.use('/api/kpi', kpi_routes_1.default);
app.use('/api/kpis', kpi_routes_1.default);
app.use('/api/targets', target_routes_1.default);
app.use('/api/leave', leave_routes_1.default);
app.use('/api/cycles', cycle_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/employees', user_routes_1.default); // alias for frontend
app.use('/api/appraisals', appraisal_routes_1.default);
app.use('/api/history', history_routes_1.default);
app.use('/api/assets', asset_routes_1.default);
app.use('/api/audit', audit_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/departments', department_routes_1.default);
app.use('/api/activity', activity_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/payroll', payroll_routes_1.default);
app.use('/api/onboarding', onboarding_routes_1.default);
app.use('/api/training', training_routes_1.default);
app.use('/api/holidays', holiday_routes_1.default);
app.use('/api/orgchart', orgchart_routes_1.default);
app.use('/api/documents', document_routes_1.default);
app.use('/api/queries', query_routes_1.default);
app.use('/api/finance', finance_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/export', rate_limit_middleware_1.exportLimiter, export_routes_1.default);
app.use('/api/it', itadmin_routes_1.default);
app.use('/api/payment', payment_routes_1.default);
app.use('/api/privacy', privacy_routes_1.default);
app.use('/api/settings', require('./routes/settings.routes').default);
app.use('/api/maintenance', require('./routes/maintenance.routes').default);
app.use('/api/compensation', compensation_routes_1.default);
app.use('/api/enterprise', enterprise_routes_1.default);
app.use('/api/performance-v2', performance_v2_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/inbox', inbox_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/reporting', reporting_routes_1.default);
app.use('/api/recruitment', recruitment_routes_1.default);
app.use('/api/expenses', expense_routes_1.default);
app.use('/api/support', support_routes_1.default);
app.use('/api/offboarding', offboarding_routes_1.default);
// ─── DEBUG ROUTE ────────────────────────────────────────────────────────────
app.get('/api/debug-routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({ path: middleware.route.path, methods: Object.keys(middleware.route.methods) });
        }
        else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const path = middleware.regexp.toString().replace('/^', '').replace('\\/?(?=\\/|$)/i', '') + handler.route.path;
                    routes.push({ path: path.replace(/\\\//g, '/'), methods: Object.keys(handler.route.methods) });
                }
            });
        }
    });
    res.json(routes);
});
// ─── 404 HANDLER (DEBUG) ──────────────────────────────────────────────────
app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Route not found',
        requestedPath: req.path,
        requestedMethod: req.method,
        version: '2.1.2'
    });
});
// ─── ERROR HANDLER ──────────────────────────────────────────────────────────
const error_log_service_1 = require("./services/error-log.service");
app.use((err, req, res, next) => {
    error_log_service_1.errorLogger.log('GlobalErrorHandler', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});
// ─── START ──────────────────────────────────────────────────────────────────
server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n🚀 Nexus HRM v2.0 running on http://0.0.0.0:${PORT}`);
    console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}/ws`);
    console.log(`📊 API Docs: http://0.0.0.0:${PORT}/\n`);
    // Start Scheduler
    scheduler_service_1.SchedulerService.init();
});
