import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../utils/toast';
import { 
  Users, Package, Plus, RotateCcw, Shield, 
  Search, Loader2, AlertTriangle, 
  ShieldCheck, Zap, Activity,
  Database, Key, Lock, Server, Cpu, ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';

const roleLabel: Record<string, string> = {
  DEV: 'Sys Developer (L100)', MD: 'Managing Director (L90)', DIRECTOR: 'Director (L80)',
  HR_OFFICER: 'HR Officer (L85)', IT_MANAGER: 'IT Manager (L85)',
  MANAGER: 'Global Manager (L70)', SUPERVISOR: 'Supervisor (L60)', STAFF: 'Personnel (L40)', CASUAL: 'Adjunct (L30)'
};

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
  PROBATION: 'bg-amber-500/5 text-amber-600 border-amber-500/10',
  NOTICE_PERIOD: 'bg-indigo-500/5 text-indigo-600 border-indigo-500/10',
  TERMINATED: 'bg-rose-500/5 text-rose-600 border-rose-500/10'
};

const emptyForm = {
  fullName: '', email: '', role: 'STAFF', department: '', jobTitle: '',
  employeeCode: '', password: '', joinDate: '', employmentType: 'Permanent',
  gender: '', contactNumber: '', supervisorId: ''
};

const ITAdmin = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'assets'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, uRes] = await Promise.all([api.get('/it/overview'), api.get('/it/users')]);
      setOverview(oRes.data || null);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await api.post('/it/users', form);
      toast.success(res.data.message || t('it_admin.success_create'));
      setShowCreate(false); setForm(emptyForm); fetchData();
    } catch (err: any) { setError(err?.response?.data?.message || t('common.error')); }
    finally { setSaving(false); }
  };

  const handlePasswordReset = async (userId: string, name: string) => {
    setResettingId(userId);
    try {
      await api.post(`/it/users/${userId}/reset-password`);
      toast.success(`${t('it_admin.success_reset')}: ${name}`);
    } catch (err: any) { toast.error(String(err?.response?.data?.error || t('common.error'))); }
    finally { setResettingId(null); }
  };

  const handleDeactivate = async (userId: string, name: string) => {
    try {
      await api.patch(`/it/users/${userId}/deactivate`);
      fetchData();
      toast.success(`${t('it_admin.success_deactivate')}: ${name}`);
    } catch (err: any) { toast.error(String(err?.response?.data?.error || t('common.error'))); }
  };

  const filtered = users.filter(u =>
    `${u.fullName} ${u.email} ${u.jobTitle} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-32">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('it_admin.title')}</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--primary)] opacity-60" />
            {t('it_admin.subtitle')}
          </p>
        </motion.div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[var(--bg-elevated)]/50 p-1.5 rounded-2xl border border-[var(--border-subtle)]">
             {(['overview', 'accounts', 'assets'] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)}
                 className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 activeTab === tab ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                 {tab === 'overview' ? t('it_admin.overview') : tab === 'accounts' ? t('it_admin.accounts') : t('it_admin.assets')}
               </button>
             ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} /> {t('it_admin.provision_user')}
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 flex flex-col items-center gap-6">
                <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Accessing central governance matrix</p>
             </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
            {activeTab === 'overview' && overview && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                      { label: t('it_admin.total_users'), value: overview.totalUsers, icon: Users, color: 'text-indigo-600 bg-indigo-500/5' },
                      { label: t('it_admin.active_users'), value: overview.activeUsers, icon: Zap, color: 'text-emerald-600 bg-emerald-500/5' },
                      { label: t('it_admin.total_assets'), value: overview.assets, icon: Package, color: 'text-blue-600 bg-blue-500/5' },
                      { label: t('it_admin.available_assets'), value: overview.availableAssets, icon: Cpu, color: 'text-amber-600 bg-amber-500/5' },
                    ].map((s, idx) => (
                      <motion.div 
                        key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                        className="nx-card p-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden group"
                      >
                         <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[var(--primary)]/5 blur-[40px] group-hover:scale-125 transition-transform" />
                         <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-[var(--border-subtle)]/50 shadow-sm", s.color)}>
                             <s.icon size={20} />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-60">{s.label}</p>
                         <h4 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{s.value}</h4>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="nx-card p-8 border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 relative overflow-hidden group">
                       <div className="flex items-center justify-between mb-8">
                         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-3">
                           <Database className="text-blue-500" size={16} /> Cloud Vault Governance
                         </h3>
                         <span className={cn(
                           "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                           overview.vaultStatus?.status === 'Healthy' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10" : "bg-rose-500/5 text-rose-500 border-rose-500/10"
                         )}>
                           {overview.vaultStatus?.status || 'Unknown'}
                         </span>
                       </div>
                       
                       <div className="space-y-6">
                         <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                           <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">Encryption Sync</span>
                           <span className="text-[12px] font-black text-[var(--text-primary)]">{overview.vaultStatus?.status === 'Healthy' ? 'ACTIVE' : 'OFFLINE'}</span>
                         </div>
                         <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                           <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">Key Registry</span>
                           <span className="text-[12px] font-black text-[var(--text-primary)]">{overview.vaultStatus?.status === 'Disconnected' ? 'MISSING' : 'SECURED'}</span>
                         </div>
                         {overview.vaultStatus?.message && (
                           <p className="text-[10px] text-rose-500 font-bold italic pt-2">! {overview.vaultStatus.message}</p>
                         )}
                       </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="nx-card p-8 border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 relative overflow-hidden group">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-3 mb-8">
                         <Cpu className="text-amber-500" size={16} /> Cluster Telemetry
                       </h3>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                           <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Runtime</p>
                           <p className="text-[14px] font-black text-[var(--text-primary)]">Node {overview.systemHealth?.nodeVersion}</p>
                         </div>
                         <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                           <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">DB State</p>
                           <p className="text-[14px] font-black text-emerald-500">OPTIMAL</p>
                         </div>
                         <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] col-span-2">
                           <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Architecture</p>
                           <p className="text-[12px] font-black text-[var(--text-primary)]">{overview.systemHealth?.platform?.toUpperCase()} · Uptime {Math.floor(overview.systemHealth?.uptime / 3600)}h {Math.floor((overview.systemHealth?.uptime % 3600) / 60)}m</p>
                         </div>
                       </div>
                    </motion.div>
                  </div>

                  <div className="nx-card border-[var(--border-subtle)] overflow-hidden">
                    <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex items-center justify-between">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] flex items-center gap-3">
                          <Activity className="text-indigo-500" size={16} /> {t('it_admin.recent_accounts')}
                       </h3>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="nx-table nexus-responsive-table">
                           <thead>
                              <tr className="bg-[var(--bg-elevated)]/10">
                                 <th className="px-10 py-6">{t('it_admin.employee_name')}</th>
                                 <th className="py-6">{t('it_admin.role')}</th>
                                 <th className="py-6">{t('it_admin.status')}</th>
                                 <th className="px-10 py-6 text-right">{t('it_admin.joined')}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-[var(--border-subtle)]/30">
                              {overview.recentAccounts?.map((u: any, i: number) => (
                                 <motion.tr key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity:1, x: 0 }} transition={{ delay: i*0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                    <td className="px-10 py-6">
                                       <div>
                                          <p className="text-[13px] font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors uppercase">{u.fullName}</p>
                                          <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mt-1 italic">{u.email}</p>
                                       </div>
                                    </td>
                                    <td className="py-6" data-label={t('it_admin.role')}><span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">{roleLabel[u.role] || u.role}</span></td>
                                    <td className="py-6" data-label={t('it_admin.status')}><span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", statusBadge[u.status] || 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>{u.status}</span></td>
                                    <td className="px-10 py-6 text-right font-mono text-[11px] font-bold text-[var(--text-muted)] tracking-wider" data-label={t('it_admin.joined')}>{new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                                 </motion.tr>
                              ))}
                           </tbody>
                        </table>
                    </div>
                  </div>
                </>
            )}

            {activeTab === 'accounts' && (
                <div className="nx-card border-[var(--border-subtle)] overflow-hidden flex flex-col min-h-[600px]">
                   <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 flex flex-col sm:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                            <Database size={20} />
                         </div>
                         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">{t('it_admin.account_list')}</h3>
                      </div>
                      <div className="relative w-full max-w-sm group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                        <input 
                           type="text" 
                           className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl pl-12 pr-4 py-2.5 text-[11px] font-bold text-[var(--text-primary)] focus:border-[var(--primary)] outline-none" 
                           placeholder={t('it_admin.search_placeholder')} 
                           value={search} 
                           onChange={e => setSearch(e.target.value)} 
                        />
                      </div>
                   </div>

                   <div className="overflow-x-auto custom-scrollbar flex-grow">
                      <table className="nx-table nexus-responsive-table">
                         <thead>
                            <tr className="bg-[var(--bg-elevated)]/10">
                               <th className="px-10 py-6">{t('it_admin.employee_name')}</th>
                               <th className="py-6">{t('it_admin.role')}</th>
                               <th className="py-6">{t('it_admin.status')}</th>
                               <th className="py-6">{t('it_admin.department')}</th>
                               <th className="px-10 py-6 text-right">{t('it_admin.actions')}</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {filtered.map((u: any, i: number) => (
                               <motion.tr key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                  <td className="px-10 py-6" data-label={t('it_admin.employee_name')}>
                                     <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-black text-sm shadow-xl group-hover:scale-105 transition-transform">
                                           {u.fullName[0]}
                                        </div>
                                        <div>
                                           <p className="text-[13px] font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors uppercase">{u.fullName}</p>
                                           <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mt-1 italic">{u.email}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-6" data-label={t('it_admin.role')}><span className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-[var(--bg-elevated)] text-[var(--primary)] border border-[var(--primary)]/20 shadow-sm">{roleLabel[u.role] || u.role}</span></td>
                                  <td className="py-6" data-label={t('it_admin.status')}><span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm", statusBadge[u.status] || 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>{u.status}</span></td>
                                  <td className="py-6 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)] italic" data-label={t('it_admin.department')}>{u.departmentObj?.name || 'CENTRAL_HUB'}</td>
                                  <td className="px-10 py-6 text-right" data-label={t('it_admin.actions')}>
                                     <div className="flex justify-end gap-3 text-[10px] font-black uppercase tracking-widest transition-all">
                                        <motion.button 
                                           whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                           onClick={() => handlePasswordReset(u.id, u.fullName)}
                                           disabled={resettingId === u.id}
                                           className="px-6 h-10 rounded-xl bg-indigo-500/5 text-indigo-600 border border-indigo-500/20 flex items-center gap-3 active:bg-indigo-500 active:text-white transition-all"
                                        >
                                           {resettingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                           Reset Access
                                        </motion.button>
                                        {u.status === 'ACTIVE' && (
                                           <motion.button 
                                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                              onClick={() => handleDeactivate(u.id, u.fullName)}
                                              className="px-6 h-10 rounded-xl bg-rose-500/5 text-rose-600 border border-rose-500/20 flex items-center gap-3 active:bg-rose-500 active:text-white transition-all"
                                           >
                                              <Lock size={14} /> {t('it_admin.deactivate')}
                                           </motion.button>
                                        )}
                                     </div>
                                  </td>
                               </motion.tr>
                            ))}
                            {filtered.length === 0 && (
                               <tr><td colSpan={5} className="py-40 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30 italic">No identity nodes detected in registry</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
            )}

            {activeTab === 'assets' && (
                 <div className="nx-card p-24 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] text-center relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-1/2 h-full bg-[var(--primary)]/5 blur-[120px] pointer-events-none" />
                   <Server size={80} className="mx-auto mb-10 text-[var(--primary)] opacity-20 group-hover:scale-110 transition-transform duration-700" />
                   <h3 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-4">{t('it_admin.assets_redirect')}</h3>
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-12 max-w-sm mx-auto opacity-60">{t('it_admin.assets_desc')}</p>
                   <Link to="/assets" className="inline-flex items-center gap-4 px-10 h-14 rounded-2xl bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:gap-6 transition-all">
                      {t('it_admin.go_to_assets')} <ArrowRight size={18} />
                   </Link>
                 </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity Modals */}
      <AnimatePresence>
        {showCreate && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl" />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                  className="nx-card w-full max-w-3xl bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl p-12 relative max-h-[90vh]"
               >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-[40px] rounded-full" />
                 <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-10 border-b border-[var(--border-subtle)] pb-8">Establish Identity Protocol</h2>
                 
                 <div className="overflow-y-auto custom-scrollbar flex-grow space-y-10 py-2">
                    {error && <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest">{error}</div>}
                    
                    <form id="create-identity-form" onSubmit={handleCreate} className="space-y-10">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {[
                             { k: 'fullName', l: 'Legal Identity *', t: 'text' },
                             { k: 'email', l: 'Secure Transmission Node *', t: 'email' },
                             { k: 'jobTitle', l: 'Strategic Designation *', t: 'text' },
                             { k: 'employeeCode', l: 'Personnel ID Code', t: 'text' },
                             { k: 'contactNumber', l: 'Uplink Uplink', t: 'text' },
                             { k: 'joinDate', l: 'Deployment Date', t: 'date' },
                          ].map(({ k, l, t }) => (
                             <div key={k} className="space-y-3">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{l}</label>
                                <input type={t} className="nx-input" required={l.includes('*')}
                                  value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                             </div>
                          ))}
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('it_admin.access_level')}</label>
                             <div className="relative group">
                                <select className="nx-input appearance-none bg-[var(--bg-elevated)]/50 pr-12 font-bold" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                   <option value="STAFF">Personnel (L40)</option>
                                   <option value="IT_MANAGER">IT Manager (L85)</option>
                                   <option value="HR_OFFICER">HR Officer (L85)</option>
                                   <option value="MANAGER">Global Manager (L70)</option>
                                   <option value="DIRECTOR">Director (L80)</option>
                                   <option value="SUPERVISOR">Supervisor (L60)</option>
                                </select>
                                <Shield size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none opacity-60" />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-indigo-500/70 uppercase tracking-[0.2em] ml-2">{t('it_admin.password')}</label>
                             <div className="relative group">
                                <input type="password" className="nx-input border-indigo-500/30 focus:border-indigo-500 bg-indigo-500/5" required value={form.password}
                                  onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                                <Key size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none opacity-60" />
                             </div>
                          </div>
                       </div>

                       <div className="flex items-start gap-5 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                          <AlertTriangle size={24} className="text-amber-500 flex-shrink-0" />
                          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[var(--text-muted)] leading-relaxed">
                             {t('it_admin.warning')}
                          </p>
                       </div>
                    </form>
                 </div>
                 
                 <div className="flex gap-6 pt-10 border-t border-[var(--border-subtle)]/30">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex-1 h-14 rounded-2xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all">{t('it_admin.cancel')}</button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} form="create-identity-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 transition-all" disabled={saving}>
                       {saving ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                       {saving ? t('common.saving') : t('it_admin.save')}
                    </motion.button>
                 </div>
               </motion.div>
             </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ITAdmin;
