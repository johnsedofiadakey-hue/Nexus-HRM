import React from 'react';
import CasualDashboard from '../../pages/dashboards/CasualDashboard';

const DashboardRouter: React.FC = () => {
    console.log('[DashboardRouter] FORCE RENDERING CASUAL DASHBOARD');
    return <CasualDashboard />;
};

export default DashboardRouter;

