import React from 'react';
import { getStoredUser, getRankFromRole } from '../../utils/session';

// Direct, static imports for core stability
import MDDashboard from '../../pages/dashboards/MDDashboard';
import DirectorDashboard from '../../pages/dashboards/DirectorDashboard';
import ManagerDashboard from '../../pages/dashboards/ManagerDashboard';
import MidManagerDashboard from '../../pages/dashboards/MidManagerDashboard';
import EmployeeDashboard from '../../pages/dashboards/EmployeeDashboard';
import CasualDashboard from '../../pages/dashboards/CasualDashboard';

/**
 * DashboardRouter
 * 
 * Statically routes users to specialized dashboards based on their role rank.
 * Uses static imports to prevent 'flicker' and 'suspense' hangs during initial mount.
 */
const DashboardRouter: React.FC = () => {
    let rank = 0;
    try {
        const user = getStoredUser();
        rank = getRankFromRole(user?.role);
        console.log('[DashboardRouter] Initializing View for Rank:', rank);
    } catch (e) {
        console.error('[DashboardRouter] Critical Session Error:', e);
    }

    // Rank-based Routing Logic
    // Using static returns to avoid unnecessary computations or re-renders
    if (rank >= 90) return <MDDashboard />;
    if (rank >= 80) return <DirectorDashboard />;
    if (rank >= 70) return <ManagerDashboard />;
    if (rank >= 60) return <MidManagerDashboard />;
    if (rank >= 50) return <EmployeeDashboard />;
    
    // Casual Workers (Rank 40) and Defaults
    return <CasualDashboard />;
};

export default DashboardRouter;
