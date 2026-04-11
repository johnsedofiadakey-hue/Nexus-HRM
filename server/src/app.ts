import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cron from 'node-cron';
import prisma from './prisma/client';
import * as maintenanceService from './services/maintenance.service';
import { accrueLeaveBalances } from './services/leave-balance.service';
import { sendAppraisalReminders, sendLeaveReminders } from './services/reminder.service';
import { initWebSocket } from './services/websocket.service';
import { TargetService } from './services/target.service';
import { SchedulerService } from './services/scheduler.service';
import { generalLimiter, exportLimiter, devLimiter } from './middleware/rate-limit.middleware';
import { xssSanitizer } from './middleware/xss-sanitizer.middleware';

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

dotenv.config();

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

const app: Application = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Create HTTP server (needed for WebSocket)
const server = http.createServer(app);

// Init WebSocket
initWebSocket(server);

// ─── CRON JOBS ─────────────────────────────────────────────────────────────
cron.schedule('0 */12 * * *', async () => {
  console.log('[CRON] Running backup...');
  try { await maintenanceService.runBackup(); } catch (e) { console.error('[CRON] Backup failed:', e); }
});

cron.schedule('0 2 * * *', async () => {
  try { const n = await accrueLeaveBalances(); if (n) console.log(`[CRON] Accrued leave for ${n} users`); }
  catch (e) { console.error('[CRON] Leave accrual failed:', e); }
});

cron.schedule('0 8 * * *', async () => {
  try {
    const [leaves, appraisals] = await Promise.all([sendLeaveReminders(), sendAppraisalReminders()]);
    if (leaves || appraisals) console.log(`[CRON] Reminders: ${leaves} leave, ${appraisals} appraisals`);
  } catch (e) { console.error('[CRON] Reminder sweep failed:', e); }
});

// ─── FORCE-FLOW CORS BRIDGE (Entry Point) ──────────────────────────────────
app.use(cors({
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
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-dev-master-key']
}));

// Handle Preflight Circuit Breaker
app.options('*', cors() as any);

// ─── STANDARD SECURITY (Below CORS Bridge) ──────────────────────────────────

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

// ─── ROUTES ─────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    // Perform a shallow DB check
    await prisma.$queryRaw`SELECT 1`;
    
    return res.json({ 
      status: 'UP', 
      database: 'CONNECTED',
      version: '2.1.5-PROD-READY', 
      buildTime: new Date().toISOString(), 
      nodeEnv: process.env.NODE_ENV 
    });
  } catch (err: any) {
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
  const routes: any[] = [];
  function print(path: any, layer: any) {
    if (layer.route) {
      layer.route.stack.forEach((s: any) => routes.push({ path: path + layer.route.path, method: s.method.toUpperCase() }));
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach((s: any) => print(path + (layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^', '').replace('\\/', '/')), s));
    }
  }
  app._router.stack.forEach((l: any) => print('', l));
  res.json(routes.filter(r => r.path !== ''));
});

app.get('/', (_req: Request, res: Response) => res.json({ message: '🚀 HRM Core Engine Running', version: '2.0.1' }));

import debugRoutes from './routes/debug.routes';
app.use('/api/debug-env', debugRoutes);

// ─── STARTUP SYNC ───────────────────────────────────────────────────────────
(async () => {
  try {
    const { TargetService } = await import('./services/target.service');
    // 🎯 Target Progress Sync
    await TargetService.syncAllTargets('default-tenant');
  } catch (err) {
    console.error('[Startup] Sync failed:', err);
  }
})();

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
app.use('/api/employees', userRoutes); // alias for frontend
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

// ─── DEBUG ROUTE ────────────────────────────────────────────────────────────
(app as any).get('/api/debug-routes', (req: Request, res: Response) => {
  const routes: any[] = [];
  (app as any)._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({ path: middleware.route.path, methods: Object.keys(middleware.route.methods) });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
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
app.use((req: Request, res: Response) => {
  console.log(`[404] ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    requestedPath: req.path,
    requestedMethod: req.method,
    version: '2.1.2'
  });
});

// ─── ERROR HANDLER ──────────────────────────────────────────────────────────
import { errorLogger } from './services/error-log.service';

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorLogger.log('GlobalErrorHandler', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// ─── START ──────────────────────────────────────────────────────────────────
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🚀 Nexus HRM v2.0 running on http://0.0.0.0:${PORT}`);
  console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}/ws`);
  console.log(`📊 API Docs: http://0.0.0.0:${PORT}/\n`);
  
  // Start Scheduler
  SchedulerService.init();
});

