import React, { useEffect, useState, useCallback } from 'react';
import { toast } from '../utils/toast';
import { 
  Calendar, Plus, CheckCircle, XCircle, Clock, 
  ShieldCheck, Umbrella, HeartPulse, Baby, 
  UserMinus, HelpingHand, Users, ChevronRight,
  Info, AlertCircle, FileText, Send
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser } from '../utils/session';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; badge: string; icon: React.ElementType; color: string }> = {
  SUBMITTED: { label: 'Pending Handover', badge: 'bg-amber-500/5 text-amber-600 border-amber-500/10', icon: Clock, color: 'text-amber-500' },
  PENDING_RELIEVER: { label: 'Awaiting Reliever', badge: 'bg-amber-500/5 text-amber-600 border-amber-500/10', icon: Clock, color: 'text-amber-500' },
  RELIEVER_ACCEPTED: { label: 'Reliever Accepted', badge: 'bg-blue-500/5 text-blue-600 border-blue-500/10', icon: CheckCircle, color: 'text-blue-500' },
  RELIEVER_DECLINED: { label: 'Reliever Declined', badge: 'bg-rose-500/5 text-rose-600 border-rose-500/10', icon: XCircle, color: 'text-rose-500' },
  MANAGER_REVIEW: { label: 'Manager Review', badge: 'bg-purple-500/5 text-purple-600 border-purple-500/10', icon: Clock, color: 'text-purple-500' },
  MANAGER_APPROVED: { label: 'Manager Approved', badge: 'bg-blue-500/5 text-blue-600 border-blue-500/10', icon: CheckCircle, color: 'text-blue-500' },
  MANAGER_REJECTED: { label: 'Manager Rejected', badge: 'bg-rose-500/5 text-rose-600 border-rose-500/10', icon: XCircle, color: 'text-rose-500' },
  HR_REVIEW: { label: 'HR Final Review', badge: 'bg-indigo-500/5 text-indigo-600 border-indigo-500/10', icon: ShieldCheck, color: 'text-indigo-500' },
  APPROVED: { label: 'Fully Approved', badge: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10', icon: CheckCircle, color: 'text-emerald-500' },
  HR_REJECTED: { label: 'HR Rejected', badge: 'bg-rose-500/5 text-rose-600 border-rose-500/10', icon: XCircle, color: 'text-rose-500' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-slate-500/5 text-slate-400 border-slate-500/10', icon: XCircle, color: 'text-slate-400' },
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
  const [reliefRequests, setReliefRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>({ leaveBalance: 0, leaveAllowance: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual' });
  const [activeTab, setActiveTab] = useState<'MY' | 'TEAM' | 'RELIEF'>('MY');
  const [teamLeaves, setTeamLeaves] = useState<any[]>([]);

  const user = getStoredUser();
  const userRank = user?.rank || 0;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leavesRes, balanceRes, reliefRes] = await Promise.all([
        api.get('/leave/my'),
        api.get('/leave/balance'),
        api.get('/leave/my-relief-requests'),
      ]);

      setLeaves(Array.isArray(leavesRes.data?.leaves) ? leavesRes.data.leaves : Array.isArray(leavesRes.data) ? leavesRes.data : []);
      setBalance(balanceRes.data || { leaveBalance: 0, leaveAllowance: 0 });
      setReliefRequests(Array.isArray(reliefRes.data) ? reliefRes.data : []);

      if (userRank >= 60) {
        const pendingRes = await api.get('/leave/pending');
        setTeamLeaves(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userRank]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/leave/eligible-relievers');
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (e) { 
      try {
        const fallback = await api.get('/users');
        setEmployees(fallback.data.filter((e: any) => e.id !== user.id));
      } catch {}
    }
  }, [user.id]);

  useEffect(() => { fetchData(); fetchEmployees(); }, [fetchData, fetchEmployees]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leave/apply', form);
      setShowModal(false); 
      setForm({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual' });
      fetchData();
      toast.success('Leave protocol initiated: Vector verification pending');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to initiate rest vector');
    } finally { setSaving(false); }
  };

  const handleRelieverResponse = async (leaveId: string, approve: boolean) => {
    try {
      await api.post('/leave/process', {
        id: leaveId,
        action: approve ? 'APPROVE' : 'REJECT',
        role: 'RELIEVER',
        comment: approve ? 'Protocol accepted: Coverage verified.' : 'Constraint detected: Cannot relieve session.'
      });
      toast.success(approve ? 'Handover accepted' : 'Handover declined');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action synchronization failure');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/leave/${id}/cancel`);
      fetchData();
      toast.success('Vector revoked: Request decommissioned');
    } catch (err: any) {
      toast.info(String(err?.response?.data?.error || 'Termination protocol error'));
    }
  };

  const handleReviewAction = async (leaveId: string, approve: boolean) => {
    const role = userRank >= 80 ? 'HR' : 'MANAGER';
    try {
      await api.post('/leave/process', {
        id: leaveId,
        action: approve ? 'APPROVE' : 'REJECT',
        role,
        comment: approve ? `System verification complete by ${role}` : `Constraint flagged by ${role}`
      });
      toast.success('Matrix sync successful');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Processing synchronization failure');
    }
  };

  return (
    <div className="space-y-12 pb-32">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">Rest & Recovery</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <Umbrella size={18} className="text-[var(--primary)] opacity-60" />
            Strategic deployment of personal rest vectors and handovers
          </p>
        </motion.div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[var(--bg-elevated)]/50 p-1.5 rounded-2xl border border-[var(--border-subtle)]">
             <button onClick={() => setActiveTab('MY')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'MY' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>My Cycle</button>
             {userRank >= 60 && (
               <button onClick={() => setActiveTab('TEAM')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest relative transition-all", activeTab === 'TEAM' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                 Team Hub
                 {teamLeaves.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white animate-pulse font-black">{teamLeaves.length}</span>}
               </button>
             )}
             <button onClick={() => setActiveTab('RELIEF')} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest relative transition-all", activeTab === 'RELIEF' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
               Handover
               {reliefRequests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-black animate-pulse font-black">{reliefRequests.length}</span>}
             </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} /> Initiate Vector
          </motion.button>
        </div>
      </div>

      {/* Balance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
             className="nx-card p-10 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden group md:col-span-1"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--primary)]/5 blur-[50px] group-hover:scale-125 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-8 opacity-60">Resource Balance</p>
          <div className="flex items-end gap-3 mb-6">
            <h2 className="text-6xl font-black text-[var(--text-primary)] tracking-tighter">{balance.leaveBalance?.toFixed(1)}</h2>
            <span className="text-lg font-black text-[var(--text-muted)] mb-2 uppercase italic tracking-widest opacity-40">Days</span>
          </div>
          <div className="h-6 w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-1 overflow-hidden shadow-inner">
            <motion.div 
               initial={{ width:0 }} animate={{ width: `${(balance.leaveBalance / (balance.leaveAllowance || 24)) * 100}%` }}
               className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-xl shadow-[0_0_15px_var(--primary)]"
            />
          </div>
          <p className="mt-6 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Calculated based on allocation tier {(balance.leaveAllowance || 24)}d/yr</p>
        </motion.div>

        {reliefRequests.length > 0 && activeTab !== 'RELIEF' && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="nx-card md:col-span-2 p-10 bg-gradient-to-br from-amber-500/5 to-amber-600/10 border-amber-500/20 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden"
           >
              <Users className="text-amber-500 opacity-20 absolute -bottom-10 -right-10" size={160} />
              <div className="w-16 h-16 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xl">
                 <Send size={24} />
              </div>
              <div className="space-y-2 relative z-10">
                 <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter">Handover Protocol Detected</h3>
                 <p className="text-[11px] font-medium text-[var(--text-secondary)] opacity-80 uppercase tracking-widest">You have {reliefRequests.length} pending relief request(s) awaiting verification.</p>
              </div>
              <button onClick={() => setActiveTab('RELIEF')} className="px-10 h-14 rounded-2xl bg-amber-500 text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/20 hover:scale-[1.03] transition-all relative z-10">Verify Requests</button>
           </motion.div>
        )}
      </div>

      {/* Main Registry Matrix */}
      <AnimatePresence mode="wait">
        {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 flex flex-col items-center gap-6">
               <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Synchronizing rest vectors</p>
            </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] flex items-center gap-4">
                    {activeTab === 'MY' ? 'Vector Registry' : activeTab === 'TEAM' ? 'Team Coordination' : 'Handover Feed'}
                    <div className="h-[2px] w-20 bg-[var(--primary)]/20" />
                </h3>
            </div>

            <div className="nx-card border-[var(--border-subtle)] overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    {activeTab === 'MY' ? (
                       <table className="nx-table">
                         <thead>
                           <tr className="bg-[var(--bg-elevated)]/10">
                             <th className="px-10 py-6">Leave Vector</th>
                             <th className="py-6">Span Timeline</th>
                             <th className="py-6">Relief Node</th>
                             <th className="py-6">System Status</th>
                             <th className="px-10 py-6 text-right">Action</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {leaves.map((leave, i) => {
                               const cfg = statusConfig[leave.status] || { label: leave.status, badge: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]', icon: Clock, color: 'text-[var(--text-muted)]' };
                               const Icon = cfg.icon;
                               return (
                                 <motion.tr key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                    <td className="px-10 py-6">
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-sm">
                                             {React.createElement(leaveTypeIcons[leave.leaveType] || Umbrella, { size: 18 })}
                                          </div>
                                          <span className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-tight">{leave.leaveType} Rest</span>
                                       </div>
                                    </td>
                                    <td className="py-6 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                                       <span className="underline decoration-[var(--primary)]/30 underline-offset-4">{format(new Date(leave.startDate), 'dd MMM')}</span>
                                       <ChevronRight size={12} className="inline mx-2 opacity-30" />
                                       <span className="underline decoration-[var(--primary)]/30 underline-offset-4">{format(new Date(leave.endDate), 'dd MMM yyyy')}</span>
                                    </td>
                                    <td className="py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic">{leave.reliever?.fullName || 'DIRECT EXEC'}</td>
                                    <td className="py-6">
                                       <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-2 w-fit", cfg.badge)}>
                                          <Icon size={12} className={cfg.color} /> {cfg.label}
                                       </span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                       {(leave.status === 'SUBMITTED' || leave.status === 'PENDING_RELIEVER') && (
                                          <button onClick={() => handleCancel(leave.id)} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline decoration-rose-500/30 underline-offset-8">Decommission</button>
                                       )}
                                    </td>
                                 </motion.tr>
                               );
                            })}
                            {leaves.length === 0 && (
                               <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">No rest vectors active</td></tr>
                            )}
                         </tbody>
                       </table>
                    ) : activeTab === 'TEAM' ? (
                       <table className="nx-table">
                          <thead>
                           <tr className="bg-[var(--bg-elevated)]/10">
                             <th className="px-10 py-6">Personnel Node</th>
                             <th className="py-6">Force Dimension</th>
                             <th className="py-6">Current Vector</th>
                             <th className="px-10 py-6 text-right">Verifications</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {teamLeaves.map((leave, i) => (
                               <motion.tr key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                  <td className="px-10 py-6">
                                     <div>
                                        <p className="text-[13px] font-black text-[var(--text-primary)] uppercase">{leave.employee?.fullName}</p>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest line-clamp-1 italic">{leave.reason}</p>
                                     </div>
                                  </td>
                                  <td className="py-6"><span className="text-[13px] font-black text-[var(--primary)] uppercase italic tracking-tighter">{leave.leaveDays} Rotation Days</span></td>
                                  <td className="py-6">
                                     <div className="flex flex-col gap-1.5">
                                        <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border w-fit shadow-sm", (statusConfig[leave.status] || {}).badge)}>
                                           {leave.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-2 opacity-50">STG: {leave.status === 'HR_REVIEW' ? 'FINAL_VALIDATION' : 'INITIAL_REVIEW'}</span>
                                     </div>
                                  </td>
                                  <td className="px-10 py-6 text-right">
                                     <div className="flex justify-end gap-4">
                                        <button onClick={() => handleReviewAction(leave.id, true)} className="w-11 h-11 rounded-xl bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-90"><CheckCircle size={18} /></button>
                                        <button onClick={() => handleReviewAction(leave.id, false)} className="w-11 h-11 rounded-xl bg-rose-500/5 text-rose-600 border border-rose-500/10 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-90"><XCircle size={18} /></button>
                                     </div>
                                  </td>
                               </motion.tr>
                            ))}
                            {teamLeaves.length === 0 && (
                               <tr><td colSpan={4} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">No team verification required</td></tr>
                            )}
                         </tbody>
                       </table>
                    ) : (
                       <div className="p-10 space-y-6">
                          {reliefRequests.map((req, i) => (
                            <motion.div key={req.id} initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.05 }}
                                 className="nx-card p-8 flex flex-col md:flex-row items-center justify-between border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 hover:border-amber-500/30 transition-all group"
                            >
                               <div className="flex items-center gap-8 mb-6 md:mb-0">
                                  <div className="w-14 h-14 rounded-2xl bg-amber-500/5 text-amber-600 border border-amber-500/10 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
                                  <div>
                                     <p className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-tight">Personnel Handover: {req.employee?.fullName}</p>
                                     <p className="text-[11px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest">{format(new Date(req.startDate), 'PP')} — {format(new Date(req.endDate), 'PP')}</p>
                                  </div>
                               </div>
                               <div className="flex gap-4">
                                  <button onClick={() => handleRelieverResponse(req.id, true)} className="px-10 h-12 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/30 hover:scale-105 transition-all">Accept Protocol</button>
                                  <button onClick={() => handleRelieverResponse(req.id, false)} className="px-10 h-12 rounded-xl border border-rose-500/20 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/5 transition-all">Decline Vector</button>
                               </div>
                            </motion.div>
                          ))}
                          {reliefRequests.length === 0 && (
                             <div className="py-24 flex flex-col items-center justify-center text-center opacity-30 italic space-y-4">
                                <Users size={48} className="text-[var(--text-muted)]" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">No handover protocols detected</h4>
                             </div>
                          )}
                       </div>
                    )}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initiation Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="nx-card w-full max-w-2xl bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl p-12 relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-[40px] rounded-full" />
              <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-10 border-b border-[var(--border-subtle)] pb-6">Initiate Rest Vector</h2>
              <form onSubmit={handleApply} className="space-y-8 relative z-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Classification</label>
                       <select className="nx-input bg-[var(--bg-elevated)]/50" value={form.leaveType} onChange={e => setForm({...form, leaveType: e.target.value})}>
                          {Object.keys(leaveTypeIcons).map(t => <option key={t}>{t}</option>)}
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Relief Personnel <span className="text-[var(--primary)]/50 italic opacity-60">— Peer Node Required</span></label>
                       <select className="nx-input bg-[var(--bg-elevated)]/50" value={form.relieverId} onChange={e => setForm({...form, relieverId: e.target.value})}>
                          <option value="">-- No Reliever (Direct Logic) --</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.jobTitle})</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Vector Commencement</label>
                       <input type="date" className="nx-input bg-[var(--bg-elevated)]/50" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Vector Conclusion</label>
                       <input type="date" className="nx-input bg-[var(--bg-elevated)]/50" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">Mission Justification</label>
                    <textarea className="nx-input bg-[var(--bg-elevated)]/50 min-h-[140px] py-4" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Input coverage details and synchronization notes..." required />
                 </div>

                 <div className="flex gap-6 pt-10 border-t border-[var(--border-subtle)]/30">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-14 rounded-2xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all">Abort</button>
                    <button type="submit" disabled={saving} className="flex-[2] h-14 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-[var(--primary)]/30 active:scale-95 transition-all">
                      {saving ? <div className="flex items-center justify-center gap-3"><Clock size={16} className="animate-spin" /> Synchronizing...</div> : 'Deploy Vector'}
                    </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leave;
