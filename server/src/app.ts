import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cron from 'node-cron'; // Fixed
import { PrismaClient } from '@prisma/client';
import prisma from './prisma/client';
import * as maintenanceService from './services/maintenance.service'; // Fixed

// Import Route Files
import authRoutes from './routes/auth.routes';
import kpiRoutes from './routes/kpi.routes';
import teamRoutes from './routes/team.routes';
import leaveRoutes from './routes/leave.routes';
import cycleRoutes from './routes/cycle.routes';
import userRoutes from './routes/user.routes';
import appraisalRoutes from './routes/appraisal.routes';
import historyRoutes from './routes/history.routes';
import assetRoutes from './routes/asset.routes';
import auditRoutes from './routes/audit.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// --- CRON JOBS ---
// Run backup every 12 hours
cron.schedule('0 */12 * * *', async () => {
  console.log('Running scheduled 12-hour backup...');
  try {
    await maintenanceService.runBackup();
    console.log('Backup completed successfully.');
  } catch (error) {
    console.error('Scheduled backup failed:', error);
  }
});

// --- Middlewares ---
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve uploads
app.use(morgan('dev'));

// 7. DEV ROUTES (Bypass Maintenance)
import devRoutes from './routes/dev.routes';
app.use('/api/dev', devRoutes);

// 8. GLOBAL MAINTENANCE GUARD
import { maintenanceMiddleware } from './middleware/maintenance.middleware';
app.use(maintenanceMiddleware);

// --- ROUTES ---

// 1. Health Check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: "Nexus HRM Engine is Running" });
});

// 2. MOUNT API ROUTES
// (Order matters: Auth first, then functional routes)
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appraisals', appraisalRoutes); // <--- ADDED
app.use('/api/history', historyRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', require('./routes/settings.routes').default);
app.use('/api/maintenance', require('./routes/maintenance.routes').default);

// 3. DIRECT DEBUG ROUTE (Fallback for testing)
app.get('/api/debug-sheets', async (req: Request, res: Response) => {
  try {
    const sheets = await prisma.kpiSheet.findMany({
      include: { employee: true },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[DEBUG] Found ${sheets.length} sheets`);
    res.json(sheets);
  } catch (error) {
    console.error("[DEBUG] Error fetching sheets:", error);
    res.status(500).json({ error: "Debug fetch failed" });
  }
});

// --- Error Handling ---
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] ${err.message}`);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// --- Server Start ---
const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`\n🚀 Nexus HRM Engine running on http://localhost:${PORT}`);
      console.log(`👉 Debug List URL: http://localhost:${PORT}/api/debug-sheets\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();