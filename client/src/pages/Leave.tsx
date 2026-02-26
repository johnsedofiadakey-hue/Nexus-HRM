import React, { useEffect, useState } from 'react';
import { Calendar, Plus, X, Loader2, CheckCircle, XCircle, Clock, AlertCircle, ArrowRight, ShieldCheck, Umbrella, HeartPulse, Baby, UserMinus, HelpingHand } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const statusConfig: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  PENDING_RELIEVER: { label: 'Awaiting Reliever', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  PENDING_MANAGER: { label: 'Awaiting Manager', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
  APPROVED: { label: 'Approved', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  REJECTED: { label: 'Rejected', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: XCircle },
  CANCELLED: { label: 'Cancelled', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: XCircle },
};

const leaveTypeIcons: Record<string, React.ElementType> = {
  Annual: Umbrella,
  Sick: HeartPulse,
  Maternity: Baby,
  Paternity: Baby,
  Compassionate: HelpingHand,
  Unpaid: UserMinus,
};

const Leave = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>({ leaveBalance: 0, leaveAllowance: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, balanceRes] = await Promise.all([
        api.get('/leave/my'),
        api.get('/leave/balance')
      ]);
      setLeaves(leavesRes.data.leaves || leavesRes.data);
      setBalance(balanceRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/users');
      const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
      setEmployees(res.data.filter((e: any) => e.id !== user.id));
    } catch (e) {}
  };

  useEffect(() => { fetchData(); fetchEmployees(); }, []);

  const balancePct = Math.min(100, ((balance.leaveBalance / (balance.leaveAllowance || 24)) * 100));

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/leave/apply', form);
      setShowModal(false); setForm({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual' });
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit leave request');
    } finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/leave/${id}/cancel`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to cancel leave request');
    }
  };

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Leave Management</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <Clock size={14} className="text-primary-light" />
            Manage your time off
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs" 
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} /> Request Leave
        </motion.button>
      </div>

      {/* Persistence Grid (Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <Calendar size={80} className="text-primary-light" />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <ShieldCheck className="text-primary-light" size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Leave Balance</span>
          </div>
          <div className="text-5xl font-black text-white font-display tracking-tight mb-2">
            {balance.leaveBalance?.toFixed(1)} <span className="text-xl text-slate-600 font-bold uppercase tracking-widest">Days</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Out of {balance.leaveAllowance} Total Allowance</p>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${balancePct}%` }}
              transition={{ duration: 1, ease: 'circOut' }}
              className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
            />
          </div>
        </motion.div>

        {[
          { label: 'Pending Approval', value: leaves.filter(l => l.status?.includes('PENDING')).length, color: 'text-amber-400', icon: Clock },
          { label: 'Approved Leave', value: leaves.filter(l => l.status === 'APPROVED').length, color: 'text-emerald-400', icon: CheckCircle },
        ].map((s, i) => (
          <motion.div 
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (i + 1) }}
            className="glass p-8 flex flex-col justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5", s.color)}>
                <s.icon size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{s.label}</span>
            </div>
            <div className={cn("text-5xl font-black font-display tracking-tight mt-6", s.color)}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Request Archive Architecture */}
      <div className="glass overflow-hidden border-white/[0.05]">
        <div className="px-8 py-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Leave History</h2>
            <div className="w-1.5 h-1.5 rounded-full bg-primary-light shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {leaves.length} Records
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-light" />
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="nx-table">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Leave Type</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Date Range</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-center">Duration</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Reason</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                <AnimatePresence>
                  {leaves.map((leave, i) => {
                    const cfg = statusConfig[leave.status] || { label: leave.status, badge: 'bg-white/5 text-slate-400 border-white/10', icon: AlertCircle };
                    const StatusIcon = cfg.icon;
                    const TypeIcon = leaveTypeIcons[leave.leaveType] || Umbrella;
                    const canCancel = leave.status === 'PENDING_RELIEVER' || leave.status === 'PENDING_MANAGER';
                    
                    return (
                      <motion.tr 
                        key={leave.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary-light transition-all">
                               <TypeIcon size={18} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-white">{leave.leaveType} Leave</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                             <span className="text-xs font-medium text-slate-300">{new Date(leave.startDate).toLocaleDateString()}</span>
                             <ArrowRight size={12} className="text-slate-600" />
                             <span className="text-xs font-medium text-slate-300">{new Date(leave.endDate).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-xs font-black text-primary-light">{leave.leaveDays} <span className="text-[10px] uppercase text-slate-500">Days</span></span>
                        </td>
                        <td className="px-6 py-5 max-w-xs">
                           <p className="text-xs text-slate-400 truncate font-medium group-hover:text-slate-200 transition-colors">{leave.reason}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit", cfg.badge)}>
                            <StatusIcon size={12} /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {canCancel && (
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCancel(leave.id)} 
                              className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors shadow-lg shadow-rose-500/5"
                            >
                              Cancel Request
                            </motion.button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {!loading && leaves.length === 0 && (
                   <tr>
                     <td colSpan={6} className="py-24 text-center">
                        <Calendar size={48} className="mx-auto mb-4 opacity-10 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No leave records found</p>
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deployment Modal (Apply) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="glass w-full max-w-2xl bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-primary/20"
            >
              <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg">
                    <Umbrella className="text-primary-light" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white font-display tracking-tight">Request Leave</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Submit a new leave request</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8">
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    <AlertCircle size={18} /> {error}
                  </div>
                )}

                <form onSubmit={handleApply} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Leave Type</label>
                      <select className="nx-input p-4 appearance-none" value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}>
                        {['Annual', 'Sick', 'Maternity', 'Paternity', 'Compassionate', 'Unpaid'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Reliever</label>
                       <select className="nx-input p-4 appearance-none" value={form.relieverId} onChange={e => setForm({ ...form, relieverId: e.target.value })}>
                         <option value="">None required</option>
                         {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                       </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Start Date</label>
                      <input type="date" className="nx-input p-4" required min={new Date().toISOString().split('T')[0]}
                        value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">End Date</label>
                      <input type="date" className="nx-input p-4" required min={form.startDate || new Date().toISOString().split('T')[0]}
                        value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Reason for Leave</label>
                    <textarea className="nx-input resize-none p-4 min-h-[120px]" required placeholder="Provide a brief reason for your leave request..."
                      value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t border-white/[0.05]">
                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      className="btn-primary px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/30" 
                      disabled={saving}
                    >
                      {saving ? (
                        <div className="flex items-center gap-3">
                           <Loader2 size={16} className="animate-spin" /> Sending...
                        </div>
                      ) : 'Submit Request'}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leave;
