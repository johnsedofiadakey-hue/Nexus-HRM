import React, { useEffect, useState } from 'react';
import { toast } from '../../utils/toast';
import { Building2, Plus, Search, Loader2, X, CheckCircle, Shield, ExternalLink, Users, Globe, Layout, AlertTriangle, Database, Copy, Key } from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const statusBadge: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    SUSPENDED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    OVERDUE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    currency: 'GHS',
    subscriptionPlan: 'FREE',
    primaryColor: '#4F46E5',
};

const TenantManagement = () => {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [impersonating, setImpersonating] = useState<string | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [performingBulk, setPerformingBulk] = useState(false);
    const [seedingOrgId, setSeedingOrgId] = useState<string | null>(null);
    const [demoResult, setDemoResult] = useState<{ mdEmail: string; password: string; orgName: string } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/dev/organizations');
            setOrgs(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Failed to fetch organizations:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.post('/dev/organizations', form);
            setSuccess('Organization created successfully');
            setShowCreate(false);
            setForm(emptyForm);
            fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to create organization');
        } finally {
            setSaving(false);
        }
    };

    const handleImpersonate = async (orgId: string) => {
        setImpersonating(orgId);
        try {
            const usersRes = await api.get('/dev/users');
            const targetUser = usersRes.data.find((u: any) => u.organizationId === orgId);

            if (!targetUser) {
                toast.info('No users found for this organization to impersonate');
                return;
            }

            const res = await api.post('/dev/impersonate', { userId: targetUser.id });
            const { token, user } = res.data;

            localStorage.setItem('nexus_token', token);
            localStorage.setItem('nexus_user', JSON.stringify(user));
            window.location.href = '/dashboard';
        } catch (err: any) {
            toast.info(String(err?.response?.data?.error || 'Impersonation failed'));
        } finally {
            setImpersonating(null);
        }
    };

    const handleSeedDemo = async (orgId: string, orgName: string) => {
        if (!window.confirm(`Are you sure you want to seed professional demo data into ${orgName}?`)) return;
        setSeedingOrgId(orgId);
        try {
            const res = await api.post('/dev/tenant/seed-demo', { organizationId: orgId });
            setDemoResult({ ...res.data.credentials, orgName });
            toast.success('Demo data seeded successfully!');
            fetchData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to seed demo data');
        } finally {
            setSeedingOrgId(null);
        }
    };

    const handleBulkAction = async (action: 'suspend' | 'activate' | 'delete') => {
        if (!selectedIds.length) return;
        if (action === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedIds.length} organizations? This cannot be undone.`)) return;
        
        setPerformingBulk(true);
        try {
            await api.post('/dev/tenant/bulk-action', {
                tenantIds: selectedIds,
                action
            });
            toast.success(`Bulk ${action} successful`);
            setSelectedIds([]);
            fetchData();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || `Bulk ${action} failed`);
        } finally {
            setPerformingBulk(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev: string[]) => 
            prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredOrgs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredOrgs.map((o: any) => o.id));
        }
    };

    const filteredOrgs = orgs.filter((o) =>
        `${o.name} ${o.email} ${o.city} ${o.country}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 page-enter min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white font-display tracking-tight flex items-center gap-3">
                        <Building2 size={36} className="text-primary" /> Tenant Management
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Control and monitor all SaaS client organizations
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-primary/20 text-primary border border-primary/30 flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-[0.2em] text-[10px]"
                    onClick={() => setShowCreate(true)}
                >
                    <Plus size={16} /> New Organization
                </motion.button>
            </div>

            {success && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                        <CheckCircle size={16} /> {success}
                    </span>
                    <button onClick={() => setSuccess('')} className="p-2 hover:bg-emerald-500/20 rounded-xl transition-colors">
                        <X size={14} />
                    </button>
                </motion.div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Tenants', value: orgs.length, icon: Building2, color: 'text-blue-400' },
                    { label: 'Active Subscriptions', value: orgs.filter(o => o.billingStatus === 'ACTIVE').length, icon: CheckCircle, color: 'text-emerald-400' },
                    { label: 'Overdue Payments', value: orgs.filter(o => o.billingStatus === 'OVERDUE').length, icon: AlertTriangle, color: 'text-amber-400' },
                    { label: 'Suspended', value: orgs.filter(o => o.isSuspended).length, icon: X, color: 'text-rose-400' },
                ].map((stat, idx) => (
                    <div key={idx} className="glass p-6 rounded-[2rem] border border-white/[0.05] bg-white/[0.02]">
                        <stat.icon className={cn("w-5 h-5 mb-4", stat.color)} />
                        <div className="text-3xl font-black text-white">{stat.value}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Bulk Actions Bar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] glass px-8 py-4 border-primary/30 bg-primary/10 backdrop-blur-xl rounded-[2rem] flex items-center gap-8 shadow-2xl shadow-primary/20"
                    >
                        <div className="flex items-center gap-3 border-r border-white/10 pr-8">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                {selectedIds.length}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Tenants Selected</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleBulkAction('activate')}
                                disabled={performingBulk}
                                className="px-6 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                            >
                                <CheckCircle size={12} /> Activate
                            </button>
                            <button
                                onClick={() => handleBulkAction('suspend')}
                                disabled={performingBulk}
                                className="px-6 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all flex items-center gap-2"
                            >
                                <AlertTriangle size={12} /> Suspend
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                disabled={performingBulk}
                                className="px-6 py-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/30 transition-all flex items-center gap-2"
                            >
                                <X size={12} /> Delete
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all ml-4"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search & List */}
            <div className="glass rounded-[2rem] border border-white/[0.05] overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-6 md:p-8 border-b border-white/[0.05] bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <Layout size={14} className="text-slate-500" /> Organizations
                    </h2>
                    <div className="relative w-full max-w-sm">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" />
                        <input
                            type="text"
                            className="nx-input nx-input-l py-3 text-xs w-full bg-black/40 border-white/5 font-bold focus:border-primary/50 transition-all"
                            placeholder="Search organizations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-32">
                        <Loader2 size={32} className="animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.01] border-b border-white/[0.05]">
                                    <th className="px-8 py-5 w-10">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/50"
                                            checked={selectedIds.length === filteredOrgs.length && filteredOrgs.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Organization</th>
                                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Subscription</th>
                                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Users</th>
                                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Location</th>
                                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {filteredOrgs.map((org: any) => (
                                    <tr key={org.id} className={cn("hover:bg-white/[0.02] transition-colors group", selectedIds.includes(org.id) && "bg-primary/5")}>
                                        <td className="px-8 py-5 w-10">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/50"
                                                checked={selectedIds.includes(org.id)}
                                                onChange={() => toggleSelect(org.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-lg overflow-hidden border border-white/10"
                                                    style={{ background: org.primaryColor || 'var(--primary)' }}
                                                >
                                                    {org.logoUrl ? (
                                                        <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        org.name[0].toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-white group-hover:text-primary transition-colors">{org.name}</p>
                                                    <p className="text-[10px] font-mono tracking-widest text-slate-500 mt-0.5">{org.email || 'No email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-white uppercase">{org.subscriptionPlan}</span>
                                                <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border w-fit", statusBadge[org.billingStatus] || 'bg-white/5 text-slate-400 border-white/10')}>
                                                    {org.billingStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
                                                <Users size={14} className="text-slate-600" />
                                                {org._count?.users || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col text-[10px] font-bold text-slate-400">
                                                <span className="flex items-center gap-1"><Globe size={10} className="text-slate-600" /> {org.country || 'N/A'}</span>
                                                <span className="opacity-60">{org.city || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleSeedDemo(org.id, org.name)}
                                                    disabled={seedingOrgId === org.id}
                                                    className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                                                    title="Seed Professional Demo Data"
                                                >
                                                    {seedingOrgId === org.id ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                                                    Seed
                                                </button>
                                                <button
                                                    onClick={() => handleImpersonate(org.id)}
                                                    disabled={impersonating === org.id}
                                                    className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50"
                                                >
                                                    {impersonating === org.id ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                                                    Impersonate
                                                </button>
                                                <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredOrgs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                                            No organizations found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="glass w-full max-w-2xl bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-primary/20 max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-white/[0.05] bg-black/40 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary"><Building2 size={24} /></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">New Organization</h2>
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Tenant Onboarding</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCreate(false)} className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white"><X size={24} /></button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar flex-grow bg-black/20">
                                {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</div>}

                                <form id="create-org-form" onSubmit={handleCreate} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Company Name *</label>
                                            <input type="text" className="nx-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Login/Contact Email</label>
                                            <input type="email" className="nx-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Phone</label>
                                            <input type="text" className="nx-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Currency</label>
                                            <select className="nx-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                                <option value="GHS">GHS</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Plan</label>
                                            <select className="nx-input" value={form.subscriptionPlan} onChange={e => setForm({ ...form, subscriptionPlan: e.target.value })}>
                                                <option value="FREE">Free Trial</option>
                                                <option value="PREMIUM">Premium</option>
                                                <option value="ENTERPRISE">Enterprise</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Branding Color</label>
                                            <div className="flex gap-3">
                                                <input 
                                                    type="color" 
                                                    className="w-12 h-10 rounded-lg bg-white/5 border border-white/10 cursor-pointer" 
                                                    value={(() => {
                                                        if (isValidHex(form.primaryColor)) return form.primaryColor;
                                                        if (/^#[0-9A-Fa-f]{3}$/.test(form.primaryColor)) {
                                                            const r = form.primaryColor[1]; const g = form.primaryColor[2]; const b = form.primaryColor[3];
                                                            return `#${r}${r}${g}${g}${b}${b}`;
                                                        }
                                                        return '#4F46E5';
                                                    })()} 
                                                    onChange={e => setForm({ ...form, primaryColor: e.target.value })} 
                                                />
                                                <input 
                                                    type="text" 
                                                    className="nx-input uppercase" 
                                                    value={form.primaryColor} 
                                                    onChange={e => {
                                                        let val = e.target.value;
                                                        if (val && !val.startsWith('#')) val = '#' + val;
                                                        setForm({ ...form, primaryColor: val });
                                                    }} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Country</label>
                                        <input type="text" className="nx-input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                                    </div>
                                </form>
                            </div>

                            <div className="p-8 border-t border-white/[0.05] bg-black/40 flex justify-end gap-4 shrink-0">
                                <button type="button" onClick={() => setShowCreate(false)} className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white">Cancel</button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    form="create-org-form"
                                    type="submit"
                                    className="bg-primary/20 text-primary border border-primary/30 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/20 flex items-center gap-3"
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    {saving ? 'Creating...' : 'Register Organization'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Credentials Modal */}
            <AnimatePresence>
                {demoResult && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDemoResult(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass w-full max-w-md bg-[#0a1120] border-emerald-500/20 shadow-2xl shadow-emerald-500/10 p-8 rounded-[2.5rem] relative z-10 text-center"
                        >
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6 border border-emerald-500/20">
                                <Key size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Demo Ready</h2>
                            <p className="text-sm text-slate-400 font-medium mb-8">Demo data seeded for <span className="text-white font-bold">{demoResult.orgName}</span>. Use these credentials to log in as the Managing Director.</p>
                            
                            <div className="space-y-4 mb-8 text-left">
                                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">MD Email</label>
                                    <div className="flex items-center justify-between text-white font-mono text-sm">
                                        <span>{demoResult.mdEmail}</span>
                                        <button onClick={() => { navigator.clipboard.writeText(demoResult.mdEmail); toast.success('Email copied'); }} className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><Copy size={14} /></button>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Default Password</label>
                                    <div className="flex items-center justify-between text-white font-mono text-sm">
                                        <span>{demoResult.password}</span>
                                        <button onClick={() => { navigator.clipboard.writeText(demoResult.password); toast.success('Password copied'); }} className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"><Copy size={14} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => window.open('/', '_blank')}
                                    className="bg-emerald-500 text-white w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-transform"
                                >
                                    Open Login Page
                                </button>
                                <button
                                    onClick={() => setDemoResult(null)}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors py-2"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TenantManagement;
