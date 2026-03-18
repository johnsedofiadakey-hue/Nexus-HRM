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
const maintenanceService = __importStar(require("./services/maintenance.service"));
const leave_balance_service_1 = require("./services/leave-balance.service");
const reminder_service_1 = require("./services/reminder.service");
const websocket_service_1 = require("./services/websocket.service");
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const announcement_routes_1 = __importDefault(require("./routes/announcement.routes"));
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
const competency_routes_1 = __importDefault(require("./routes/competency.routes"));
dotenv_1.default.config();
if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}
const app = (0, express_1.default)();
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
// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174',
        process.env.FRONTEND_URL || 'http://localhost:3000'
    ],
    credentials: true
}));
app.use(rate_limit_middleware_1.generalLimiter);
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
app.use(express_1.default.static('public'));
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// ─── DEV ROUTES (bypass maintenance, high rate limit) ────────────────────────
app.use('/api/dev', rate_limit_middleware_1.devLimiter, dev_routes_1.default);
// ─── MAINTENANCE GUARD ──────────────────────────────────────────────────────
const maintenance_middleware_1 = require("./middleware/maintenance.middleware");
const subscription_middleware_1 = require("./middleware/subscription.middleware");
app.use(maintenance_middleware_1.maintenanceMiddleware);
app.use(subscription_middleware_1.subscriptionGuard);
// ─── ROUTES ─────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
    status: 'UP',
    version: '2.0.2',
    buildTime: '2026-03-18 22:00',
    nodeEnv: process.env.NODE_ENV
}));
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
app.get('/', (_req, res) => res.json({ message: '🚀 Nexus HRM v2.0 Engine Running', version: '2.0.1' }));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/announcements', announcement_routes_1.default);
app.use('/api/team', team_routes_1.default);
app.use('/api/kpi', kpi_routes_1.default);
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
app.use('/api/competencies', competency_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
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
// ─── ERROR HANDLER ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});
// ─── START ──────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`\n🚀 Nexus HRM v2.0 running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`📊 API Docs: http://localhost:${PORT}/\n`);
});
