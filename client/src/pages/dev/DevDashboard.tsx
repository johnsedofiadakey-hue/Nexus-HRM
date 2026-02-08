import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, Shield, Database, Activity, RefreshCw, Lock } from 'lucide-react';

const DevDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [killSwitchActive, setKillSwitchActive] = useState(false);

    const devKey = localStorage.getItem('nexus_dev_key');

    useEffect(() => {
        if (!devKey) navigate('/nexus-dev-portal');
        else fetchStats();
    }, [devKey]);

    const fetchStats = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/dev/stats', {
                headers: { 'x-dev-master-key': devKey || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                setKillSwitchActive(data.settings?.isMaintenanceMode || false);
            } else {
                // If unauthorized, kick out
                if (res.status === 403) navigate('/nexus-dev-portal');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleKillSwitch = async () => {
        if (!window.confirm("WARNING: This will lockout ALL users. Are you sure?")) return;
        try {
            const res = await fetch('http://localhost:5000/api/dev/kill-switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-dev-master-key': devKey || ''
                },
                body: JSON.stringify({ active: !killSwitchActive })
            });
            if (res.ok) {
                setKillSwitchActive(!killSwitchActive);
            } else {
                alert("Failed to toggle kill switch");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const triggerBackup = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/dev/backup', {
                method: 'POST',
                headers: { 'x-dev-master-key': devKey || '' }
            });
            if (res.ok) alert("Backup Started Successfully");
            else alert("Backup Failed");
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Core...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 p-8 font-mono">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-12 flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                    <Shield className="text-red-500 w-10 h-10" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Shadow Command</h1>
                        <p className="text-xs text-slate-500">Autonomous System Control</p>
                    </div>
                </div>
                <button
                    onClick={() => { localStorage.removeItem('nexus_dev_key'); navigate('/'); }}
                    className="text-white hover:text-red-500 text-sm font-bold"
                >
                    Disconnect
                </button>
            </div>

            <div className="max-w-6xl mx-auto space-y-8">

                {/* KILL SWITCH */}
                <div className={`p-8 rounded-2xl border-2 transition-all ${killSwitchActive ? 'bg-red-950/20 border-red-600' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <Power className={killSwitchActive ? 'text-red-500' : 'text-green-500'} size={32} />
                                System Lockdown
                            </h2>
                            <p className="text-slate-400">
                                {killSwitchActive
                                    ? "SYSTEM IS LOCKED. Only Dev Access is permitted."
                                    : "System is running normally. All users have access."}
                            </p>
                        </div>
                        <button
                            onClick={toggleKillSwitch}
                            className={`px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${killSwitchActive
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                                }`}
                        >
                            {killSwitchActive ? 'DEACTIVATE LOCKDOWN' : 'ACTIVATE KILL SWITCH'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* BACKUPS */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-4 text-white">
                            <Database className="text-blue-500" />
                            <h3 className="font-bold text-lg">Data Persistence</h3>
                        </div>
                        <p className="text-sm mb-6">Database Location: Local PostgreSQL</p>
                        <button
                            onClick={triggerBackup}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-700"
                        >
                            <RefreshCw size={16} /> Force Backup Now
                        </button>
                    </div>

                    {/* HEALTH */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                        <div className="flex items-center gap-3 mb-4 text-white">
                            <Activity className="text-green-500" />
                            <h3 className="font-bold text-lg">System Health</h3>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span>Status</span>
                                <span className="text-green-400 font-bold">{stats?.health?.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Uptime</span>
                                <span className="text-white">{stats?.health?.uptime}s</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Memory (Heap)</span>
                                <span className="text-white">{stats?.health?.memory?.heapUsed}</span>
                            </div>
                        </div>
                    </div>

                    {/* CONFIG */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl cursor-not-allowed opacity-50">
                        <div className="flex items-center gap-3 mb-4 text-white">
                            <Lock className="text-amber-500" />
                            <h3 className="font-bold text-lg">Secret Keys</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Paystack & API Keys are currently managed via Environment Variables.</p>
                        <button disabled className="w-full bg-slate-850 text-slate-600 py-2 rounded-lg text-sm font-bold">view .env (Locked)</button>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default DevDashboard;
