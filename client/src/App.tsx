import React, { lazy, Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import CommandPalette from './components/layout/CommandPalette';
import PageErrorBoundary from './components/layout/PageErrorBoundary';
import ChunkErrorBoundary from './components/common/ChunkErrorBoundary';
import AnnouncementBanner from './components/dashboard/AnnouncementBanner';
import { ThemeProvider } from './context/ThemeContext';
import { Shield } from 'lucide-react';
import { cn } from './utils/cn';
import FirstRunWelcome from './components/layout/FirstRunWelcome';
import NexusGuide from './components/layout/NexusGuide';
import TopHeader from './components/layout/TopHeader';
import MobileNav from './components/layout/MobileNav';
import { HelpCircle } from 'lucide-react';
import { getStoredUser, getRankFromRole } from './utils/session';

// Eager-loaded (always needed)
import Login from './pages/Login';
import DevDashboard from './pages/dev/DevDashboard';
import BillingLock from './pages/BillingLock';

// Force-logout: clears all session data and redirects to login
const ForceLogout = () => {
  localStorage.removeItem('nexus_token');
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
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
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
const TeamTargetPage = lazy(() => import('./pages/TeamReview'));
const MyTargetsPage = lazy(() => import('./pages/Performance'));
const AnnouncementManager = lazy(() => import('./pages/announcements/AnnouncementManager'));
const TenantManagement = lazy(() => import('./pages/dev/TenantManagement'));
const CompanySettings = lazy(() => import('./pages/CompanySettings'));
const Profile = lazy(() => import('./pages/Profile'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const EnterpriseSuite = lazy(() => import('./pages/EnterpriseSuite'));
const ITAdmin = lazy(() => import('./pages/ITAdmin'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const FinalVerdict = lazy(() => import('./pages/FinalVerdict'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
  </div>
);

const ProtectedRoute = () => {
  const token = localStorage.getItem('nexus_token');
  if (!token) return <Navigate to="/" replace />;
  return <Layout />;
};

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const userStr = localStorage.getItem('nexus_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isImpersonating = user?.isImpersonating;

  const handleExitImpersonation = () => {
    // To exit: we need to revert to the original admin token.
    // However, for simplicity now, we'll just clear and logout or the user can manual logout.
    // A better way is to store 'original_token' in localStorage.
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    window.location.href = '/dev-login'; // Re-login as dev
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-400 font-sans selection:bg-primary/30">
      <CommandPalette />
      <NexusGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
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
      <div className="flex">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 lg:ml-80 flex flex-col min-h-screen">
          <TopHeader onMenuClick={() => setIsSidebarOpen(true)} />
          <main className={cn("flex-1 relative p-4 lg:p-10 transition-all duration-500 overflow-x-hidden pt-24 lg:pt-28", isImpersonating && "mt-12")}>
            <div className="max-w-[1600px] mx-auto">
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
              className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-2xl bg-primary text-white shadow-[0_10px_40px_rgba(79,70,229,0.4)] flex items-center justify-center border border-white/20 transition-all"
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

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
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
              <Route path="/kpi/team" element={<RoleGuard minRank={70}><TeamTargetPage /></RoleGuard>} />
              <Route path="/kpi/my-targets" element={<RoleGuard minRank={50}><MyTargetsPage /></RoleGuard>} />
              
              {/* Appraisal Module - Strict Routing */}
              <Route path="/reviews/my" element={<RoleGuard minRank={50}><Appraisals /></RoleGuard>} />
              <Route path="/reviews/team" element={<RoleGuard minRank={70}><ManagerAppraisals /></RoleGuard>} />
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
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="/company-settings" element={<CompanySettings />} />
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
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </PageErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}
