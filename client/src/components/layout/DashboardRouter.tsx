import React from 'react';
import CasualDashboard from '../../pages/dashboards/CasualDashboard';

const DashboardRouter: React.FC = () => {
    return (
        <div className="p-10 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
            <h1 className="text-2xl font-black text-rose-500">ROUTING BYPASS ACTIVE</h1>
            <p className="text-sm font-bold text-rose-500/60 mt-2">If you see this, the dashboard components themselves are causing the hang. If you see a spinner, the issue is in App.tsx or Layout.tsx.</p>
        </div>
    );
};


export default DashboardRouter;

