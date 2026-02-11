import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from "./components/layout/Sidebar";
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Performance from './pages/Performance';
import TeamReview from './pages/TeamReview';
import Leave from './pages/Leave';
import Appraisals from './pages/Appraisals';
import EmployeeManagement from './pages/EmployeeManagement';
import EmployeeHistory from './pages/EmployeeHistory';
import EmployeeProfile from './pages/EmployeeProfile';
import ManagerAppraisals from './pages/ManagerAppraisals';
import AssetManagement from './pages/AssetManagement';
import AuditLogs from './pages/AuditLogs';
import DepartmentManagement from './pages/DepartmentManagement';

// 1. Create a Layout Wrapper so the Sidebar only appears after login
const Layout = () => (
  <div className="flex min-h-screen bg-slate-50 font-sans">
    <Sidebar />
    <div className="flex-1 ml-64 p-8">
      <Outlet /> {/* This renders the child route (Dashboard, Performance, etc.) */}
    </div>
  </div>
);

import { ThemeProvider } from './context/ThemeContext';
import AdminSettings from './pages/AdminSettings';
import CycleManagement from './pages/CycleManagement';

import DevLogin from './pages/dev/DevLogin';
import DevDashboard from './pages/dev/DevDashboard';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* --- Public Route (Login) --- */}
          {/* No Sidebar here */}
          <Route path="/" element={<Login />} />

          {/* --- SHADOW DEV PORTAL (Autonomous) --- */}
          <Route path="/nexus-dev-portal" element={<DevLogin />} />
          <Route path="/nexus-dev-portal/dashboard" element={<DevDashboard />} />

          {/* --- Protected Routes (Inside App) --- */}
          {/* These are wrapped in the Layout with the Sidebar */}
          <Route element={<Layout />}>
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
          </Route>

          {/* Fallback: If user types random URL, go to Login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;