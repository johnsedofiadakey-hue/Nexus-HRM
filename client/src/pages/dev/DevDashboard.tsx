import { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import api from '../../services/api';
import { motion } from 'framer-motion';
import {
    Server, HardDrive, Database, ShieldAlert, Clock,
    Settings, Activity, AlertTriangle, ShieldCheck,
    UserCheck, Zap, CheckCircle2
} from 'lucide-react';
import { cn } from '../../utils/cn';

const PlatformConfig = ({ initialStats, onUpdate }: any) => {
    const [monthly, setMonthly] = useState(initialStats?.monthlyPrice || 100);
    const [annual, setAnnual] = useState(initialStats?.annualPrice || 1000);
    const [trials, setTrials] = useState(initialStats?.trialDays || 14);

    const handleUpdate = async (field: string, val: number) => {
        try {
            await api.put('/settings', { [field]: val });
            toast.success('Platform Config Updated');
            onUpdate();
        } catch (err) { toast.error('Update failed'); }
    };

    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 border-primary/20 bg-primary/5">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Settings size={18} className="text-primary-light" /> Platform Configuration
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nexus Pro Monthly (GHS)</label>
                    <input 
                        className="nx-input p-3 mt-1 font-bold text-sm w-full bg-black/20" 
                        type="number"
                        value={monthly} 
                        onChange={(e) => setMonthly(parseInt(e.target.value))}
                        onBlur={() => handleUpdate('monthlyPriceGHS', monthly)}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Enterprise Annual (GHS)</label>
                    <input 
                        className="nx-input p-3 mt-1 font-bold text-sm w-full bg-black/20" 
                        type="number"
                        value={annual}
                        onChange={(e) => setAnnual(parseInt(e.target.value))}
                        onBlur={() => handleUpdate('annualPriceGHS', annual)}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Default Trial (Days)</label>
                    <input 
                        className="nx-input p-3 mt-1 font-bold text-sm w-full bg-black/20" 
                        type="number"
                        value={trials}
                        onChange={(e) => setTrials(parseInt(e.target.value))}
                        onBlur={() => handleUpdate('trialDays', trials)}
                    />
                </div>
            </div>
        </motion.div>
    );
};

const DevDashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [integrity, setIntegrity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const [sRes, iRes] = await Promise.all([
                api.get('/dev/stats'),
                api.get('/dev/integrity')
            ]);
            setStats(sRes.data);
            setIntegrity(iRes.data);
        } catch (error) {
            console.error('Failed to fetch DEV data', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleOverride = async (orgId: string) => {
        if (!confirm('Manually approve this tenant for a paid plan?')) return;
        try {
            await api.post('/payment/manual-override', { organizationId: orgId, plan: 'PRO' });
            toast.success('Billing overrides applied.');
            fetchData();
        } catch (error) {
            toast.error('Failed to override billing.');
        }
    };

    const handleImpersonate = async (orgId: string) => {
        try {
            const res = await api.post('/auth/impersonate', { organizationId: orgId });
            localStorage.setItem('nexus_token', res.data.token);
            localStorage.setItem('nexus_user', JSON.stringify(res.data.user));
            toast.success('Impersonation Active');
            window.location.href = '/dashboard';
        } catch (error) {
            toast.error('Impersonation failed');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-bold animate-pulse">Initializing Command Center Telemetry...</p>
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-rose-500 font-display flex items-center gap-3">
                        <ShieldAlert size={28} /> Command Center
                    </h1>
                    <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-bold">Platform-wide Telemetry & Tenant Management</p>
                </div>
                <button 
                    onClick={fetchData} 
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-white/5 active:scale-95 disabled:opacity-50"
                >
                    <Activity size={16} className={cn(refreshing && "animate-spin")} />
                    <span>{refreshing ? 'Syncing...' : 'Refresh Logs'}</span>
                </button>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Tenants', val: stats?.summary.orgCount, icon: Database, color: 'text-blue-400' },
                    { label: 'Total Users', val: stats?.summary.userCount, icon: UserCheck, color: 'text-emerald-400' },
                    { label: 'Platform Revenue (Total)', val: `GHS ${stats?.summary.totalPayroll.toLocaleString()}`, icon: Zap, color: 'text-amber-400' },
                    { label: 'Trials Active', val: stats?.summary.activeTrials, icon: Clock, color: 'text-rose-400' }
                ].map((kpi, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.1 }}
                        className="glass p-6 border-white/5 bg-white/[0.02]"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("p-2.5 rounded-xl bg-white/5", kpi.color)}>
                                <kpi.icon size={20} />
                            </div>
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{kpi.label}</h4>
                        <p className="text-2xl font-black text-white">{kpi.val}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Platform Config / System Health */}
                <div className="xl:col-span-1 space-y-6">
                    <PlatformConfig initialStats={stats?.summary} onUpdate={fetchData} />

                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 border-white/5 bg-white/[0.02]">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Server size={18} className="text-slate-400" /> Node.js Environment
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mb-2">
                                    <span>RAM Utilization</span> 
                                    <span>{Math.round((1 - (stats?.systemHealth.freeMemMB / stats?.systemHealth.totalMemMB)) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-primary to-primary-light" 
                                        style={{ width: `${Math.round((1 - (stats?.systemHealth.freeMemMB / stats?.systemHealth.totalMemMB)) * 100)}%` }} 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                    <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">Cores</div>
                                    <div className="text-lg text-white font-black">{stats?.systemHealth.cpuCount}</div>
                                </div>
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                    <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">Uptime</div>
                                    <div className="text-lg text-white font-black">{stats?.systemHealth.uptime}h</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                <ShieldCheck size={16} />
                                <span>Core Systems operational on {stats?.systemHealth.platform}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Data Integrity */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: 0.2 }}
                        className={cn("glass p-6 border-white/5", integrity?.status !== 'HEALTHY' && "border-rose-500/30 bg-rose-500/5")}
                    >
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            {integrity?.status === 'HEALTHY' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-rose-500" />}
                            Data Integrity
                        </h3>
                        {integrity?.issues.length === 0 ? (
                            <p className="text-xs text-slate-500">No orphaned records or schema inconsistencies detected.</p>
                        ) : (
                            <div className="space-y-4">
                                {integrity?.issues.map((issue: any, i: number) => (
                                    <div key={i} className="p-3 rounded-xl bg-black/20 border border-rose-500/20">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-black text-rose-500 uppercase">{issue.type}</span>
                                            <span className="text-xs font-bold text-white">{issue.count} items</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 italic">Affected: {issue.items.map((it: any) => it.fullName).join(', ').slice(0, 50)}...</p>
                                    </div>
                                ))}
                                <button className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-all">Fix Integrity Issues</button>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Tenant Management */}
                <div className="xl:col-span-2">
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <HardDrive className="text-primary-light" size={20} /> Active Tenancy Nodes
                            </h3>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing Recent Activations</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 bg-black/10">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Organization</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Billing status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Users</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Activation</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {stats?.tenants.map((ten: any) => (
                                        <tr key={ten.id} className="hover:bg-white/[0.01] group">
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-black text-white">{ten.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ten.id.slice(0, 13)}...</div>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-bold text-white">
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-center w-fit",
                                                        ten.billingStatus === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                                    )}>
                                                        {ten.billingStatus}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600 font-bold uppercase">{ten.subscriptionPlan}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs font-black text-slate-400">{ten._count.users} seats</div>
                                            </td>
                                            <td className="px-6 py-5 text-xs font-medium text-slate-500">
                                                {new Date(ten.trialStartDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {ten.billingStatus !== 'ACTIVE' && (
                                                        <button 
                                                            onClick={() => handleOverride(ten.id)}
                                                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all"
                                                        >
                                                            Activate (Paid)
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleImpersonate(ten.id)}
                                                        className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all"
                                                    >
                                                        Impersonate
                                                    </button>
                                                    <button className="p-2 text-slate-600 hover:text-white transition-colors">
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default DevDashboard;
