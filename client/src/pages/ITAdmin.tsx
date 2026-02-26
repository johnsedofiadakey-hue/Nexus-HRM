import React, { useEffect, useState } from 'react';
import { Monitor, Users, Package, Plus, RotateCcw, Shield, Search, Loader2, X, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const roleLabel: Record<string, string> = {
  MD: 'Managing Director', SUPERVISOR: 'Supervisor', EMPLOYEE: 'Employee',
  HR_ADMIN: 'HR Admin', IT_ADMIN: 'IT Admin', SUPER_ADMIN: 'Super Admin'
};

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PROBATION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  NOTICE_PERIOD: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  TERMINATED: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

const emptyForm = {
  fullName: '', email: '', role: 'EMPLOYEE', department: '', jobTitle: '',
  employeeCode: '', password: '', joinDate: '', employmentType: 'Permanent',
  gender: '', contactNumber: '', supervisorId: ''
};

const ITAdmin = () => {
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'assets'>('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [oRes, uRes] = await Promise.all([api.get('/it/overview'), api.get('/it/users')]);
      setOverview(oRes.data);
      setUsers(uRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.post('/it/users', form);
      setSuccess(res.data.message || 'User created successfully');
      setShowCreate(false); setForm(emptyForm); fetchData();
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to create user'); }
    finally { setSaving(false); }
  };

  const handlePasswordReset = async (userId: string, name: string) => {
    if (!confirm(`Reset password for ${name}? A new temporary password will be created.`)) return;
    setResettingId(userId);
    try {
      const res = await api.post(`/it/users/${userId}/reset-password`);
      alert(res.data.message);
    } catch (err: any) { alert(err?.response?.data?.error || 'Protocol failed'); }
    finally { setResettingId(null); }
  };

  const handleDeactivate = async (userId: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will lose all system access.`)) return;
    try {
      await api.patch(`/it/users/${userId}/deactivate`);
      fetchData();
    } catch (err: any) { alert(err?.response?.data?.error || 'Protocol failed'); }
  };

  const filtered = users.filter(u =>
    `${u.fullName} ${u.email} ${u.jobTitle} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = ['overview', 'accounts', 'assets'] as const;

  return (
    <div className="space-y-8 page-enter min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white font-display tracking-tight flex items-center gap-3">
             <ShieldCheck size={36} className="text-blue-500" /> IT Admin
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Manage users, roles, and system access
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 font-black uppercase tracking-[0.2em] text-[10px]" 
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} /> Add User
        </motion.button>
      </div>

      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><CheckCircle size={16} /> {success}</span>
          <button onClick={() => setSuccess('')} className="p-2 hover:bg-emerald-500/20 rounded-xl transition-colors"><X size={14} /></button>
        </motion.div>
      )}

      {/* Internal Navigation Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
        {tabs.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", 
              activeTab === tab ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" : "text-slate-500 hover:text-white hover:bg-white/5"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-32"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && overview && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Users', value: overview.totalUsers, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
                    { label: 'Active Users', value: overview.activeUsers, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
                    { label: 'Total Assets', value: overview.assets, color: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/10' },
                    { label: 'Available Assets', value: overview.availableAssets, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
                  ].map((stat, idx) => (
                    <motion.div 
                      key={stat.label} 
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }}
                      className={cn("p-6 md:p-8 rounded-[2rem] border relative overflow-hidden", stat.bg, stat.border)}
                    >
                      <div className={cn("text-4xl md:text-5xl font-black font-display mb-2 drop-shadow-lg", stat.color)}>{stat.value}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="glass rounded-[2rem] border border-white/[0.05] overflow-hidden">
                  <div className="p-6 md:p-8 border-b border-white/[0.05] bg-black/20">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                       <Users size={14} className="text-slate-500" /> Recently Added Users
                    </h2>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.01] border-b border-white/[0.05]">
                           <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">User</th>
                           <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Role</th>
                           <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Status</th>
                           <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Date Added</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {overview.recentAccounts?.map((u: any) => (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-8 py-5">
                              <p className="font-bold text-sm text-white">{u.fullName}</p>
                              <p className="text-[10px] font-mono tracking-widest text-slate-500 mt-0.5">{u.email}</p>
                            </td>
                            <td className="px-6 py-5"><span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-white/5 text-slate-400 border border-white/10">{roleLabel[u.role] || u.role}</span></td>
                            <td className="px-6 py-5"><span className={cn("px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border", statusBadge[u.status] || 'bg-white/5 text-slate-400 border-white/10')}>{u.status}</span></td>
                            <td className="px-8 py-5 text-[10px] font-mono tracking-widest text-slate-600">{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ACCOUNTS TAB */}
            {activeTab === 'accounts' && (
              <div className="glass rounded-[2rem] border border-white/[0.05] overflow-hidden flex flex-col min-h-[600px]">
                <div className="p-6 md:p-8 border-b border-white/[0.05] bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                     <Users size={14} className="text-slate-500" /> All Users
                  </h2>
                  <div className="relative w-full max-w-sm">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500/50" />
                    <input 
                       type="text" 
                       className="nx-input pl-10 py-3 text-xs w-full bg-black/40 border-white/5 font-bold focus:border-blue-500/50 transition-all font-mono tracking-widest" 
                       placeholder="Search users..." 
                       value={search} 
                       onChange={e => setSearch(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar flex-grow">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.01] border-b border-white/[0.05]">
                         <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">User</th>
                         <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Role</th>
                         <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Status</th>
                         <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Department</th>
                         <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {filtered.map((u: any) => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-lg shrink-0"
                                style={{ background: 'linear-gradient(135deg, var(--primary), #3b82f6)' }}>
                                {u.fullName[0]}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">{u.fullName}</p>
                                <p className="text-[10px] font-mono tracking-widest text-slate-500 mt-0.5">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5"><span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">{roleLabel[u.role] || u.role}</span></td>
                          <td className="px-6 py-5"><span className={cn("px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border", statusBadge[u.status] || 'bg-white/5 text-slate-400 border-white/10')}>{u.status}</span></td>
                          <td className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{u.departmentObj?.name || '—'}</td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handlePasswordReset(u.id, u.fullName)}
                                disabled={resettingId === u.id}
                                className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-300"
                              >
                                {resettingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                Reset Password
                              </button>
                              {u.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleDeactivate(u.id, u.fullName)}
                                  className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300"
                                >
                                  <Shield size={12} /> Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={5} className="text-center py-20 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No users found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ASSETS TAB */}
            {activeTab === 'assets' && (
              <div className="glass p-20 rounded-[3rem] border border-white/[0.05] text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <Package size={80} className="mx-auto mb-8 text-blue-500/20 drop-shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover:scale-110 transition-transform duration-700" />
                <p className="text-3xl font-black text-white font-display mb-3 tracking-tight">Asset Management</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-10 max-w-sm mx-auto">Manage company assets in the dedicated module.</p>
                <a href="/assets" className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-500/30 transition-all font-mono">
                  <Package size={14} /> Go to Assets
                </a>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Initialize Identity Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="glass w-full max-w-3xl bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-blue-500/20 max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/[0.05] bg-black/40 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 shadow-lg"><Plus size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">Add New User</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">User Details & Access</p>
                  </div>
                </div>
                <button onClick={() => setShowCreate(false)} className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={24} /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-grow bg-black/20">
                {error && <div className="mb-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</div>}

                <form id="create-identity-form" onSubmit={handleCreate} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { k: 'fullName', l: 'Full Name *', t: 'text' },
                      { k: 'email', l: 'Email Address *', t: 'email' },
                      { k: 'jobTitle', l: 'Job Title *', t: 'text' },
                      { k: 'employeeCode', l: 'Employee ID (Optional)', t: 'text' },
                      { k: 'contactNumber', l: 'Phone Number', t: 'text' },
                      { k: 'joinDate', l: 'Join Date', t: 'date' },
                    ].map(({ k, l, t }) => (
                      <div key={k}>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">{l}</label>
                        <input type={t} className="nx-input p-4 font-bold tracking-widest text-sm" required={l.includes('*')}
                          value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-3">Role</label>
                      <select className="nx-input p-4 font-bold tracking-widest text-sm appearance-none" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="HR_ADMIN">HR Admin</option>
                        <option value="IT_ADMIN">IT Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/70 ml-1 mb-3">Initial Password *</label>
                      <input type="password" className="nx-input p-4 font-bold tracking-[0.3em] text-sm border-emerald-500/30 focus:border-emerald-500 bg-emerald-500/5" required value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <AlertTriangle size={20} className="text-blue-500 flex-shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 leading-relaxed">
                      Creating a user will generate a system profile. You will need to share the initial password with the user. Additional details like Salary and Leave must be added in the HR module.
                    </p>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-white/[0.05] bg-black/40 flex justify-end gap-4 shrink-0">
                <button type="button" onClick={() => setShowCreate(false)} className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} form="create-identity-form" type="submit" className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-blue-500/20 flex items-center gap-3" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {saving ? 'Saving...' : 'Save User'}
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
