import React, { useEffect, useState } from 'react';
import { Building2, Save, Loader2, CheckCircle, X, Globe, DollarSign, Palette, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const CompanySettings = () => {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            // For multi-tenancy, the organizationId is inferred from the token/session
            const res = await api.get('/settings/organization');
            setSettings(res.data && typeof res.data === "object" ? res.data : {});
        } catch (e) {
            console.error('Failed to fetch settings:', e);
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await api.patch('/settings/organization', settings);
            setSuccess('Settings updated successfully');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-32"><Loader2 size={32} className="animate-spin text-primary" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-12 page-enter pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white font-display tracking-tight flex items-center gap-3">
                        <Building2 size={36} className="text-primary" /> Company Settings
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Customize your organization's Nexus HRM instance
                    </p>
                </div>
            </div>

            {(success || error) && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-between",
                        success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    )}
                >
                    <span className="flex items-center gap-3">
                        {success ? <CheckCircle size={16} /> : <X size={16} />}
                        {success || error}
                    </span>
                    <button onClick={() => { setSuccess(''); setError(''); }} className="p-2 hover:bg-white/5 rounded-xl"><X size={14} /></button>
                </motion.div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* Core Identity */}
                <section className="glass p-8 md:p-10 rounded-[2.5rem] border border-white/[0.05] bg-white/[0.02]">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">
                        <Globe size={14} /> Global Identity
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Organization Name</label>
                            <input
                                type="text"
                                className="nx-input"
                                value={settings?.name || ''}
                                onChange={e => setSettings({ ...settings, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Default Currency</label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                <select
                                    className="nx-input pl-10"
                                    value={settings?.currency || 'GHS'}
                                    onChange={e => setSettings({ ...settings, currency: e.target.value })}
                                >
                                    <option value="GHS">GHS (₵)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Visual Identity */}
                <section className="glass p-8 md:p-10 rounded-[2.5rem] border border-white/[0.05] bg-white/[0.02]">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">
                        <Palette size={14} /> Brand Aesthetics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Primary Theme Color</label>
                                <div className="flex gap-4">
                                    <input
                                        type="color"
                                        className="w-16 h-12 rounded-2xl bg-white/5 border border-white/10 cursor-pointer overflow-hidden"
                                        value={settings?.primaryColor || '#4F46E5'}
                                        onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        className="nx-input flex-1 uppercase font-mono"
                                        value={settings?.primaryColor || '#4F46E5'}
                                        onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 italic">
                                This color will be used for buttons, active states, and highlights throughout your dashboard.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Company Logo URL</label>
                            <div className="relative">
                                <ImageIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    className="nx-input pl-10"
                                    placeholder="https://your-cdn.com/logo.png"
                                    value={settings?.logoUrl || ''}
                                    onChange={e => setSettings({ ...settings, logoUrl: e.target.value })}
                                />
                            </div>
                            {settings?.logoUrl && (
                                <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center">
                                    <img src={settings.logoUrl} alt="Logo Preview" className="h-10 object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <div className="flex justify-end p-6">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={saving}
                        className="bg-primary text-white flex items-center gap-3 px-10 py-5 rounded-[2rem] shadow-2xl shadow-primary/30 font-black uppercase tracking-[0.2em] text-[11px]"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Synchronizing...' : 'Save Configuration'}
                    </motion.button>
                </div>
            </form>
        </div>
    );
};

export default CompanySettings;
