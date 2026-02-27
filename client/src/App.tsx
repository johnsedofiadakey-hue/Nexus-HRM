import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import { ThemeProvider } from './context/ThemeContext';

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

const Layout = () => (
  <div className="flex min-h-screen main-glow-bg">
    <Sidebar />
    <div className="flex-1 ml-72 p-10 max-w-full overflow-x-hidden">
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </div>
  </div>
);

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
