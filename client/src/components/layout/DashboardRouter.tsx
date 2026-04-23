import React from 'react';
import { getStoredUser, getRankFromRole } from '../../utils/session';

// Direct, static imports
import MDDashboard from '../../pages/dashboards/MDDashboard';
import DirectorDashboard from '../../pages/dashboards/DirectorDashboard';
import ManagerDashboard from '../../pages/dashboards/ManagerDashboard';
import MidManagerDashboard from '../../pages/dashboards/MidManagerDashboard';
import EmployeeDashboard from '../../pages/dashboards/EmployeeDashboard';
import CasualDashboard from '../../pages/dashboards/CasualDashboard';

const DashboardRouter: React.FC = () => {
    let rank = 0;
    try {
        const user = getStoredUser();
        rank = getRankFromRole(user?.role);
        console.log('[DashboardRouter] Session active. Role:', user?.role, 'Rank:', rank);
    } catch (e) {
        console.error('[DashboardRouter] Critical Session Error:', e);
    }

    if (rank >= 90) return <MDDashboard />;
    if (rank >= 80) return <DirectorDashboard />;
    if (rank >= 70) return <ManagerDashboard />;
    if (rank >= 60) return <MidManagerDashboard />;
    if (rank >= 50) return <EmployeeDashboard />;
    
    // Casual / Default
    return <CasualDashboard />;
};

export default DashboardRouter;



