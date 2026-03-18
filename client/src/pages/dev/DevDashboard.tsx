import { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { 
    ShieldAlert, Activity, Zap, Download, 
    Settings, Key, Terminal, ChevronRight, 
    UserCheck, ShieldX, CheckCircle2, AlertTriangle,
    HardDrive, CalendarPlus, Database, Clock, Search
} from 'lucide-react';
import { cn } from '../../utils/cn';

const PlatformConfig = ({ initialStats, onUpdate }: any) => {
    const [monthly, setMonthly] = useState(initialStats?.monthlyPriceGHS || 100);
    const [annual, setAnnual] = useState(initialStats?.annualPriceGHS || 1000);
    const [trials, setTrials] = useState(initialStats?.trialDays || 14);
    const [pubKey, setPubKey] = useState(initialStats?.paystackPublicKey || '');
    const [secKey, setSecKey] = useState(initialStats?.paystackSecretKey || '');
    const [payLink, setPayLink] = useState(initialStats?.paystackPayLink || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.patch('/settings', {
                monthlyPriceGHS: monthly,
                annualPriceGHS: annual,
                trialDays: trials,
                paystackPublicKey: pubKey,
                paystackSecretKey: secKey,
                paystackPayLink: payLink
            });
            toast.success('Platform configurations synced successfully');
            onUpdate();
        } catch (error) {
            toast.error('Failed to sync settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 border-white/5 bg-white/[0.02] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Zap size={120} className="text-amber-400" />
                </div>

                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                    <Zap size={22} className="text-amber-400" /> Revenue & Pricing
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Monthly (GHS)</label>
                        <input
                            type="number"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 transition-all outline-none"
                            value={monthly}
                            onChange={(e) => setMonthly(Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Annual (GHS)</label>
                        <input
                            type="number"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 transition-all outline-none"
                            value={annual}
                            onChange={(e) => setAnnual(Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Trial (Days)</label>
                        <input
                            type="number"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 transition-all outline-none"
                            value={trials}
                            onChange={(e) => setTrials(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Paystack Public Key</label>
                        <div className="relative">
                            <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="pk_live_..."
                                className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-xs font-mono text-white focus:border-emerald-500/50 transition-all outline-none"
                                value={pubKey}
                                onChange={(e) => setPubKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Paystack Secret Key</label>
                        <div className="relative">
                            <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="password"
                                placeholder="sk_live_..."
                                className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-xs font-mono text-white focus:border-emerald-500/50 transition-all outline-none"
                                value={secKey}
                                onChange={(e) => setSecKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Manual Payment Link</label>
                        <input
                            type="text"
                            placeholder="https://paystack.com/pay/your-plan"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-blue-500/50 transition-all outline-none"
                            value={payLink}
                            onChange={(e) => setPayLink(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                    {loading ? 'Syncing Revenue Engine...' : 'Update Platform Revenue Config'}
                </button>
            </motion.div>
        </div>
    );
};

const GlobalOps = ({ settings, onUpdate }: any) => {
    const [maintenanceMode, setMaintenanceMode] = useState(settings?.isMaintenanceMode || false);
    const [lockdown, setLockdown] = useState(settings?.securityLockdown || false);
    const [mNotice, setMNotice] = useState(settings?.maintenanceNotice || '');
    const [sMessage, setSMessage] = useState(settings?.securityLockdownMessage || '');

    const handleToggle = async (field: string, val: boolean) => {
        try {
            await api.put('/settings', { [field]: val });
            toast.success(`${field} Updated`);
            onUpdate();
        } catch (err) { toast.error('Toggle failed'); }
    };

    const handleBackup = async () => {
        try {
            await api.post('/dev/backup');
            toast.success('Backup triggered successfully');
        } catch (err) { toast.error('Backup failed'); }
    };

    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass p-6 border-rose-500/20 bg-rose-500/5">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-500" /> Platform Security & Ops
            </h3>
            <div className="space-y-6">
                <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="text-sm font-bold text-white">Maintenance Mode</h4>
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Only DEV role bypasses</p>
                        </div>
                        <button
                            onClick={() => { setMaintenanceMode(!maintenanceMode); handleToggle('isMaintenanceMode', !maintenanceMode); }}
                            className={cn("p-1 rounded-full w-10 flex transition-all", maintenanceMode ? "bg-amber-500 justify-end" : "bg-slate-700 justify-start")}
                        >
                            <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                        </button>
                    </div>
                    {maintenanceMode && (
                        <textarea
                            className="nx-input w-full bg-black/40 p-3 text-xs text-amber-500 font-bold border-amber-500/20"
                            placeholder="Notice shown to users..."
                            value={mNotice}
                            onChange={(e) => setMNotice(e.target.value)}
                            onBlur={() => api.put('/settings', { maintenanceNotice: mNotice })}
                        />
                    )}
                </div>

                <div className="p-4 bg-black/20 rounded-2xl border border-rose-500/20">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h4 className="text-sm font-bold text-rose-500">Security Lockdown</h4>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Emergency Killswitch - Blocks All Login</p>
                        </div>
                        <button
                            onClick={() => { setLockdown(!lockdown); handleToggle('securityLockdown', !lockdown); }}
                            className={cn("p-1 rounded-full w-10 flex transition-all", lockdown ? "bg-rose-500 justify-end" : "bg-slate-700 justify-start")}
                        >
                            <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                        </button>
                    </div>
                    {lockdown && (
                        <textarea
                            className="nx-input w-full bg-black/40 p-3 text-xs text-rose-500 font-bold border-rose-500/20"
                            placeholder="Reason for lockdown..."
                            value={sMessage}
                            onChange={(e) => setSMessage(e.target.value)}
                            onBlur={() => api.put('/settings', { securityLockdownMessage: sMessage })}
                        />
                    )}
                </div>

                <button
                    onClick={handleBackup}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all border border-white/5 font-bold text-xs"
                >
                    <Download size={14} /> Trigger Manual Database Backup
                </button>
            </div>
        </motion.div>
    );
};

const TenantConfigModal = ({ tenant, onClose, onUpdate }: any) => {
    const [features, setFeatures] = useState<any>(JSON.parse(tenant.features || '{}'));
    const [trialDays, setTrialDays] = useState(14);
    const [discountP, setDiscountP] = useState(tenant.discountPercentage || 0);
    const [discountF, setDiscountF] = useState(tenant.discountFixed || 0);
    const [updating, setUpdating] = useState(false);
    // Bank Transfer Override State
    const [bankPlan, setBankPlan] = useState<'MONTHLY' | 'ANNUALLY'>('MONTHLY');
    const [bankRef, setBankRef] = useState('');
    const [bankAmount, setBankAmount] = useState('');
    const [bankNotes, setBankNotes] = useState('');
    const [grantingAccess, setGrantingAccess] = useState(false);

    const toggleFeature = async (feature: string) => {
        try {
            const enabled = !features[feature];
            await api.post('/dev/tenant/feature', { organizationId: tenant.id, feature, enabled });
            setFeatures({ ...features, [feature]: enabled });
            toast.success(`Feature ${feature} toggled`);
        } catch (err) { toast.error('Failed to toggle feature'); }
    };

    const handleUpdateTenantSettings = async () => {
        setUpdating(true);
        try {
            await api.patch('/settings', {
                organizationId: tenant.id,
                discountPercentage: discountP,
                discountFixed: discountF
            });
            if (trialDays > 0) {
                await api.post('/dev/tenant/trial', { organizationId: tenant.id, days: trialDays });
                toast.success(`Trial extended by ${trialDays} days`);
            }
            toast.success('Tenant settings updated');
            onUpdate();
            onClose();
        } catch (err) {
            toast.error('Failed to update tenant settings');
        } finally {
            setUpdating(false);
        }
    };

    const handleGrantBankAccess = async () => {
        if (!bankRef.trim()) {
            return toast.error('Please enter a payment reference or transaction ID.');
        }
        setGrantingAccess(true);
        try {
            await api.post('/dev/grant-bank-access', {
                organizationId: tenant.id,
                plan: bankPlan,
                paymentReference: bankRef,
                amountGHS: parseFloat(bankAmount) || 0,
                notes: bankNotes
            });
            toast.success(`✅ Access granted to ${tenant.name} on ${bankPlan} plan!`);
            onUpdate();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to grant access');
        } finally {
            setGrantingAccess(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass max-w-lg w-full p-8 border-primary/20 my-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black text-white">{tenant.name}</h3>
                        <p className="text-[10px] text-slate-500 font-mono">{tenant.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors text-lg">✕</button>
                </div>

                <div className="space-y-6">
                    {/* Module Management */}
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-primary-light mb-4 tracking-widest">Module Management</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {['payroll', 'appraisals', 'onboarding', 'assets', 'training'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => toggleFeature(f)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase transition-all",
                                        features[f] ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-white/5 bg-white/5 text-slate-500"
                                    )}
                                >
                                    <span>{f}</span>
                                    {features[f] ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Discounts & Trial */}
                    <div className="pt-6 border-t border-white/5">
                        <h4 className="text-[10px] font-black uppercase text-rose-500 mb-4 flex items-center gap-2">
                             <CalendarPlus size={14} /> Revenue & Trial Management
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Discount (%)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500/50 transition-all outline-none"
                                    value={discountP}
                                    onChange={(e) => setDiscountP(Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Fixed Discount (GHS)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500/50 transition-all outline-none"
                                    value={discountF}
                                    onChange={(e) => setDiscountF(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1 mt-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Trial Extension (Days)</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    className="nx-input flex-1 bg-black/20 p-3 text-sm font-bold"
                                    placeholder="Add Days..."
                                    value={trialDays}
                                    onChange={(e) => setTrialDays(parseInt(e.target.value))}
                                />
                                <button
                                    onClick={handleUpdateTenantSettings}
                                    disabled={updating}
                                    className="px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase disabled:opacity-50"
                                >
                                    {updating ? 'Updating...' : 'Apply'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bank Transfer Override */}
                    <div className="pt-6 border-t border-white/5">
                        <h4 className="text-[10px] font-black uppercase text-emerald-500 mb-4 flex items-center gap-2">
                            <CheckCircle2 size={14} /> Manual Bank Transfer Override
                        </h4>
                        <p className="text-[10px] text-slate-400 mb-4">Client paid via bank transfer? Grant them access manually and this will be logged in the audit trail.</p>
                        
                        <div className="space-y-3">
                            {/* Plan Selector */}
                            <div className="flex gap-2">
                                {(['MONTHLY', 'ANNUALLY'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setBankPlan(p)}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all",
                                            bankPlan === p
                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                : "border-white/10 text-slate-500 hover:text-white hover:border-white/20"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="text"
                                placeholder="Bank Transaction / Reference ID *"
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-emerald-500/50 transition-all outline-none font-mono"
                                value={bankRef}
                                onChange={(e) => setBankRef(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    placeholder="Amount Paid (GHS)"
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-emerald-500/50 transition-all outline-none"
                                    value={bankAmount}
                                    onChange={(e) => setBankAmount(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Notes (optional)"
                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-emerald-500/50 transition-all outline-none"
                                    value={bankNotes}
                                    onChange={(e) => setBankNotes(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleGrantBankAccess}
                                disabled={grantingAccess || !bankRef.trim()}
                                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={14} />
                                {grantingAccess ? 'Granting Access...' : `Grant ${bankPlan} Access`}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const DevDashboard = () => {
    const [stats, setStats] = useState<any>({ tenants: [], summary: {} });
    const [telemetry, setTelemetry] = useState<any>({ recentEvents: [] });
    const [logs, setLogs] = useState<any[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'tenants' | 'ops' | 'audit'>('tenants');
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [tenantDetails, setTenantDetails] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const [sRes, tRes, lRes] = await Promise.all([
                api.get('/dev/stats'),
                api.get('/dev/telemetry'),
                api.get('/dev/logs')
            ]);
            setStats(sRes.data);
            setTelemetry(tRes.data);
            setLogs(lRes.data);

            // Auto-select first tenant if none selected
            if (sRes.data.tenants.length > 0 && !selectedTenantId) {
                handleTenantSelect(sRes.data.tenants[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch DEV data', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleTenantSelect = async (id: string) => {
        setSelectedTenantId(id);
        setTenantDetails(null);
        try {
            const res = await api.get(`/dev/tenant/${id}`);
            setTenantDetails(res.data);
        } catch (err) { toast.error('Failed to load tenant details'); }
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
                <div className="flex items-center gap-4">
                    <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5">
                        {(['tenants', 'ops', 'audit'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                    activeTab === tab ? "bg-rose-500 text-white" : "text-slate-500 hover:text-white"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={fetchData} 
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-white/5 active:scale-95 disabled:opacity-50"
                    >
                        <Activity size={16} className={cn(refreshing && "animate-spin")} />
                        <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
                    </button>
                </div>
            </div>

            {selectedTenant && <TenantConfigModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} onUpdate={fetchData} />}

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

            {activeTab === 'tenants' && (
                <div className="flex gap-8 min-h-[600px]">
                    {/* Tenant Sidebar */}
                    <div className="w-80 flex flex-col gap-4">
                        <div className="glass p-4 border-white/5 bg-white/[0.02]">
                            <div className="relative mb-4">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search Tenants..." 
                                    className="w-full bg-black/20 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-white placeholder:text-slate-600 focus:border-rose-500/50 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                                {stats?.tenants
                                    .filter((t: any) => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((ten: any) => (
                                    <button
                                        key={ten.id}
                                        onClick={() => handleTenantSelect(ten.id)}
                                        className={cn(
                                            "w-full p-3 rounded-xl flex items-center justify-between border transition-all active:scale-[0.98]",
                                            selectedTenantId === ten.id 
                                                ? "bg-rose-500/10 border-rose-500/30 text-white" 
                                                : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"
                                        )}
                                    >
                                        <div className="text-left">
                                            <div className="text-[11px] font-black uppercase truncate max-w-[140px]">{ten.name}</div>
                                            <div className="text-[9px] text-slate-500 font-bold mt-0.5">{ten.subscriptionPlan} • {ten._count.users} Users</div>
                                        </div>
                                        {selectedTenantId === ten.id && <ChevronRight size={14} className="text-rose-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tenant Workspace */}
                    <div className="flex-1">
                        {tenantDetails ? (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-2xl font-black text-white">{tenantDetails.tenant.name}</h2>
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">Active Node</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-mono">{tenantDetails.tenant.id}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleImpersonate(tenantDetails.tenant.id)}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                        >
                                            <UserCheck size={14} /> Impersonate
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTenant(tenantDetails.tenant)}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-white/5"
                                        >
                                            <Settings size={14} /> Config
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    {/* Per-Tenant KPIs */}
                                    {[
                                        { label: 'Live Sessions', val: tenantDetails.metrics.activeUsers, icon: Activity, color: 'text-emerald-400' },
                                        { label: 'Storage Footprint', val: `${tenantDetails.metrics.storageUsed} GB`, icon: HardDrive, color: 'text-blue-400' },
                                        { label: 'Performance Load', val: `${tenantDetails.metrics.cpuUsage}%`, icon: Zap, color: 'text-amber-400' }
                                    ].map((kpi, i) => (
                                        <div key={i} className="glass p-4 border-white/5 bg-white/[0.01]">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={cn("p-1.5 rounded-lg bg-white/5", kpi.color)}>
                                                    <kpi.icon size={14} />
                                                </div>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</span>
                                            </div>
                                            <div className="text-xl font-black text-white">{kpi.val}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="glass p-6 border-white/5 bg-white/[0.01]">
                                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                            <ShieldX size={16} className="text-rose-500" /> Organization Security
                                        </h3>
                                        <div className="space-y-2">
                                            {tenantDetails.recentEvents && (tenantDetails.recentEvents as any[]).length > 0 ? (
                                                (tenantDetails.recentEvents as any[]).map((evt: any) => (
                                                    <div key={evt.id} className="flex justify-between items-center p-2 rounded-lg bg-black/20 border border-white/5">
                                                        <div>
                                                            <div className="text-[9px] font-bold text-white">{evt.email}</div>
                                                            <div className="text-[8px] text-slate-500">{new Date(evt.createdAt).toLocaleString()}</div>
                                                        </div>
                                                        <span className={cn("px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase", evt.success ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                                                            {evt.success ? 'Success' : 'Fail'}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-slate-500 italic">No security events recorded for this organization.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="glass p-6 border-white/5 bg-white/[0.01]">
                                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                            <Zap size={16} className="text-amber-400" /> Module Access
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(JSON.parse(tenantDetails.tenant.features || '{}')).map(([f, enabled]: any) => (
                                                <div key={f} className={cn(
                                                    "px-3 py-2 rounded-xl border text-[9px] font-black uppercase flex justify-between items-center",
                                                    enabled ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-white/5 bg-white/5 text-slate-600"
                                                )}>
                                                    <span>{f}</span>
                                                    {enabled ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <Activity size={48} className="mb-4 opacity-10 animate-pulse" />
                                <p className="text-sm font-bold uppercase tracking-widest">Select a tenant to initialize workspace</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'ops' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <PlatformConfig initialStats={stats?.summary} onUpdate={fetchData} />
                        <GlobalOps settings={stats?.summary} onUpdate={fetchData} />
                    </div>
                    
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-6 border-white/5 bg-white/[0.01]">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <ShieldX size={18} className="text-rose-500" /> Security Telemetry
                        </h3>
                        {telemetry && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                        <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">Failures</div>
                                        <div className="text-2xl text-rose-500 font-black">{telemetry.failures}</div>
                                    </div>
                                    <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                        <div className="text-[9px] uppercase text-slate-500 font-bold mb-1">Failure Rate</div>
                                        <div className="text-2xl text-white font-black">{telemetry.failureRate}%</div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500">Recent Security Events</h4>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {(telemetry.recentEvents as any[] || []).map((evt: any) => (
                                            <div key={evt.id} className={cn(
                                                "p-3 rounded-xl border flex justify-between items-center",
                                                evt.success ? "bg-emerald-500/5 border-emerald-500/10" : "bg-rose-500/5 border-rose-500/10"
                                            )}>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-white">{evt.email}</span>
                                                        <span className={cn("px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase", evt.success ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                                                            {evt.success ? 'Success' : 'Failed'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 mt-0.5">{evt.organization?.name || 'Unknown Org'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] text-slate-500 font-mono">{evt.ipAddress}</p>
                                                    <p className="text-[8px] text-slate-600 uppercase font-black">{new Date(evt.createdAt).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {activeTab === 'audit' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass border-white/5 bg-white/[0.01] overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <Terminal size={20} className="text-primary-light" /> Platform Audit Trail
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase">
                            <Activity size={12} className="text-emerald-500" /> System Logs Online
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-900 border-b border-white/5 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operator</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-white/[0.01]">
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] text-white font-black">{log.operatorEmail}</div>
                                            <div className="text-[8px] text-slate-500 font-mono">{log.ipAddress}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary-light text-[9px] font-black uppercase">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] text-slate-300 max-w-xs truncate">{log.details}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default DevDashboard;
