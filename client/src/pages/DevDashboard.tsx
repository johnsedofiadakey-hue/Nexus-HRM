import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import {
    Server, HardDrive, Database, ShieldAlert, CheckCircle, Clock, Save,
    Settings, Activity, PlaySquare, Mail, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SystemHealth {
    status: string;
    database: { latencyMs: number; totalUsers: number; totalDepartments: number; };
    server: { uptimeSeconds: number; memoryUsagePercent: string; cpuLoadAvg: number[]; platform: string; arch: string; };
}

interface SystemSettings {
    id: string; companyName: string;
    isMaintenanceMode: boolean; securityLockdown: boolean;
    themePreset: string;
    smtpHost?: string; smtpPort?: number; smtpUser?: string;
    paystackPublicKey?: string; monthlyPriceGHS?: number; annualPriceGHS?: number; trialDays?: number;
    plan?: string; subscriptionStatus?: string;
}

const DevDashboard = () => {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backupRunning, setBackupRunning] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [hRes, sRes, lRes] = await Promise.all([
                api.get('/dev/health'),
                api.get('/dev/settings'),
                api.get('/dev/backup/logs')
            ]);
            setHealth(hRes.data);
            setSettings(sRes.data);
            setLogs(lRes.data);
        } catch (error) {
            console.error('Failed to fetch DEV data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/dev/settings', settings);
            alert('System configuration updated safely.');
        } catch (error) {
            alert('Failed to update system config.');
        } finally {
            setSaving(false);
        }
    };

    const triggerBackup = async () => {
        setBackupRunning(true);
        try {
            const res = await api.post('/dev/backup');
            setLogs([res.data.log, ...logs]);
            alert('Database backup completed successfully.');
        } catch (error) {
            alert('Backup failed.');
        } finally {
            setBackupRunning(false);
        }
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
    };

    if (loading) return <div className="p-10 text-center text-white">Initializing Developer Tools...</div>;

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-rose-500 font-display flex items-center gap-3">
                        <ShieldAlert size={28} /> System Developer Portal
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Autonomous environment management and health monitoring.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold", health?.status === 'healthy' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                        <Activity size={14} /> System {health?.status?.toUpperCase()}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Core Infrastructure */}
                <div className="xl:col-span-1 space-y-6">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-6 border-primary/20 bg-primary/5">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Server size={18} className="text-primary-light" /> Server Telemetry</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 font-bold uppercase mb-1">
                                    <span>Memory Usage</span> <span>{health?.server.memoryUsagePercent}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${health?.server.memoryUsagePercent}%` }} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold">Uptime</div>
                                    <div className="text-sm text-white font-black mt-1">{formatUptime(health?.server.uptimeSeconds || 0)}</div>
                                </div>
                                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold">Platform</div>
                                    <div className="text-sm text-white font-black mt-1 uppercase">{health?.server.platform} {health?.server.arch}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="glass p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Database size={18} className="text-emerald-400" /> Database Engine</h3>
                            <button
                                onClick={triggerBackup} disabled={backupRunning}
                                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg disabled:opacity-50">
                                <HardDrive size={14} /> {backupRunning ? 'Dumping...' : 'Force Backup'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-white/[0.03] rounded-xl">
                                <div className="text-[10px] uppercase text-slate-500 font-bold">Latency</div>
                                <div className="text-sm text-white font-black mt-1">{health?.database.latencyMs}ms</div>
                            </div>
                            <div className="p-3 bg-white/[0.03] rounded-xl">
                                <div className="text-[10px] uppercase text-slate-500 font-bold">Total Entities</div>
                                <div className="text-sm text-white font-black mt-1">{(health?.database.totalUsers || 0) + (health?.database.totalDepartments || 0)}</div>
                            </div>
                        </div>

                        <h4 className="text-xs uppercase font-bold text-slate-500 mt-6 mb-3">Recent Backup Logs</h4>
                        <div className="space-y-2">
                            {logs.slice(0, 4).map((l: any) => (
                                <div key={l.id} className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center gap-2">
                                        {l.status === 'SUCCESS' ? <CheckCircle size={14} className="text-emerald-400" /> : <ShieldAlert size={14} className="text-rose-500" />}
                                        <span className="text-xs text-white truncate max-w-[150px]">{l.filename}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">{l.size}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Configuration Matrix */}
                <div className="xl:col-span-2">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-8">
                        <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                            <Settings className="text-primary-light" /> Deep Configuration Matrix
                        </h3>

                        <form onSubmit={handleSaveSettings} className="space-y-8">

                            {/* Danger Zone Controls */}
                            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
                                <h4 className="text-sm uppercase font-black tracking-widest text-rose-400 mb-4 flex items-center gap-2"><AlertTriangle size={16} /> Runtime Overrides</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex items-center justify-between p-4 bg-black/20 rounded-xl cursor-pointer hover:bg-black/30 transition-colors">
                                        <div>
                                            <span className="text-sm font-bold text-white block">Maintenance Mode</span>
                                            <span className="text-xs text-slate-400">Lockout non-DEV accounts</span>
                                        </div>
                                        <input type="checkbox" className="toggle toggle-error"
                                            checked={settings?.isMaintenanceMode || false}
                                            onChange={e => setSettings({ ...settings, isMaintenanceMode: e.target.checked } as any)} />
                                    </label>
                                    <label className="flex items-center justify-between p-4 bg-black/20 rounded-xl cursor-pointer hover:bg-black/30 transition-colors">
                                        <div>
                                            <span className="text-sm font-bold text-white block">Security Lockdown</span>
                                            <span className="text-xs text-slate-400" >Disable all data exports</span>
                                        </div>
                                        <input type="checkbox" className="toggle toggle-error"
                                            checked={settings?.securityLockdown || false}
                                            onChange={e => setSettings({ ...settings, securityLockdown: e.target.checked } as any)} />
                                    </label>
                                </div>
                            </div>

                            {/* SaaS Controls */}
                            <div>
                                <h4 className="text-sm uppercase font-black tracking-widest text-white mb-4 flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-400" /> SaaS Billing Engine (Paystack)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Live Public Key</label>
                                        <input type="password" placeholder="pk_live_..." className="input mt-1"
                                            value={settings?.paystackPublicKey || ''}
                                            onChange={e => setSettings({ ...settings, paystackPublicKey: e.target.value } as any)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Current Client Plan</label>
                                        <select className="input mt-1"
                                            value={settings?.plan || 'FREE'}
                                            onChange={e => setSettings({ ...settings, plan: e.target.value } as any)}>
                                            <option>FREE</option><option>PRO</option><option>ENTERPRISE</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Monthly Price (GHS)</label>
                                        <input type="number" className="input mt-1"
                                            value={settings?.monthlyPriceGHS || 0}
                                            onChange={e => setSettings({ ...settings, monthlyPriceGHS: Number(e.target.value) } as any)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Annual Price (GHS) - Discounted</label>
                                        <input type="number" className="input mt-1"
                                            value={settings?.annualPriceGHS || 0}
                                            onChange={e => setSettings({ ...settings, annualPriceGHS: Number(e.target.value) } as any)} />
                                    </div>
                                </div>
                            </div>

                            {/* Mail Server */}
                            <div>
                                <h4 className="text-sm uppercase font-black tracking-widest text-white mb-4 flex items-center gap-2"><Mail size={16} className="text-blue-400" /> System Mail Gateway (SMTP)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">SMTP Host</label>
                                        <input type="text" className="input mt-1" placeholder="smtp.mailgun.org"
                                            value={settings?.smtpHost || ''}
                                            onChange={e => setSettings({ ...settings, smtpHost: e.target.value } as any)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase">Port</label>
                                            <input type="number" className="input mt-1" placeholder="587"
                                                value={settings?.smtpPort || ''}
                                                onChange={e => setSettings({ ...settings, smtpPort: Number(e.target.value) } as any)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase">Default From</label>
                                            <input type="email" className="input mt-1" placeholder="no-reply@..."
                                                value={settings?.smtpUser || ''} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 flex justify-end">
                                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-8">
                                    {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                                    {saving ? 'Overwriting...' : 'Inject Configuration'}
                                </button>
                            </div>
                        </form>

                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default DevDashboard;
