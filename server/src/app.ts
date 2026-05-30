import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import prisma from './prisma/client';
import * as maintenanceService from './services/maintenance.service';
import { accrueLeaveBalances } from './services/leave-balance.service';
import { sendAppraisalReminders, sendLeaveReminders } from './services/reminder.service';
import { RenewalService } from './services/renewal.service';
import { initWebSocket } from './services/websocket.service';
import { TargetService } from './services/target.service';
import { SchedulerService } from './services/scheduler.service';
import { generalLimiter, exportLimiter, devLimiter } from './middleware/rate-limit.middleware';
import { xssSanitizer } from './middleware/xss-sanitizer.middleware';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth.routes';
import announcementRoutes from './routes/announcement.routes';
import subUnitRoutes from './routes/sub-unit.routes';
import kpiRoutes from './routes/kpi.routes';
import teamRoutes from './routes/team.routes';
import leaveRoutes from './routes/leave.routes';
import cycleRoutes from './routes/cycle.routes';
import userRoutes from './routes/user.routes';
import appraisalRoutes from './routes/appraisal.routes';
import historyRoutes from './routes/history.routes';
import assetRoutes from './routes/asset.routes';
import auditRoutes from './routes/audit.routes';
import dashboardRoutes from './routes/dashboard.routes';
import departmentRoutes from './routes/department.routes';
import activityRoutes from './routes/activity.routes';
import notificationRoutes from './routes/notification.routes';
import payrollRoutes from './routes/payroll.routes';
import onboardingRoutes from './routes/onboarding.routes';
import trainingRoutes from './routes/training.routes';
import holidayRoutes from './routes/holiday.routes';
import orgchartRoutes from './routes/orgchart.routes';
import analyticsRoutes from './routes/analytics.routes';
import exportRoutes from './routes/export.routes';
import itadminRoutes from './routes/itadmin.routes';
import paymentRoutes from './routes/payment.routes';
import privacyRoutes from './routes/privacy.routes';
import devRoutes from './routes/dev.routes';
import documentRoutes from './routes/document.routes';
import queryRoutes from './routes/query.routes';
import financeRoutes from './routes/finance.routes';
import attendanceRoutes from './routes/attendance.routes';
import compensationRoutes from './routes/compensation.routes';
import enterpriseRoutes from './routes/enterprise.routes';
import performanceV2Routes from './routes/performance-v2.routes';
import targetRoutes from './routes/target.routes';
import inboxRoutes from './routes/inbox.routes';
import uploadRoutes from './routes/upload.routes';
import reportingRoutes from './routes/reporting.routes';
import recruitmentRoutes from './routes/recruitment.routes';
import expenseRoutes from './routes/expense.routes';
import supportRoutes from './routes/support.routes';
import offboardingRoutes from './routes/offboarding.routes';
import erpIntegrationRoutes from './routes/erp-integration.routes';


// Config already loaded at top level

// Single source of truth for the running version.
// npm_package_version is set automatically when started via `npm start` / `npm run dev`.
// Fallback reads the package.json directly for ts-node / non-npm invocations.
const APP_VERSION: string = (() => {
  if (process.env.npm_package_version) return process.env.npm_package_version;
  try {
    return require('../package.json').version;
  } catch {
    return 'unknown';
  }
})();


const validateConfig = () => {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    logger.error('Missing mandatory environment variables', { missing });
    process.exit(1);
  }
  logger.info('Environment variables verified');
};

validateConfig();

const app: Application = express();
app.set('trust proxy', 1);

// Robust Port Binding
const rawPort = process.env.PORT || '5000';
const PORT = parseInt(rawPort, 10);

if (isNaN(PORT)) {
  logger.error('Invalid PORT specified', { rawPort });
  process.exit(1);
}

// Create HTTP server (needed for WebSocket)
const server = http.createServer(app);

// ─── FORCE-FLOW CORS BRIDGE (Entry Point) ──────────────────────────────────
const allowedOrigins = [
  'https://mcbauchemieguinea.com',
  'https://www.mcbauchemieguinea.com',
  'https://nexus-hrm.web.app',
  'https://nexus-hrm.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const normalizedOrigin = origin?.replace(/\/$/, '');
    if (!normalizedOrigin) return callback(new Error('Origin header required'));
    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.some(ao => normalizedOrigin.startsWith(ao))) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-dev-master-key', 'X-Nexus-ERP-Key'],
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));

// ─── SECURITY HEADERS ──────────────────────────────────────────────────────
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(xssSanitizer);
app.use(generalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Init WebSocket (After security)
initWebSocket(server);

// ─── CRON JOBS ─────────────────────────────────────────────────────────────
cron.schedule('0 */12 * * *', async () => {
  logger.info('CRON: running backup');
  try { await maintenanceService.runBackup(); } catch (e: any) { logger.error('CRON: backup failed', { error: e?.message }); }
});

cron.schedule('0 2 * * *', async () => {
  try { const n = await accrueLeaveBalances(); if (n) logger.info('CRON: leave accrual done', { users: n }); }
  catch (e: any) { logger.error('CRON: leave accrual failed', { error: e?.message }); }
});

cron.schedule('0 8 * * *', async () => {
  try {
    const [leaves, appraisals] = await Promise.all([sendLeaveReminders(), sendAppraisalReminders()]);
    if (leaves || appraisals) logger.info('CRON: reminders sent', { leaves, appraisals });
  } catch (e: any) { logger.error('CRON: reminder sweep failed', { error: e?.message }); }
});

cron.schedule('0 9 * * *', async () => {
  try { await RenewalService.checkExpirations(); }
  catch (e: any) { logger.error('CRON: renewal check failed', { error: e?.message }); }
});

cron.schedule('0 3 * * *', async () => {
  try {
    const { count } = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    if (count > 0) logger.info('CRON: pruned expired refresh tokens', { count });
  } catch (e: any) { logger.error('CRON: refresh token pruning failed', { error: e?.message }); }
});

// ─── TELEMETRY ─────────────────────────────────────────────────────────────
import { apiUsageMiddleware } from './middleware/telemetry.middleware';
app.use(apiUsageMiddleware);

// ─── DEV ROUTES (bypass maintenance, high rate limit) ────────────────────────
app.use('/api/dev', devLimiter, devRoutes);

// ─── MAINTENANCE GUARD ──────────────────────────────────────────────────────
import { maintenanceMiddleware } from './middleware/maintenance.middleware';
import { subscriptionGuard } from './middleware/subscription.middleware';
app.use(maintenanceMiddleware);
app.use(subscriptionGuard);

let isBooted = false;

// ─── STARTUP PROTOCOL ───────────────────────────────────────────────────────
const runStartupTasks = async () => {
  isBooted = true; // Set to true immediately to allow health check to pass while background tasks finish
  
  try {
    const { execSync } = require('child_process');
    
    // 1. Database Migrations moved to build time (render.yaml)
    
    const shouldRunSetup = process.env.NODE_ENV === 'production' && !process.env.SETUP_COMPLETE;
    
    if (shouldRunSetup) {
      logger.info('Startup 2/4: Initializing system records');
      require('./scripts/setup');

      logger.info('Startup 3/4: Running data optimization scripts');
      require('./scripts/update_roles_and_depts');
    } else {
      logger.info('Startup: Skipping setup scripts (dev mode or SETUP_COMPLETE is set)');
    }

    logger.info('Startup 4/4: Synchronizing target telemetry');
    const activeOrgs = await prisma.organization.findMany({ where: { isSuspended: false }, select: { id: true } });
    for (const org of activeOrgs) {
      await TargetService.syncAllTargets(org.id);
    }

    logger.info('Nexus HRM Core fully operational', { version: APP_VERSION });
  } catch (err: any) {
    logger.error('Background startup encountered issues', { error: err.message });
  }
};

// ─── ROUTES ─────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ 
      status: isBooted ? 'UP' : 'BOOTING', 
      database: 'CONNECTED',
      version: APP_VERSION, 
      bootComplete: isBooted,
      nodeEnv: process.env.NODE_ENV 
    });
  } catch (err: any) {
    logger.error('Health check failed', { error: err.message });
    return res.status(503).json({ 
      status: 'DEGRADED', 
      database: 'DISCONNECTED',
      error: err.message 
    });
  }
});




app.get('/', (_req: Request, res: Response) => res.json({ message: '🚀 HRM Core Engine Running', version: APP_VERSION, status: isBooted ? 'READY' : 'BOOTING' }));

import debugRoutes from './routes/debug.routes';
app.use('/api/debug-env', debugRoutes);

// Startup Sync deferred to after port binding to ensure deploy stability

app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/sub-units', subUnitRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', userRoutes); 
app.use('/api/appraisals', appraisalRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/orgchart', orgchartRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/export', exportLimiter, exportRoutes);
app.use('/api/it', itadminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/settings', require('./routes/settings.routes').default);
app.use('/api/maintenance', require('./routes/maintenance.routes').default);
app.use('/api/compensation', compensationRoutes);
app.use('/api/enterprise', enterpriseRoutes);
app.use('/api/performance-v2', performanceV2Routes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/erp', erpIntegrationRoutes);
app.use('/api/v1/erp', erpIntegrationRoutes); // backward-compat alias





// ─── 404 HANDLER (DEBUG) ──────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  logger.warn('404 route not found', { method: req.method, path: req.path });
  res.status(404).json({
    error: 'Route not found',
    requestedPath: req.path,
    requestedMethod: req.method,
    version: APP_VERSION
  });
});

// ─── ERROR HANDLER ──────────────────────────────────────────────────────────
import { errorLogger } from './services/error-log.service';

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorLogger.log('GlobalErrorHandler', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ─── START ──────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', async () => {
  logger.info('Nexus HRM listening', { port: PORT, version: APP_VERSION });
  
  // Initialize internal services
  SchedulerService.init();

  // Trigger background startup tasks
  runStartupTasks();
});
