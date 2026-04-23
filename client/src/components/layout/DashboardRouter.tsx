import React from 'react';
import { getStoredUser, getRankFromRole } from '../../utils/session';

// Eager imports to prevent ChunkLoadErrors in production
import MDDashboard from '../../pages/dashboards/MDDashboard';
import DirectorDashboard from '../../pages/dashboards/DirectorDashboard';
import ManagerDashboard from '../../pages/dashboards/ManagerDashboard';
import MidManagerDashboard from '../../pages/dashboards/MidManagerDashboard';
import EmployeeDashboard from '../../pages/dashboards/EmployeeDashboard';
import CasualDashboard from '../../pages/dashboards/CasualDashboard';

const DashboardRouter: React.FC = () => {
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);

  const renderDashboard = () => {
    // Audit Logging (Internal)
    if (rank >= 90) return <MDDashboard />;
    if (rank >= 80) return <DirectorDashboard />;
    if (rank >= 70) return <ManagerDashboard />;
    if (rank >= 60) return <MidManagerDashboard />;
    if (rank >= 50) return <EmployeeDashboard />;
    return <CasualDashboard />;
  };

  return (
    <div className="w-full h-full min-h-[60vh] animate-in fade-in duration-500">
      {renderDashboard()}
    </div>
  );
};

export default DashboardRouter;

