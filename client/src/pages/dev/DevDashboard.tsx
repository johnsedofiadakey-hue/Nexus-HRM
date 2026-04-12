import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldAlert, Activity, Zap, Download, 
    Search, ChevronRight, Settings, Database,
    Layout, UserCheck, Key, Copy, HardDrive,
    Terminal, Globe, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { cn } from '../../utils/cn';

const PlatformConfig = ({ initialStats, onUpdate }: any) => {
    const [monthly, setMonthly] = useState(initialStats?.monthlyPrice || 30000000);
    const [annual, setAnnual] = useState(initialStats?.annualPrice || 360000000);
    const [currency, setCurrency] = useState(initialStats?.currency || 'GNF');
    const [trials, setTrials] = useState(initialStats?.trialDays || 14);
    const [pubKey, setPubKey] = useState(initialStats?.paystackPublicKey || '');
    const [secKey, setSecKey] = useState(initialStats?.paystackSecretKey || '');
    const [payLink, setPayLink] = useState(initialStats?.paystackPayLink || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.patch('/settings', {
                monthlyPrice: monthly,
                annualPrice: annual,
                currency,
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

                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Currency</label>
                        <select
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 transition-all outline-none"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            <option value="GNF">GNF (Guinea)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GHS">GHS (Ghana)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Monthly</label>
                        <input
                            type="number"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500/50 transition-all outline-none"
                            value={monthly}
                            onChange={(e) => setMonthly(Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Annual</label>
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

    const handleToggle = async (field: string, val: boolean) => {
        try {
            await api.put('/settings', { [field]: val });
            toast.success(`${field} Updated`);
            onUpdate();
        } catch (err) { toast.error('Toggle failed'); }
    };

    const handleBackup = async () => {
        try {
            const res = await api.post('/dev/backup');
            if (res.data.success) {
                toast.success(`Backup Success! Local: ${res.data.localFile} | Firebase: ${res.data.firebaseSynced ? 'YES' : 'NO'}`);
            } else {
                toast.error('Backup completed with warnings');
            }
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
    const [bankPlan, setBankPlan] = useState<'MONTHLY' | 'ANNUALLY'>('MONTHLY');
    const [bankRef, setBankRef] = useState('');
    const [grantingAccess, setGrantingAccess] = useState(false);

    const toggleFeature = async (feature: string) => {
        try {
            const enabled = !features[feature];
            await api.post('/dev/tenant/feature', { organizationId: tenant.id, feature, enabled });
            setFeatures({ ...features, [feature]: enabled });
            toast.success(`Feature ${feature} toggled`);
        } catch (err) { toast.error('Failed to toggle feature'); }
    };

    const handleGrantBankAccess = async () => {
        if (!bankRef.trim()) return toast.error('Payment reference required');
        setGrantingAccess(true);
        try {
            await api.post('/dev/grant-bank-access', {
                organizationId: tenant.id,
                plan: bankPlan,
                paymentReference: bankRef,
                amountGHS: 0,
                notes: ''
            });
            toast.success(`Access granted to ${tenant.name}`);
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

                    <div className="pt-6 border-t border-white/5">
                        <h4 className="text-[10px] font-black uppercase text-emerald-500 mb-4 flex items-center gap-2">
                            <CheckCircle2 size={14} /> Manual Bank Transfer Override
                        </h4>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                {(['MONTHLY', 'ANNUALLY'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setBankPlan(p)}
                                        className={cn(
                                            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all",
                                            bankPlan === p ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10 text-slate-500 hover:text-white"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <input type="text" placeholder="Bank Reference ID" className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none font-mono" value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
                            <button onClick={handleGrantBankAccess} disabled={grantingAccess || !bankRef.trim()} className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest">
                                {grantingAccess ? 'Granting...' : `Grant ${bankPlan} Access`}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const NexusCentralConsole = () => {
    const [stats, setStats] = useState<any>({ tenants: [], summary: {} });
    const [logs, setLogs] = useState<any[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tenants' | 'ops' | 'audit'>('tenants');
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [tenantDetails, setTenantDetails] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [seeding, setSeeding] = useState(false);
    const [demoResult, setDemoResult] = useState<{ mdEmail: string; password: string; orgName: string } | null>(null);
    
    // Provisioning State
    const [showProvisionModal, setShowProvisionModal] = useState(false);
    const [nodeName, setNodeName] = useState('');
    const [nodeEmail, setNodeEmail] = useState('');
    const [provisioning, setProvisioning] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sRes, lRes] = await Promise.allSettled([
                api.get('/dev/stats'),
                api.get('/dev/logs')
            ]);

            setStats(sRes.status === 'fulfilled' ? sRes.value.data : { tenants: [], summary: {} });
            setLogs(lRes.status === 'fulfilled' ? lRes.value.data : []);

            if (sRes.status === 'fulfilled' && sRes.value.data.tenants?.length > 0 && !selectedTenantId) {
                handleTenantSelect(sRes.value.data.tenants[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
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
            localStorage.setItem('nexus_auth_token', res.data.token);
            localStorage.setItem('nexus_user', JSON.stringify(res.data.user));
            toast.success('Impersonation Active');
            window.location.href = '/dashboard';
        } catch (error) { toast.error('Impersonation failed'); }
    };

    const handleSeedDemo = async (orgId: string, orgName: string) => {
        if (!window.confirm(`Provision ${orgName} with professional demo environment?`)) return;
        setSeeding(true);
        try {
            const res = await api.post('/dev/tenant/seed-demo', { organizationId: orgId });
            setDemoResult({ ...res.data.credentials, orgName });
            toast.success('Demo environment ready!');
            fetchData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Seeding failed');
        } finally {
            setSeeding(false);
        }
    };

    const handleProvisionNode = async (e: React.FormEvent) => {
        e.preventDefault();
        setProvisioning(true);
        try {
            await api.post('/dev/tenant/create', { 
                name: nodeName, 
                email: nodeEmail, 
                currency: 'GNF' 
            });
            toast.success('New Node Provisioned');
            setNodeName('');
            setNodeEmail('');
            setShowProvisionModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Provisioning failed');
        } finally {
            setProvisioning(false);
        }
    };

    const handleMasterLogout = () => {
        localStorage.removeItem('nexus_dev_key');
        window.location.href = '/dev-login';
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#020817]">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Initializing Master Control Plane...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020817] text-slate-200 selection:bg-rose-500/30">
            {/* Global Isolated Header */}
            <div className="sticky top-0 z-[150] bg-[#020817]/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                        <ShieldAlert size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tighter uppercase">Nexus Master Portal</h1>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Platform Administration Suite</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                        {(['tenants', 'ops', 'audit'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                                    activeTab === tab ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "text-slate-500 hover:text-white"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={handleMasterLogout}
                        className="px-4 py-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-white/10"
                    >
                        Master Logout
                    </button>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto p-10 space-y-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                            {activeTab === 'tenants' && <><Database className="text-emerald-500" /> Node Infrastructure</>}
                            {activeTab === 'ops' && <><Zap className="text-amber-500" /> Global Operations</>}
                            {activeTab === 'audit' && <><Terminal className="text-blue-500" /> System Audit</>}
                        </h2>
                        <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.3em] font-black italic">Shadow Protocol 8.24.1 Active</p>
                    </div>
                    
                    {activeTab === 'tenants' && (
                        <button 
                            onClick={() => setShowProvisionModal(true)}
                            className="flex items-center gap-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                        >
                            <Layout size={16} /> Provision New Node
                        </button>
                    )}
                </div>

                {selectedTenant && <TenantConfigModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} onUpdate={fetchData} />}

                <AnimatePresence>
                    {showProvisionModal && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass max-w-md w-full p-10 border-emerald-500/30 bg-[#0a1120]">
                                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Provision New Node</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-10 italic">Organization Deployment Wizard</p>
                                
                                <form onSubmit={handleProvisionNode} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Organization Name</label>
                                        <input required type="text" value={nodeName} onChange={e => setNodeName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:border-emerald-500/50 outline-none transition-all" placeholder="e.g. Nexus Corp" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Admin Email</label>
                                        <input required type="email" value={nodeEmail} onChange={e => setNodeEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:border-emerald-500/50 outline-none transition-all" placeholder="admin@nexus.com" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-6">
                                        <button type="button" onClick={() => setShowProvisionModal(false)} className="py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:bg-slate-800 transition-all">Cancel</button>
                                        <button type="submit" disabled={provisioning} className="py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                                            {provisioning ? 'Provisioning...' : 'Deploy Node'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {activeTab === 'tenants' && (
                    <div className="flex gap-10 min-h-[600px]">
                        <div className="w-96 flex flex-col gap-6">
                            <div className="glass p-6 border-white/5 bg-white/[0.02]">
                                <div className="relative mb-6">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                    <input type="text" placeholder="Search Infrastructure..." className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-5 text-xs font-black text-white placeholder:text-slate-600 focus:border-rose-500/50 transition-all outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                    {(stats?.tenants || []).filter((t: any) => t.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((ten: any) => (
                                        <button key={ten.id} onClick={() => handleTenantSelect(ten.id)} className={cn("w-full p-4 rounded-2xl flex items-center justify-between border transition-all active:scale-[0.98] group", selectedTenantId === ten.id ? "bg-rose-500/10 border-rose-500/30 text-white shadow-xl shadow-rose-500/5" : "bg-transparent border-transparent text-slate-500 hover:bg-white/5")}>
                                            <div className="text-left">
                                                <div className="text-[12px] font-black uppercase truncate max-w-[180px] tracking-tight">{ten.name}</div>
                                                <div className="text-[9px] text-slate-600 font-black mt-1 uppercase tracking-widest">{ten.subscriptionPlan} • {ten._count?.users || 0} Nodes</div>
                                            </div>
                                            {selectedTenantId === ten.id && <ChevronRight size={16} className="text-rose-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            {tenantDetails ? (
                                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-6">
                                            <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                                <Globe size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{tenantDetails.tenant.name}</h2>
                                                <p className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                                                    <Terminal size={12} /> {tenantDetails.tenant.id}
                                                </p>
                                                <div className="flex items-center gap-3 mt-4">
                                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-full border border-emerald-500/20 tracking-widest">Active</span>
                                                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded-full border border-blue-500/20 tracking-widest">Subscription: {tenantDetails.tenant.subscriptionPlan}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={() => handleSeedDemo(tenantDetails.tenant.id, tenantDetails.tenant.name)} disabled={seeding} className="px-6 py-3 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-amber-500/20 disabled:opacity-50">
                                                {seeding ? <Activity size={14} className="animate-spin" /> : 'Seed Demo Data'}
                                            </button>
                                            <button onClick={() => handleImpersonate(tenantDetails.tenant.id)} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2">
                                                <UserCheck size={16} /> Jump To Tenant
                                            </button>
                                            <button onClick={() => setSelectedTenant(tenantDetails.tenant)} className="px-6 py-3 bg-slate-900 border border-white/5 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">
                                                <Settings size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-8">
                                        {[
                                            { label: 'Cloud Resources', val: `${tenantDetails.metrics?.activeUsers || 0} active`, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
                                            { label: 'Storage Cluster', val: `${tenantDetails.metrics?.storageUsed || 0} GB`, icon: HardDrive, color: 'text-blue-400', bg: 'bg-blue-500/5' },
                                            { label: 'Telemetry Load', val: `${tenantDetails.metrics?.cpuUsage || 0}%`, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/5' }
                                        ].map((kpi, i) => (
                                            <div key={i} className={cn("glass p-8 border-white/5 relative overflow-hidden", kpi.bg)}>
                                                <div className="absolute top-0 right-0 p-10 opacity-5 -mr-4 -mt-4"><kpi.icon size={120} /></div>
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div className={cn("p-2 rounded-xl bg-white/5", kpi.color)}><kpi.icon size={18} /></div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{kpi.label}</span>
                                                </div>
                                                <div className="text-3xl font-black text-white font-mono">{kpi.val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-800 border-2 border-dashed border-white/5 rounded-[3rem]">
                                    <ShieldAlert size={80} className="mb-6 opacity-5" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-2">Workspace Standby</p>
                                    <p className="text-[9px] uppercase tracking-widest opacity-40">Select infrastructure node to initialize terminal</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ops' && (
                    <div className="grid grid-cols-2 gap-10">
                        <PlatformConfig initialStats={stats?.summary} onUpdate={fetchData} />
                        <GlobalOps settings={stats?.summary} onUpdate={fetchData} />
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="glass border-white/5 bg-white/[0.01] rounded-[2rem] overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/40">
                            <h3 className="text-2xl font-black text-white flex items-center gap-4 tracking-tighter">
                                <Terminal size={24} className="text-blue-400" /> SYSTEM AUDIT TRAIL
                            </h3>
                            <div className="px-4 py-1.5 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase rounded-full border border-blue-500/20">
                                Real-time Protocol
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[700px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[#0d1526] border-b border-white/10 z-10">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest pl-10">Timestamp</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Operator</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Action</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest">Terminal Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {logs.map((log: any) => (
                                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                                            <td className="px-10 py-5 text-[10px] text-slate-500 font-mono italic">{new Date(log.createdAt).toLocaleString()}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black border border-white/5">{log.operatorEmail?.[0].toUpperCase()}</div>
                                                    <span className="text-[11px] text-white font-bold">{log.operatorEmail}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-4 py-1.5 rounded-xl bg-blue-500/5 text-blue-400 text-[9px] font-black uppercase border border-blue-500/10 tracking-widest">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-[10px] text-slate-400 max-w-lg truncate font-mono">{log.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {demoResult && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass w-full max-w-md bg-[#0a1120] border-emerald-500/30 shadow-2xl p-10 rounded-[3rem] relative z-10 text-center">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto mb-8 border border-emerald-500/30 animate-pulse">
                                <Key size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase mb-3 tracking-tighter">Infrastructure Synced</h2>
                            <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">Demo environments provisioned for <span className="text-emerald-500 font-black">{demoResult.orgName}</span> Cluster.</p>
                            
                            <div className="space-y-4 mb-10 text-left">
                                <div className="p-6 rounded-[2rem] bg-black/60 border border-white/5 group hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => { navigator.clipboard.writeText(demoResult.mdEmail); toast.success('Access Vector Copied'); }}>
                                    <label className="text-[10px] font-black uppercase text-slate-600 mb-2 block tracking-widest">Managing Director Vector</label>
                                    <div className="flex items-center justify-between text-white font-mono text-sm">
                                        <span className="truncate mr-4">{demoResult.mdEmail}</span>
                                        <Copy size={16} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-700 uppercase font-black text-center tracking-[0.2em]">Password: Same as email (Default Mock)</p>
                            </div>
                            
                            <button onClick={() => setDemoResult(null)} className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
                                Initialize Shell
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NexusCentralConsole;
