import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Camera, Lock, CheckCircle2, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredUser } from '../utils/session';
import api from '../services/api';
import { cn } from '../utils/cn';
import HistoryLog from '../components/profile/HistoryLog';
import { useTranslation } from 'react-i18next';

const Profile = () => {
    const user = getStoredUser();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [activeTab, setActiveTab] = useState<'info' | 'security' | 'history'>('info');
    const [history, setHistory] = useState<any[]>([]);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user.id) return;
            try {
                const res = await api.get(`/users/${user.id}`);
                setFormData(d => ({
                    ...d,
                    fullName: res.data.fullName,
                    email: res.data.email,
                    phone: res.data.contactNumber || ''
                }));
                setHistory(res.data.historyLogs || []);
            } catch (err) {
                console.error('Failed to fetch profile', err);
            }
        };
        fetchProfile();
    }, [user.id]);

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.patch(`/users/${user.id}`, {
                fullName: formData.fullName,
                contactNumber: formData.phone
            });
            setSuccess('Profile updated successfully.');
            // Update local storage if fields changed
            const stored = JSON.parse(localStorage.getItem('nexus_user') || '{}');
            stored.name = formData.fullName;
            stored.contactNumber = formData.phone;
            localStorage.setItem('nexus_user', JSON.stringify(stored));
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            return setError('Passwords do not match.');
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            setSuccess('Password changed successfully.');
            setFormData(d => ({ ...d, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-transition space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight mb-2">My Profile</h1>
                    <p className="text-[var(--text-secondary)] font-medium">Manage your personal information and security settings</p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] backdrop-blur-md flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Account Verified</span>
                </div>
            </div>

            <AnimatePresence>
                {(error || success) && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cn(
                            "p-4 rounded-2xl border flex items-center gap-4 text-xs font-black uppercase tracking-widest",
                            error ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        )}
                    >
                        {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                        {error || success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Matrix Tabs */}
            <div className="flex border-b border-[var(--border-subtle)]/30 gap-6 sm:gap-10 overflow-x-auto no-scrollbar">
                {(['info', 'security', 'history'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={cn("pb-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap",
                        activeTab === tab ? "text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}>
                        {t(`common.${tab}`)}
                        {activeTab === tab && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]" />}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="nx-card p-8 text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 opacity-30" />

                        <div className="relative mt-8 mb-6 inline-block">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] p-1 shadow-2xl shadow-[var(--primary)]/20 transition-transform group-hover:scale-105 duration-500">
                                <div className="w-full h-full rounded-[2.4rem] bg-[var(--bg-card)] flex items-center justify-center overflow-hidden">
                                    <User size={64} className="text-[var(--text-muted)]" />
                                </div>
                            </div>
                            <button className="absolute bottom-0 right-0 w-10 h-10 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] border-4 border-[var(--bg-card)] flex items-center justify-center hover:scale-110 transition-all shadow-xl">
                                <Camera size={16} />
                            </button>
                        </div>

                        <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-1">{user?.name}</h2>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--primary)] mb-6">{user?.role?.replace('_', ' ')}</p>

                        <div className="space-y-3 pt-6 border-t border-[var(--border-subtle)] mx-4">
                            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-xs py-2">
                                <Building2 size={14} className="text-[var(--text-muted)]" />
                                <span className="font-bold flex-1 text-left">Organization</span>
                                <span className="text-[var(--text-primary)] font-black">{user?.organizationId}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-xs py-2">
                                <Shield size={14} className="text-[var(--text-muted)]" />
                                <span className="font-bold flex-1 text-left">Security Level</span>
                                <span className="text-amber-500 font-black">Grade {user?.rank || 50}</span>
                            </div>
                        </div>
                    </div>

                    <div className="nx-card p-8 space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Security Status</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">2FA Enabled</p>
                                    <p className="text-[9px] font-bold text-[var(--text-secondary)]">Enhanced account protection</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">Identity Verified</p>
                                    <p className="text-[9px] font-bold text-[var(--text-secondary)]">Government ID approved</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Forms / Content Area */}
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' && (
                            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                <div className="nx-card p-8 md:p-10">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Personal Information</h3>
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Update your contact details</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleUpdateInfo} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Full Name</label>
                                                <div className="relative group">
                                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-all" />
                                                    <input
                                                        type="text"
                                                        value={formData.fullName}
                                                        onChange={e => setFormData(d => ({ ...d, fullName: e.target.value }))}
                                                        className="nx-input pl-12"
                                                        placeholder="Your Name"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Email Terminal</label>
                                                <div className="relative group grayscale opacity-60">
                                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                    <input
                                                        type="email"
                                                        value={formData.email}
                                                        readOnly
                                                        className="nx-input pl-12 bg-[var(--bg-elevated)]/50 cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Phone Number</label>
                                                <div className="relative group">
                                                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-all" />
                                                    <input
                                                        type="tel"
                                                        value={formData.phone}
                                                        onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                                                        className="nx-input pl-12"
                                                        placeholder="+233 XX XXX XXXX"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn-primary px-10 py-4 flex items-center gap-3 disabled:opacity-50"
                                            >
                                                {loading && <Loader2 size={16} className="animate-spin" />}
                                                <span>Save Changes</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div key="security" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                <div className="nx-card p-8 md:p-10">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                            <Lock size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Security Credentials</h3>
                                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Rotate your security key regularly</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleChangePassword} className="space-y-6">
                                        <div className="space-y-2 max-w-md">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Current Password</label>
                                            <input
                                                type="password"
                                                value={formData.currentPassword}
                                                onChange={e => setFormData(d => ({ ...d, currentPassword: e.target.value }))}
                                                className="nx-input"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">New Password</label>
                                                <input
                                                    type="password"
                                                    value={formData.newPassword}
                                                    onChange={e => setFormData(d => ({ ...d, newPassword: e.target.value }))}
                                                    className="nx-input"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={e => setFormData(d => ({ ...d, confirmPassword: e.target.value }))}
                                                    className="nx-input"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn-primary bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 px-10 py-4 flex items-center gap-3 disabled:opacity-50"
                                            >
                                                {loading && <Loader2 size={16} className="animate-spin" />}
                                                <span>Rotate Key</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'history' && (
                            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <HistoryLog logs={history} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Profile;
