import React, { lazy, Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import CommandPalette from './components/layout/CommandPalette';
import PageErrorBoundary from './components/layout/PageErrorBoundary';
import ChunkErrorBoundary from './components/common/ChunkErrorBoundary';
import AnnouncementBanner from './components/dashboard/AnnouncementBanner';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AIProvider } from './context/AIContext';
import { useTranslation } from 'react-i18next';
import './i18n';
import { Shield, HelpCircle, Clock } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';
import { useAI } from './context/AIContext';
import FirstRunWelcome from './components/layout/FirstRunWelcome';
import CoreGuide from './components/layout/CoreGuide';
import TopHeader from './components/layout/TopHeader';
import MobileNav from './components/layout/MobileNav';
import NexusAIInsight from './components/layout/NexusAIInsight';
import { getLogoUrl } from './utils/logo';
import { getStoredUser, getRankFromRole } from './utils/session';

// Eager-loaded (always needed)
import Login from './pages/Login';
import DevDashboard from './pages/dev/DevDashboard';
import BillingLock from './pages/BillingLock';

const ForceLogout = () => {
  localStorage.removeItem('nexus_auth_token');
  localStorage.removeItem('nexus_refresh_token');
  localStorage.removeItem('nexus_user');
  sessionStorage.clear();
  // Redirect to login after clearing
  window.location.replace('/');
  return null;
};

// Lazy-loaded for performance
const DashboardRouter = lazy(() => import('./components/layout/DashboardRouter'));
const Leave = lazy(() => import('./pages/Leave'));
const Appraisals = lazy(() => import('./pages/Appraisals'));
const EmployeeManagement = lazy(() => import('./pages/EmployeeManagement'));
const EmployeeHistory = lazy(() => import('./pages/EmployeeHistory'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const ManagerAppraisals = lazy(() => import('./pages/ManagerAppraisals'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const DepartmentManagement = lazy(() => import('./pages/DepartmentManagement'));
const CycleManagement = lazy(() => import('./pages/CycleManagement'));
const Payroll = lazy(() => import('./pages/Payroll'));
const FinanceHub = lazy(() => import('./pages/FinanceHub'));
const AttendanceDashboard = lazy(() => import('./pages/AttendanceDashboard'));
const OrgChart = lazy(() => import('./pages/OrgChart'));
const Training = lazy(() => import('./pages/Training'));
const HolidayCalendar = lazy(() => import('./pages/HolidayCalendar'));
const DevLogin = lazy(() => import('./pages/dev/DevLogin'));
const DeptKpiPage = lazy(() => import('./pages/kpi/DepartmentKPI'));
const MDKpiView = lazy(() => import('./pages/kpi/MDKpiView'));
const MyTargetsPage = lazy(() => import('./pages/performance/TargetDashboard'));
const AnnouncementsPage = lazy(() => import('./pages/Announcements'));
const TenantManagement = lazy(() => import('./pages/dev/TenantManagement'));
const Profile = lazy(() => import('./pages/Profile'));
const StrategicGoalBuilder = lazy(() => import('./pages/performance/StrategicGoalBuilder'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const EnterpriseSuite = lazy(() => import('./pages/EnterpriseSuite'));
const ITAdmin = lazy(() => import('./pages/ITAdmin'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const FinalSignOff = lazy(() => import('./pages/FinalSignOff'));
const AppraisalPacketView = lazy(() => import('./pages/performance/AppraisalPacketView'));
const CalibrationView = lazy(() => import('./pages/performance/CalibrationView'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Support = lazy(() => import('./pages/Support'));
const Offboarding = lazy(() => import('./pages/Offboarding'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64 bg-[var(--bg-main)]">
    <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
  </div>
);

const ProtectedRoute = () => {
  const token = localStorage.getItem('nexus_auth_token');
  if (!token) return <Navigate to="/" replace />;
  return <Layout />;
};

const AdminGuard = () => {
  const devKey = localStorage.getItem('nexus_dev_key');

  // Must have unlocked the Vault (Master Key)
  if (!devKey) return <Navigate to="/dev-login" replace />;

  return <Outlet />;
};

const Layout = () => {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { isOpen: isAIOpen, setIsOpen: setIsAIOpen } = useAI();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const userStr = localStorage.getItem('nexus_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isImpersonating = user?.isImpersonating;

  const handleExitImpersonation = () => {
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('nexus_user');
    window.location.href = '/dev-login';
  };

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const { settings } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-main)] !bg-[var(--bg-main)] text-[var(--text-primary)] font-body selection:bg-[var(--primary)]/30">
      {/* GLOBAL PRINT HEADER (Visible only on print) */}
      <div className="hidden print:block mb-10 border-b-2 border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) && (
              <img src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} alt="Logo" className="w-16 h-16 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900">{settings?.companyName || 'OFFICIAL RECORD'}</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{settings?.subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">{t('common.official_document', 'Official Document')}</p>
            <p className="text-[9px] font-bold text-slate-300">{t('common.generated_on', 'Generated on')} {new Date().toLocaleDateString(i18n.language)}</p>
          </div>
        </div>
      </div>

      <CommandPalette />
      <CoreGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <FirstRunWelcome />
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black py-2 px-4 flex justify-between items-center font-black uppercase tracking-widest text-[10px]">
          <div className="flex items-center gap-2">
            <Shield size={14} />
            <span>Impersonation Mode Active: Viewing as {user.name} ({user.organizationId})</span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="bg-black text-amber-500 px-4 py-1 rounded-full hover:bg-black/80 transition-all font-bold"
          >
            Exit Session
          </button>
        </div>
      )}
      <AnnouncementBanner />
      <div className="flex bg-[var(--bg-main)]">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        <div className={cn(
          "flex-1 flex flex-col min-h-screen transition-[margin] duration-300",
          isCollapsed ? "lg:ml-20" : "lg:ml-[280px]"
        )}>
          <TopHeader 
            onMenuClick={() => setIsSidebarOpen(true)} 
            isCollapsed={isCollapsed} 
          />
          <main className={cn(
            "flex-1 relative p-4 transition-none overflow-x-hidden pt-24",
            "lg:p-10 lg:pt-28", 
            isImpersonating && "mt-12"
          )}>
            <div className="max-w-[1600px] mx-auto pb-24 lg:pb-0">
              <ChunkErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </ChunkErrorBoundary>
            </div>

            {/* Help FAB */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsHelpOpen(true)}
              className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-2xl bg-[var(--primary)] text-[var(--text-inverse)] shadow-lg flex items-center justify-center border border-white/10 transition-all"
            >
              <HelpCircle size={24} />
            </motion.button>
          </main>
        </div>
      </div>
      <MobileNav />
      <NexusAIInsight 
        isOpen={isAIOpen} 
        onClose={() => setIsAIOpen(false)} 
      />
    </div>
  );
};

const RoleGuard = ({ children, minRank }: { children: React.ReactNode; minRank: number }) => {
  const user = getStoredUser();
  const rank = getRankFromRole(user?.role);
  if (rank < minRank) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const SettingsHub = lazy(() => import('./pages/SettingsHub'));
// DynamicFavicon removed - controlled by ThemeContext directly

const AppContent = () => {
  const { settings } = useTheme();
  useTranslation(); // Still initialized for core translation loading if needed

  useEffect(() => {
    // Legacy Token Cleanup: Standardizing on nexus_* prefix
    const legacyKeys = ['app_auth_token', 'app_refresh_token', 'user_session'];
    legacyKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`[Session] Cleaning up legacy key: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }, []);

  useEffect(() => {
    // Dynamic Document Title for White-Labeling
    const baseTitle = settings?.companyName || 'MC Bauchemie Personnel';
    document.title = `${baseTitle} | Personnel Operations`;
  }, [settings?.companyName]);

  // ─── 2-HOUR IDLE TIMER (Enterprise Security Dominion) ─────────────────────
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const IDLE_LIMIT = (2 * 60 * 60 - 60) * 1000; // 1h 59m in ms
  const WARNING_LIMIT = 60 * 1000; // 60s warning

  useEffect(() => {
    const token = localStorage.getItem('nexus_auth_token');
    if (!token) return;

    let warningTimer: any;
    let logoutTimer: any;
    let countdownInterval: any;

    const resetTimers = () => {
      setShowTimeoutWarning(false);
      setRemainingSeconds(60);
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownInterval) clearInterval(countdownInterval);

      warningTimer = setTimeout(() => {
        setShowTimeoutWarning(true);
        countdownInterval = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, IDLE_LIMIT);

      logoutTimer = setTimeout(() => {
        handleGlobalLogout();
      }, IDLE_LIMIT + WARNING_LIMIT);
    };

    const handleGlobalLogout = () => {
      localStorage.removeItem('nexus_auth_token');
      localStorage.removeItem('nexus_refresh_token');
      localStorage.removeItem('nexus_user');
      window.location.replace('/?reason=timeout');
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetTimers));
    resetTimers();

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, resetTimers));
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []);

  return (
    <>
      {/* Favicon controlled by ThemeContext */}

      {/* Session Timeout Warning Overlay */}
      <AnimatePresence>
        {showTimeoutWarning && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--primary)]/30 rounded-[2.5rem] p-10 shadow-2xl text-center relative overflow-hidden"
            >
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]/10">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 60, ease: 'linear' }}
                  className="h-full bg-[var(--primary)]"
                />
              </div>

              <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                <Clock size={32} className="animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">Session Expiring</h2>
              <p className="text-sm text-[var(--text-muted)] font-medium mb-8">
                Your session will terminate in <span className="text-[var(--primary)] font-black">{remainingSeconds}s</span> due to corporate security protocols.
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    // Triggers the activity listener
                    window.dispatchEvent(new Event('mousedown'));
                  }}
                  className="bg-[var(--primary)] text-white w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform"
                >
                  Stay Connected
                </button>
                <button 
                  onClick={() => window.location.replace('/?reason=logout')}
                  className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                >
                  Logout Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PageErrorBoundary>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/force-logout" element={<ForceLogout />} />
          <Route path="/dev-login" element={<Suspense fallback={<PageLoader />}><DevLogin /></Suspense>} />
          <Route path="/billing-lock" element={<BillingLock />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardRouter />} />
            {/* Performance/KPI Module - Strict Routing */}
            <Route path="/kpi/department" element={<RoleGuard minRank={80}><DeptKpiPage /></RoleGuard>} />
            <Route path="/kpi/executive" element={<RoleGuard minRank={80}><MDKpiView /></RoleGuard>} />
            <Route path="/kpi/team" element={<RoleGuard minRank={70}><MyTargetsPage /></RoleGuard>} />
            <Route path="/kpi/my-targets" element={<RoleGuard minRank={10}><MyTargetsPage /></RoleGuard>} />
            
            {/* Appraisal Module - Strict Routing */}
            <Route path="/reviews/my" element={<RoleGuard minRank={10}><Appraisals /></RoleGuard>} />
            <Route path="/reviews/team" element={<RoleGuard minRank={70}><ManagerAppraisals /></RoleGuard>} />
            <Route path="/reviews/packet/:packetId" element={<RoleGuard minRank={10}><AppraisalPacketView /></RoleGuard>} />
            <Route path="/reviews/final" element={<RoleGuard minRank={80}><FinalSignOff /></RoleGuard>} />
            <Route path="/reviews/cycles" element={<RoleGuard minRank={80}><CycleManagement /></RoleGuard>} />

            <Route path="/leave" element={<Leave />} />
            <Route path="/appraisals" element={<Navigate to="/reviews/my" replace />} />
            <Route path="/employees" element={<RoleGuard minRank={70}><EmployeeManagement /></RoleGuard>} />
            <Route path="/employees/history" element={<RoleGuard minRank={70}><EmployeeHistory /></RoleGuard>} />
            <Route path="/employees/:id" element={<EmployeeProfile />} />
            <Route path="/assets" element={<AssetManagement />} />
            <Route path="/audit" element={<RoleGuard minRank={90}><AuditLogs /></RoleGuard>} />
            <Route path="/departments" element={<DepartmentManagement />} />
            <Route path="/settings" element={<RoleGuard minRank={90}><SettingsHub /></RoleGuard>} />
            <Route path="/company-settings" element={<Navigate to="/settings" replace />} />
            <Route path="/performance/strategic" element={<RoleGuard minRank={80}><StrategicGoalBuilder /></RoleGuard>} />
            <Route path="/performance/calibration" element={<RoleGuard minRank={70}><CalibrationView /></RoleGuard>} />
            <Route path="/payroll" element={<RoleGuard minRank={85}><Payroll /></RoleGuard>} />
            <Route path="/finance" element={<FinanceHub />} />
            <Route path="/attendance" element={<AttendanceDashboard />} />
            <Route path="/org-chart" element={<RoleGuard minRank={85}><OrgChart /></RoleGuard>} />
            <Route path="/enterprise" element={<RoleGuard minRank={90}><EnterpriseSuite /></RoleGuard>} />
            <Route path="/it-admin" element={<RoleGuard minRank={80}><ITAdmin /></RoleGuard>} />
            <Route path="/training" element={<Training />} />
            <Route path="/holidays" element={<HolidayCalendar />} />
            <Route path="/saas/billing" element={<SubscriptionPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/onboarding" element={<RoleGuard minRank={85}><Onboarding /></RoleGuard>} />
            <Route path="/offboarding" element={<RoleGuard minRank={85}><Offboarding /></RoleGuard>} />
            <Route path="/recruitment" element={<RoleGuard minRank={85}><Recruitment /></RoleGuard>} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/support" element={<Support />} />
          </Route>

          {/* Nexus Master Console - Completely Isolated SaaS Logic */}
          <Route path="/nexus-master-console" element={<Suspense fallback={<PageLoader />}><AdminGuard /></Suspense>}>
            <Route index element={<DevDashboard />} />
            <Route path="tenants" element={<TenantManagement />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </PageErrorBoundary>
    </>
  );
};

export default function App() {
  // BUILD_ID: 2026-04-10_18:18Z - FORCE_IDENTITY_SYNC
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AIProvider>
          <AppContent />
        </AIProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

