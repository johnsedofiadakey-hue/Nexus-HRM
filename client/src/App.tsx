import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import { ThemeProvider } from './context/ThemeContext';
import { Menu } from 'lucide-react';

// Eager-loaded (always needed)
import Login from './pages/Login';
import DevDashboard from './pages/dev/DevDashboard'; // Moved from lazy-loaded
import BillingLock from './pages/BillingLock';

// Lazy-loaded for performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Performance = lazy(() => import('./pages/Performance'));
const TeamReview = lazy(() => import('./pages/TeamReview'));
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
const Onboarding = lazy(() => import('./pages/Onboarding'));
const ITAdmin = lazy(() => import('./pages/ITAdmin'));
const DevLogin = lazy(() => import('./pages/dev/DevLogin'));
// DevDashboard is now eager-loaded

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
  </div>
);

// FIX: Proper auth guard
const ProtectedRoute = () => {
  const token = localStorage.getItem('nexus_token');
  if (!token) return <Navigate to="/" replace />;
  return <Layout />;
};

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    // Close sidebar on route change automatically for mobile
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen main-glow-bg relative">
      {/* Mobile Top Navigation */}
      <div className={`lg:hidden fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-[#0a0f1e]/90 backdrop-blur-md border-b border-white/5 shadow-xl' : 'bg-transparent'}`}>
        <div className="flex items-center justify-between px-6 h-20">
          <h1 className="text-[14px] font-black tracking-widest text-white uppercase font-display leading-tight flex flex-col">
            NEXUS <span className="text-[9px] font-black tracking-[0.3em] text-primary-light decoration-primary underline decoration-2 underline-offset-4">HRM OS</span>
          </h1>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 lg:ml-72 mt-20 lg:mt-0 p-4 md:p-8 lg:p-10 max-w-full overflow-x-hidden">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/billing/lock" element={<BillingLock />} />
          <Route path="/nexus-dev-portal" element={<Suspense fallback={<PageLoader />}><DevLogin /></Suspense>} />
          <Route path="/nexus-dev-portal/dashboard" element={<DevDashboard />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dev" element={<DevDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/team" element={<TeamReview />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/appraisals" element={<Appraisals />} />
            <Route path="/manager-appraisals" element={<ManagerAppraisals />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/employees/:id" element={<EmployeeProfile />} />
            <Route path="/employees/:employeeId/history" element={<EmployeeHistory />} />
            <Route path="/assets" element={<AssetManagement />} />
            <Route path="/cycles" element={<CycleManagement />} />
            <Route path="/settings" element={<AdminSettings />} />
            <Route path="/departments" element={<DepartmentManagement />} />
            <Route path="/audit" element={<AuditLogs />} />
            {/* NEW ROUTES */}
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/finance" element={<FinanceHub />} />
            <Route path="/attendance" element={<AttendanceDashboard />} />
            <Route path="/orgchart" element={<OrgChart />} />
            <Route path="/training" element={<Training />} />
            <Route path="/holidays" element={<HolidayCalendar />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/it-admin" element={<ITAdmin />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
