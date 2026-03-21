import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { Calendar, Plus, CheckCircle, XCircle, Clock, ShieldCheck, Umbrella, HeartPulse, Baby, UserMinus, HelpingHand, Users } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser } from '../utils/session';
import { format } from 'date-fns';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

const statusConfig: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  SUBMITTED: { label: 'Pending Handover', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  PENDING_RELIEVER: { label: 'Awaiting Reliever', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  RELIEVER_ACCEPTED: { label: 'Reliever Accepted', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle },
  RELIEVER_DECLINED: { label: 'Reliever Declined', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: XCircle },
  MANAGER_REVIEW: { label: 'Manager Review', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Clock },
  MANAGER_APPROVED: { label: 'Manager Approved', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle },
  MANAGER_REJECTED: { label: 'Manager Rejected', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: XCircle },
  HR_REVIEW: { label: 'HR Final Review', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: ShieldCheck },
  APPROVED: { label: 'Fully Approved', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  HR_REJECTED: { label: 'HR Rejected', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: XCircle },
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always fetch my leaves and balance
      const [leavesRes, balanceRes, reliefRes] = await Promise.all([
        api.get('/leave/my'),
        api.get('/leave/balance'),
        api.get('/leave/my-relief-requests'),
      ]);

      const myLeaves = Array.isArray(leavesRes.data?.leaves) ? leavesRes.data.leaves : Array.isArray(leavesRes.data) ? leavesRes.data : [];
      setLeaves(myLeaves);
      setBalance(balanceRes.data || { leaveBalance: 0, leaveAllowance: 0 });
      setReliefRequests(Array.isArray(reliefRes.data) ? reliefRes.data : []);

      // Only fetch team leaves if manager+
      if (userRank >= 60) {
        const pendingRes = await api.get('/leave/pending');
        setTeamLeaves(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      // Only fetch eligible relievers (same rank level) - fixes L1
      const res = await api.get('/leave/eligible-relievers');
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (e) { 
      // Fallback: fetch all users if endpoint fails
      try {
        const fallback = await api.get('/users');
        const rows = Array.isArray(fallback.data) ? fallback.data : [];
        setEmployees(rows.filter((e: any) => e.id !== user.id));
      } catch {}
    }
  };

  useEffect(() => { fetchData(); fetchEmployees(); }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/leave/apply', form);
      setShowModal(false); setForm({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual' });
      fetchData();
      toast.success('Leave request submitted and routed.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit leave request');
    } finally { setSaving(false); }
  };

  const handleRelieverResponse = async (leaveId: string, approve: boolean) => {
    try {
      await api.post('/leave/process', {
        id: leaveId,
        action: approve ? 'APPROVE' : 'REJECT',
        role: 'RELIEVER',
        comment: approve ? 'I accept to relieve this employee.' : 'I cannot relieve at this time.'
      });
      toast.success(approve ? 'Handover accepted.' : 'Handover declined.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/leave/${id}/cancel`);
      fetchData();
      toast.success('Request cancelled.');
    } catch (err: any) {
      toast.info(String(err?.response?.data?.error || 'Failed to cancel leave request'));
    }
  };

  const handleReviewAction = async (leaveId: string, approve: boolean) => {
    const role = userRank >= 80 ? 'HR' : 'MANAGER';
    try {
      await api.post('/leave/process', {
        id: leaveId,
        action: approve ? 'APPROVE' : 'REJECT',
        role,
        comment: approve ? `Approved by ${role}` : `Rejected by ${role}`
      });
      toast.success('Action successful.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  return (
    <div className="space-y-10 page-enter min-h-screen pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader 
          title="Leave & Time Off"
          description="Strategic deployment of rest and recovery cycles."
          icon={Calendar}
          variant="indigo"
        />
        <div className="flex gap-4">
          <div className="flex p-1 bg-slate-900/40 rounded-2xl border border-white/5">
             <button onClick={() => setActiveTab('MY')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest", activeTab === 'MY' ? "bg-primary text-white" : "text-slate-500 hover:text-white")}>My Leave</button>
             {userRank >= 60 && (
               <button onClick={() => setActiveTab('TEAM')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest relative", activeTab === 'TEAM' ? "bg-primary text-white" : "text-slate-500 hover:text-white")}>
                 Team Approvals
                 {teamLeaves.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white animate-pulse">{teamLeaves.length}</span>}
               </button>
             )}
             <button onClick={() => setActiveTab('RELIEF')} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest relative", activeTab === 'RELIEF' ? "bg-primary text-white" : "text-slate-500 hover:text-white")}>
               Handover
               {reliefRequests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-black animate-pulse">{reliefRequests.length}</span>}
             </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} /> Initiate Vector
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <ShieldCheck size={80} className="text-primary-light" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-6">Leave Balance Sync</span>
          <div className="text-5xl font-black text-white font-display tracking-tight mb-2">
            {balance.leaveBalance?.toFixed(1)} <span className="text-xl text-slate-600">Days</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-6">
            <div className="h-full bg-primary" style={{ width: `${(balance.leaveBalance / (balance.leaveAllowance || 24)) * 100}%` }} />
          </div>
        </div>

        {/* Relief Requests Notification */}
        {reliefRequests.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="md:col-span-2 glass p-8 border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/20">
                  <Users size={24} />
               </div>
               <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Handover Pending</h3>
                  <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest mt-1">You have {reliefRequests.length} relief requests awaiting action.</p>
               </div>
            </div>
            <div className="flex gap-3">
               <button 
                 onClick={() => handleRelieverResponse(reliefRequests[0].id, true)}
                 className="px-6 py-3 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all"
               >
                 Accept All
               </button>
               <button 
                 onClick={() => setActiveTab('RELIEF')}
                 className="px-6 py-3 rounded-xl border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/10 transition-all"
               >
                 Details
               </button>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : activeTab === 'MY' ? (
          <motion.div key="my" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="glass overflow-hidden border-white/[0.05]">
            <div className="px-8 py-6 border-b border-white/[0.05] flex items-center justify-between">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">My Execution History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="nx-table">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Vector</th>
                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Timeline</th>
                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Reliever</th>
                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {leaves.map((leave) => {
                    const cfg = statusConfig[leave.status] || { label: leave.status, badge: 'bg-white/5 text-slate-400 border-white/10', icon: Clock };
                    const Icon = cfg.icon;
                    return (
                      <tr key={leave.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-8 py-5"><div className="flex items-center gap-3"><Umbrella size={16} className="text-primary-light" /><span className="text-xs font-bold text-white uppercase">{leave.leaveType}</span></div></td>
                        <td className="px-6 py-5"><span className="text-[10px] font-bold text-slate-400 underline decoration-primary/30 underline-offset-4">{format(new Date(leave.startDate), 'dd MMM')} — {format(new Date(leave.endDate), 'dd MMM yyyy')}</span></td>
                        <td className="px-6 py-5"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{leave.reliever?.fullName || 'DIRECT'}</span></td>
                        <td className="px-6 py-5"><span className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit", cfg.badge)}><Icon size={10} /> {cfg.label}</span></td>
                        <td className="px-8 py-5 text-right">{(leave.status === 'SUBMITTED' || leave.status === 'PENDING_RELIEVER') && <button onClick={() => handleCancel(leave.id)} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Revoke</button>}</td>
                      </tr>
                    );
                  })}
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">No leave records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : activeTab === 'TEAM' ? (
          <motion.div key="team" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass overflow-hidden border-white/[0.05]">
             <div className="px-8 py-6 border-b border-white/[0.05] flex items-center justify-between">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Team Resource Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="nx-table">
                 <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Employee</th>
                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Duration</th>
                    <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Approvals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                   {teamLeaves.map(leave => (
                     <tr key={leave.id} className="hover:bg-white/[0.01]">
                       <td className="px-8 py-5">
                          <div>
                            <p className="text-xs font-bold text-white">{leave.employee?.fullName}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-xs">{leave.reason}</p>
                          </div>
                       </td>
                       <td className="px-6 py-5">
                          <span className="text-xs font-black text-primary-light">{leave.leaveDays} Days</span>
                       </td>
                       <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <span className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border w-fit", (statusConfig[leave.status] || {}).badge)}>
                              {leave.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">
                              {leave.status === 'HR_REVIEW' ? 'Final Step 2' : 'Initial Step 1'}
                            </span>
                          </div>
                       </td>
                       <td className="px-8 py-5 text-right flex justify-end gap-3">
                          <button onClick={() => handleReviewAction(leave.id, true)} className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle size={16} /></button>
                          <button onClick={() => handleReviewAction(leave.id, false)} className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><XCircle size={16} /></button>
                       </td>
                     </tr>
                   ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div key="relief" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
             {reliefRequests.map(req => (
               <div key={req.id} className="glass p-8 flex items-center justify-between border-amber-500/20">
                  <div className="flex items-center gap-6">
                     <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20"><Users size={24} /></div>
                     <div>
                        <p className="text-xs font-black text-white uppercase tracking-widest">{req.employee?.fullName} Handover</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">{format(new Date(req.startDate), 'PP')} — {format(new Date(req.endDate), 'PP')}</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => handleRelieverResponse(req.id, true)} className="px-8 py-3 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 transition-all">Accept Handover</button>
                     <button onClick={() => handleRelieverResponse(req.id, false)} className="px-8 py-3 rounded-xl border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 transition-all">Decline</button>
                  </div>
               </div>
             ))}
             {reliefRequests.length === 0 && <EmptyState title="No Handover Required" description="You have no pending relief requests from the personnel vector." icon={Users} />}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass w-full max-w-2xl bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-primary/20 p-10"
            >
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8">Initiate Leave Vector</h2>
              <form onSubmit={handleApply} className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Leave Classification</label>
                       <select className="glass-input w-full" value={form.leaveType} onChange={e => setForm({...form, leaveType: e.target.value})}>
                          {Object.keys(leaveTypeIcons).map(t => <option key={t}>{t}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Reliever <span className="text-slate-600">(Optional — same level peers only)</span></label>
                       <select className="glass-input w-full" value={form.relieverId} onChange={e => setForm({...form, relieverId: e.target.value})}>
                          <option value="">-- No Reliever (go direct to manager) --</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.jobTitle})</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Start Vector</label>
                       <input type="date" className="glass-input w-full" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">End Vector</label>
                       <input type="date" className="glass-input w-full" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Strategic Reason</label>
                    <textarea className="glass-input w-full min-h-[100px]" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Input mission critical coverage details..." required />
                 </div>

                 <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-[2] py-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20">
                      {saving ? 'Syncing...' : 'Deploy Request'}
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
