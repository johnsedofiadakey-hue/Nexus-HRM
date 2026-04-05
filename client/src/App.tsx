import React, { lazy, Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import CommandPalette from './components/layout/CommandPalette';
import PageErrorBoundary from './components/layout/PageErrorBoundary';
import ChunkErrorBoundary from './components/common/ChunkErrorBoundary';
import AnnouncementBanner from './components/dashboard/AnnouncementBanner';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useTranslation } from 'react-i18next';
import './i18n';
import { Shield, HelpCircle } from 'lucide-react';
import { cn } from './utils/cn';
import FirstRunWelcome from './components/layout/FirstRunWelcome';
import CoreGuide from './components/layout/CoreGuide';
import TopHeader from './components/layout/TopHeader';
import MobileNav from './components/layout/MobileNav';
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
const AnnouncementManager = lazy(() => import('./pages/announcements/AnnouncementManager'));
const TenantManagement = lazy(() => import('./pages/dev/TenantManagement'));
const Profile = lazy(() => import('./pages/Profile'));
const StrategicGoalBuilder = lazy(() => import('./pages/performance/StrategicGoalBuilder'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const EnterpriseSuite = lazy(() => import('./pages/EnterpriseSuite'));
const ITAdmin = lazy(() => import('./pages/ITAdmin'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const FinalVerdict = lazy(() => import('./pages/FinalVerdict'));
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

const Layout = () => {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
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
          <TopHeader onMenuClick={() => setIsSidebarOpen(true)} isCollapsed={isCollapsed} />
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
import DynamicFavicon from './components/layout/DynamicFavicon';

const AppContent = () => {
  const { settings } = useTheme();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (settings?.defaultLanguage) {
      i18n.changeLanguage(settings.defaultLanguage);
      document.documentElement.lang = settings.defaultLanguage;
    }
    // Dynamic Document Title for White-Labeling
    const baseTitle = settings?.companyName || 'Corporate Portal';
    document.title = `${baseTitle} | Personnel Operations`;
  }, [settings?.defaultLanguage, settings?.companyName, i18n]);

  return (
    <BrowserRouter>
      <DynamicFavicon />
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
            <Route path="/reviews/final" element={<RoleGuard minRank={80}><FinalVerdict /></RoleGuard>} />
            <Route path="/reviews/cycles" element={<RoleGuard minRank={80}><CycleManagement /></RoleGuard>} />

            <Route path="/leave" element={<Leave />} />
            <Route path="/appraisals" element={<Navigate to="/reviews/my" replace />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/employees/history" element={<EmployeeHistory />} />
            <Route path="/employees/:id" element={<EmployeeProfile />} />
            <Route path="/assets" element={<AssetManagement />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/departments" element={<DepartmentManagement />} />
            <Route path="/settings" element={<RoleGuard minRank={80}>{getStoredUser()?.role === 'HR_MANAGER' ? <Navigate to="/dashboard" replace /> : <SettingsHub />}</RoleGuard>} />
            <Route path="/company-settings" element={<Navigate to="/settings" replace />} />
            <Route path="/performance/strategic" element={<RoleGuard minRank={80}><StrategicGoalBuilder /></RoleGuard>} />
            <Route path="/performance/calibration" element={<RoleGuard minRank={70}><CalibrationView /></RoleGuard>} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/finance" element={<FinanceHub />} />
            <Route path="/attendance" element={<AttendanceDashboard />} />
            <Route path="/org-chart" element={<OrgChart />} />
            <Route path="/enterprise" element={<EnterpriseSuite />} />
            <Route path="/it-admin" element={<ITAdmin />} />
            <Route path="/training" element={<Training />} />
            <Route path="/holidays" element={<HolidayCalendar />} />
            <Route path="/dev/dashboard" element={<DevDashboard />} />
            <Route path="/dev/tenants" element={<TenantManagement />} />
            <Route path="/saas/billing" element={<SubscriptionPage />} />
            <Route path="/announcements" element={<AnnouncementManager />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/offboarding" element={<Offboarding />} />
            <Route path="/recruitment" element={<Recruitment />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/support" element={<Support />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </PageErrorBoundary>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

