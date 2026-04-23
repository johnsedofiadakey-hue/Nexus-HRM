import React from 'react';
import { getStoredUser, getRankFromRole } from '../../utils/session';

// Direct, static imports for speed and reliability
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
    } catch (e) {
        console.error('[DashboardRouter] Critical Session Error:', e);
    }

    const renderDashboard = () => {
        try {
            if (rank >= 90) return <MDDashboard />;
            if (rank >= 80) return <DirectorDashboard />;
            if (rank >= 70) return <ManagerDashboard />;
            if (rank >= 60) return <MidManagerDashboard />;
            if (rank >= 50) return <EmployeeDashboard />;
            return <CasualDashboard />;
        } catch (err) {
            console.error('[DashboardRouter] Render Crash:', err);
            return <div className="p-8 text-rose-500 font-bold">Intelligence Console Sync Error. Please reload.</div>;
        }
    };

    return (
        <div className="w-full h-full min-h-[400px]">
            {renderDashboard()}
        </div>
    );
};

export default DashboardRouter;


