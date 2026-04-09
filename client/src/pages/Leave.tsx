import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';
import { 
  Plus, CheckCircle, XCircle, Clock, 
  ShieldCheck, Umbrella, HeartPulse, Baby, 
  UserMinus, HelpingHand, Users, Send,
  ChevronRight, Printer, Trash2, Calendar, X
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { format } from 'date-fns';
import { useAI } from '../context/AIContext';

const statusConfig: Record<string, { label: string; badge: string; icon: React.ElementType; color: string }> = {
  SUBMITTED: { label: 'leave.status.SUBMITTED', badge: 'bg-amber-500/5 text-amber-600 border-amber-500/10', icon: Clock, color: 'text-amber-500' },
  PENDING_RELIEVER: { label: 'leave.status.PENDING_RELIEVER', badge: 'bg-amber-500/5 text-amber-600 border-amber-500/10', icon: Clock, color: 'text-amber-500' },
  RELIEVER_ACCEPTED: { label: 'leave.status.RELIEVER_ACCEPTED', badge: 'bg-blue-500/5 text-blue-600 border-blue-500/10', icon: CheckCircle, color: 'text-blue-500' },
  RELIEVER_DECLINED: { label: 'leave.status.RELIEVER_DECLINED', badge: 'bg-rose-500/5 text-rose-600 border-rose-500/10', icon: XCircle, color: 'text-rose-500' },
  MANAGER_REVIEW: { label: 'leave.status.MANAGER_REVIEW', badge: 'bg-purple-500/5 text-purple-600 border-purple-500/10', icon: Clock, color: 'text-purple-500' },
  MANAGER_APPROVED: { label: 'leave.status.MANAGER_APPROVED', badge: 'bg-blue-500/5 text-blue-600 border-blue-500/10', icon: CheckCircle, color: 'text-blue-500' },
  MANAGER_REJECTED: { label: 'leave.status.MANAGER_REJECTED', badge: 'bg-rose-500/5 text-rose-600 border-rose-500/10', icon: XCircle, color: 'text-rose-500' },
  HR_REVIEW: { label: 'leave.status.HR_REVIEW', badge: 'bg-indigo-500/5 text-indigo-600 border-indigo-500/10', icon: ShieldCheck, color: 'text-indigo-500' },
  APPROVED: { label: 'leave.status.APPROVED', badge: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10', icon: CheckCircle, color: 'text-emerald-500' },
  HR_REJECTED: { label: 'leave.status.HR_REJECTED', badge: 'bg-rose-500/5 text-rose-600 border-rose-500/10', icon: XCircle, color: 'text-rose-500' },
  CANCELLED: { label: 'leave.status.CANCELLED', badge: 'bg-slate-500/5 text-slate-400 border-slate-500/10', icon: XCircle, color: 'text-slate-400' },
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
  const { t, i18n: i18n_fe } = useTranslation();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [reliefRequests, setReliefRequests] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>({ leaveBalance: 0, leaveAllowance: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // 📋 Modal Scroll Lock: Tier 3 Nuclear Implementation
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.classList.add('modal-lock');
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.classList.remove('modal-lock');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.classList.remove('modal-lock');
    };
  }, [showModal]);

  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual', handoverNotes: '', relieverAcceptanceRequired: false });
  const [activeTab, setActiveTab] = useState<'MY' | 'TEAM' | 'RELIEF' | 'HISTORY' | 'REGISTER'>('MY');
  const [teamLeaves, setTeamLeaves] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [handoverHistory, setHandoverHistory] = useState<any[]>([]);
  const { setContextData } = useAI();

  const user = getStoredUser();
  const userRank = user?.rank || 0;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leavesRes, balanceRes, reliefRes, historyRes] = await Promise.all([
        api.get('/leave/my'),
        api.get('/leave/balance'),
        api.get('/leave/my-relief-requests'),
        api.get('/leave/handover/history'),
      ]);

      setLeaves(Array.isArray(leavesRes.data?.leaves) ? leavesRes.data.leaves : Array.isArray(leavesRes.data) ? leavesRes.data : []);
      setBalance(balanceRes.data || { leaveBalance: 0, leaveAllowance: 0 });
      setReliefRequests(Array.isArray(reliefRes.data) ? reliefRes.data : []);
      setHandoverHistory(Array.isArray(historyRes.data) ? historyRes.data : []);

      if (userRank >= 60) {
        const pendingRes = await api.get('/leave/pending');
        setTeamLeaves(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      }

      if (userRank >= 75) {
        const allRes = await api.get('/leave/all');
        setAllLeaves(Array.isArray(allRes.data?.leaves) ? allRes.data.leaves : Array.isArray(allRes.data) ? allRes.data : []);
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

  useEffect(() => {
    setContextData({ leaves, teamLeaves, allLeaves, balance });
    return () => setContextData(null);
  }, [leaves, teamLeaves, allLeaves, balance, setContextData]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/leave/apply', form);
      const { warning } = res.data;
      
      setShowModal(false); 
      setForm({ startDate: '', endDate: '', reason: '', relieverId: '', leaveType: 'Annual', handoverNotes: '', relieverAcceptanceRequired: false });
      fetchData();
      
      if (warning) {
        toast.info(warning);
      } else {
        toast.success(t('leave.alerts.initiate_success'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('leave.alerts.initiate_error'));
    } finally { setSaving(false); }
  };

  const handleDeleteLeave = async (id: string) => {
    if (!window.confirm("CRITICAL: Administrative Deletion. This will permanently remove the leave request and all associated handover records. Proceed?")) return;
    try {
      setSaving(true);
      await api.delete(`/leave/request/${id}`);
      toast.success("Leave Vector Decommissioned Successfully");
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Deletion Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHandover = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this handover record from the permanent register?")) return;
    try {
      setSaving(true);
      await api.delete(`/leave/handover/${id}`);
      toast.success("Handover Record Purged");
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Deletion Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRelieverResponse = async (leaveId: string, approve: boolean) => {
    try {
      await api.post('/leave/process', {
        id: leaveId,
        action: approve ? 'APPROVE' : 'REJECT',
        role: 'RELIEVER',
        comment: approve ? 'Protocol accepted: Coverage verified.' : 'Constraint detected: Cannot relieve session.'
      });
      toast.success(approve ? t('leave.alerts.handover_accepted') : t('leave.alerts.handover_declined'));
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('leave.alerts.sync_failure'));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/leave/${id}/cancel`);
      fetchData();
      toast.success(t('leave.alerts.revoke_success'));
    } catch (err: any) {
      toast.info(String(err?.response?.data?.error || t('leave.alerts.revoke_error')));
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
      toast.success(t('leave.alerts.matrix_success'));
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('leave.alerts.process_failure'));
    }
  };

  const handleDownloadPDF = async (id: string, name: string) => {
    try {
      const res = await api.get(`/export/leave/${id}/pdf?lang=${i18n_fe.language}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Leave_Request_${name.replace(/\s+/g, '_')}_${id.slice(0, 5)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(t('performance.telemetry_failure', 'Failed to generate PDF document.'));
    }
  };

  return (
    <div className="space-y-12 pb-32">
       <AnimatePresence>
        {saving && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 rounded-[2rem] border-4 border-white/10 border-t-white animate-spin mx-auto" />
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-widest">{t('common.processing')}</h3>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Establishing encrypted session...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('leave.title')}</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <Umbrella size={18} className="text-[var(--primary)] opacity-60" />
            {t('leave.subtitle')}
          </p>
        </motion.div>

        <div className="flex items-center gap-4">
          <div className="flex bg-[var(--bg-elevated)]/50 p-1 rounded-2xl border border-[var(--border-subtle)] overflow-x-auto no-scrollbar max-w-full">
             <button onClick={() => setActiveTab('MY')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'MY' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>{t('leave.my_cycle')}</button>
             {userRank >= 60 && (
               <button onClick={() => setActiveTab('TEAM')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap", activeTab === 'TEAM' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                 {t('leave.team_hub')}
                 {teamLeaves.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white animate-pulse font-black">{teamLeaves.length}</span>}
               </button>
             )}
              <button onClick={() => setActiveTab('RELIEF')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap", activeTab === 'RELIEF' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
               {t('leave.handover')}
               {reliefRequests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-black animate-pulse font-black">{reliefRequests.length}</span>}
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap", activeTab === 'HISTORY' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
               {t('leave.handover_history', 'Handover History')}
              </button>
              {userRank >= 75 && (
                  <button onClick={() => setActiveTab('REGISTER')} className={cn("px-4 sm:px-6 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'REGISTER' ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                    {t('leave.register', 'Register')}
                  </button>
              )}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} /> {t('leave.initiate_vector')}
          </motion.button>
        </div>
      </div>

      {/* Balance Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
             className="nx-card p-6 sm:p-10 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden group md:col-span-1"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[var(--primary)]/5 blur-[50px] group-hover:scale-125 transition-transform" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-8 opacity-60">{t('leave.resource_balance')}</p>
          <div className="flex items-end gap-3 mb-6">
            <h2 className="text-6xl font-black text-[var(--text-primary)] tracking-tighter">{Number(balance.leaveBalance || 0).toFixed(1)}</h2>

            <span className="text-lg font-black text-[var(--text-muted)] mb-2 uppercase italic tracking-widest opacity-40">{t('leave.days')}</span>
          </div>
          <div className="h-6 w-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-1 overflow-hidden shadow-inner">
            <motion.div
               initial={{ width:0 }} animate={{ width: `${(balance.leaveBalance / (balance.leaveAllowance || 24)) * 100}%` }}
               className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-xl shadow-[0_0_15px_var(--primary)]"
            />
          </div>
          <p className="mt-6 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('leave.allocation_tier', { days: balance.leaveAllowance || 24 })}</p>
        </motion.div>

        {reliefRequests.length > 0 && activeTab !== 'RELIEF' && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="nx-card md:col-span-2 p-6 sm:p-10 bg-gradient-to-br from-[var(--accent)]/5 to-[var(--accent)]/10 border-[var(--accent)]/20 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden"
           >
              <Users className="text-[var(--accent)] opacity-20 absolute -bottom-10 -right-10" size={160} />
              <div className="w-16 h-16 rounded-[2rem] bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shadow-xl">
                 <Send size={24} />
              </div>
              <div className="space-y-2 relative z-10">
                 <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter">{t('leave.handover_protocol_detected')}</h3>
                 <p className="text-[11px] font-medium text-[var(--text-secondary)] opacity-80 uppercase tracking-widest">{t('leave.pending_relief_count', { count: reliefRequests.length })}</p>
              </div>
              <button onClick={() => setActiveTab('RELIEF')} className="px-10 h-14 rounded-2xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-[rgba(var(--accent-rgb),0.3)] hover:scale-[1.03] transition-all relative z-10">{t('leave.verify_requests')}</button>
           </motion.div>
        )}
      </div>

      {/* Main Registry Matrix */}
      <AnimatePresence mode="wait">
        {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 flex flex-col items-center gap-6">
               <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">{t('leave.syncing_vectors')}</p>
            </motion.div>
        ) : (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] flex items-center gap-4">
                    {activeTab === 'MY' ? t('leave.vector_registry') : activeTab === 'TEAM' ? t('leave.team_coordination') : activeTab === 'REGISTER' ? t('leave.organization_register') : activeTab === 'HISTORY' ? t('leave.handover_history_register', 'Handover Register (Proof of Coverage)') : t('leave.handover_feed')}
                    <div className="h-[2px] w-20 bg-[var(--primary)]/20" />
                </h3>
            </div>

            <div className="nx-card border-[var(--border-subtle)] overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    {activeTab === 'MY' ? (
                       <table className="nexus-responsive-table w-full">
                         <thead>
                           <tr className="bg-[var(--bg-elevated)]/10">
                             <th className="px-10 py-6">{t('leave.leave_vector')}</th>
                             <th className="py-6">{t('leave.span_timeline')}</th>
                             <th className="py-6">{t('leave.relief_node')}</th>
                             <th className="py-6">{t('leave.system_status')}</th>
                             <th className="px-10 py-6 text-right">{t('common.actions')}</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {leaves.map((leave, i) => {
                               const cfg = statusConfig[leave.status] || { label: leave.status, badge: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]', icon: Clock, color: 'text-[var(--text-muted)]' };
                               const Icon = cfg.icon;
                               return (
                                 <motion.tr key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                    <td className="px-10 py-6" data-label={t('leave.leave_vector')}>
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-sm">
                                             {React.createElement(leaveTypeIcons[leave.leaveType] || Umbrella, { size: 18 })}
                                          </div>
                                          <span className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-tight">{t(`leave.types.${leave.leaveType}`)} {t('common.rest')}</span>
                                       </div>
                                    </td>
                                    <td className="py-6 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]" data-label={t('leave.span_timeline')}>
                                       <span className="underline decoration-[var(--primary)]/30 underline-offset-4">{format(new Date(leave.startDate), 'dd MMM')}</span>
                                       <ChevronRight size={12} className="inline mx-2 opacity-30" />
                                       <span className="underline decoration-[var(--primary)]/30 underline-offset-4">{format(new Date(leave.endDate), 'dd MMM yyyy')}</span>
                                    </td>
                                     <td className="py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic" data-label={t('leave.relief_node')}>{leave.reliever?.fullName || t('leave.direct_exec')}</td>
                                     <td className="py-6" data-label={t('leave.system_status')}>
                                        <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-2 w-fit", cfg.badge)}>
                                           <Icon size={12} className={cfg.color} /> {t(cfg.label)}
                                        </span>
                                     </td>
                                    <td className="px-10 py-6 text-right" data-label={t('common.actions')}>
                                       <div className="flex items-center justify-end gap-3">
                                         <button 
                                           onClick={() => handleDownloadPDF(leave.id, user.name || 'Employee')}
                                           className="p-2 rounded-lg bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all border border-[var(--primary)]/10"
                                           title="Print Request PDF"
                                         >
                                           <Printer size={14} />
                                         </button>
                                         {(leave.status === 'SUBMITTED' || leave.status === 'PENDING_RELIEVER') && (
                                             <button onClick={() => handleCancel(leave.id)} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline decoration-rose-500/30 underline-offset-8">{t('leave.decommission_btn')}</button>
                                         )}
                                       </div>
                                     </td>
                                 </motion.tr>
                               );
                            })}
                             {leaves.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">{t('leave.no_vectors')}</td></tr>
                             )}
                         </tbody>
                       </table>
                    ) : activeTab === 'TEAM' ? (
                       <table className="nexus-responsive-table w-full">
                          <thead>
                            <tr className="bg-[var(--bg-elevated)]/10">
                             <th className="px-10 py-6">{t('leave.personnel_node')}</th>
                             <th className="py-6">{t('leave.force_dimension')}</th>
                             <th className="py-6">{t('leave.handover_partner', 'Handover Partner')}</th>
                             <th className="py-6">{t('leave.current_vector')}</th>
                             <th className="px-10 py-6 text-right">{t('leave.verifications')}</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-[var(--border-subtle)]/30">
                            {teamLeaves.map((leave, i) => (
                               <motion.tr key={leave.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="group border-b border-[var(--border-subtle)]/30 hover:bg-[var(--bg-elevated)]/30 transition-all">
                                  <td className="px-10 py-6" data-label={t('leave.personnel_node')}>
                                     <div>
                                        <p className="text-[13px] font-black text-[var(--text-primary)] uppercase">{leave.employee?.fullName}</p>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest line-clamp-1 italic">{leave.reason}</p>
                                     </div>
                                  </td>
                                  <td className="py-6" data-label={t('leave.force_dimension')}><span className="text-[13px] font-black text-[var(--primary)] uppercase italic tracking-tighter">{t('leave.rotation_days', { days: leave.leaveDays })}</span></td>
                                  <td className="py-6" data-label={t('leave.handover_partner', 'Handover Partner')}>
                                      {leave.reliever ? (
                                        <div className="flex flex-col">
                                          <p className="text-[11px] font-black text-[var(--text-primary)] uppercase">{leave.reliever.fullName}</p>
                                          <span className={cn(
                                            "text-[7px] font-black uppercase tracking-widest mt-1",
                                            leave.relieverStatus === 'ACCEPTED' ? "text-emerald-500" : "text-amber-500"
                                          )}>
                                            {leave.relieverStatus === 'ACCEPTED' ? 'Protocol Signed' : 'Pending Signature'}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-40 uppercase">None Assigned</span>
                                      )}
                                   </td>
                                  <td className="py-6" data-label={t('leave.current_vector')}>
                                     <div className="flex flex-col gap-1.5 md:items-start items-end">
                                        <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border w-fit shadow-sm", (statusConfig[leave.status] || {}).badge)}>
                                           {leave.status.replace(/_/g, ' ')}
                                         </span>
                                         <span className="text-[7px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-2 opacity-50">{t('leave.stage_label')}: {leave.status === 'HR_REVIEW' ? t('leave.stage_final') : t('leave.stage_initial')}</span>
                                      </div>
                                  </td>
                                  <td className="px-10 py-6 text-right" data-label={t('leave.verifications')}>
                                     <div className="flex justify-end gap-4">
                                        <button 
                                           onClick={() => handleDownloadPDF(leave.id, leave.employee?.fullName || 'Employee')}
                                           className="w-11 h-11 rounded-xl bg-[var(--primary)]/5 text-[var(--primary)] border border-[var(--primary)]/10 flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition-all shadow-lg active:scale-90"
                                           title="Print Request PDF"
                                        >
                                           <Printer size={18} />
                                        </button>
                                         {((userRank >= 85 && leave.status === 'HR_REVIEW') || 
                                           (userRank >= 60 && (leave.status === 'MANAGER_REVIEW' || leave.status === 'RELIEVER_ACCEPTED' || (leave.status === 'SUBMITTED' && !leave.relieverAcceptanceRequired))) ||
                                           (userRank >= 85 && (leave.status === 'MANAGER_REVIEW' || leave.status === 'RELIEVER_ACCEPTED'))) ? (
                                           <>
                                             <button onClick={() => handleReviewAction(leave.id, true)} className="w-11 h-11 rounded-xl bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-90"><CheckCircle size={18} /></button>
                                             <button onClick={() => handleReviewAction(leave.id, false)} className="w-11 h-11 rounded-xl bg-rose-500/5 text-rose-600 border border-rose-500/10 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-90"><XCircle size={18} /></button>
                                           </>
                                         ) : (
                                           <div className="px-5 py-2.5 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/30 flex items-center gap-2">
                                              <Clock size={12} className="text-[var(--text-muted)] animate-pulse" /> 
                                              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                                                 {leave.status === 'SUBMITTED' ? 'Awaiting Signature' : 'In Final Review'}
                                              </span>
                                           </div>
                                         )}
                                     </div>
                                  </td>
                               </motion.tr>
                            ))}
                             {teamLeaves.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">{t('leave.no_team_verification')}</td></tr>
                             )}
                         </tbody>
                       </table>
                     ) : activeTab === 'REGISTER' ? (
                        <table className="nexus-responsive-table w-full">
                          <thead>
                            <tr className="bg-[var(--bg-elevated)]/10">
                              <th className="px-10 py-6">{t('leave.personnel')}</th>
                              <th className="py-6">{t('leave.span_timeline')}</th>
                              <th className="py-6">{t('leave.days')}</th>
                              <th className="py-6">{t('leave.type')}</th>
                              <th className="px-10 py-6 text-right">{t('leave.system_status')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]/30">
                             {allLeaves.map((leave, i) => {
                                const cfg = statusConfig[leave.status] || { label: leave.status, badge: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]', icon: Clock, color: 'text-[var(--text-muted)]' };
                                return (
                                  <motion.tr key={leave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                     <td className="px-10 py-6" data-label={t('leave.personnel')}>
                                        <div>
                                           <p className="text-[13px] font-black text-[var(--text-primary)] uppercase">{leave.employee?.fullName}</p>
                                           <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60 italic">{leave.employee?.jobTitle}</p>
                                        </div>
                                     </td>
                                     <td className="py-6 text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]" data-label={t('leave.span_timeline')}>
                                        {format(new Date(leave.startDate), 'dd MMM')} — {format(new Date(leave.endDate), 'dd MMM yyyy')}
                                     </td>
                                      <td className="py-6 text-[13px] font-black text-[var(--primary)] uppercase italic" data-label={t('leave.days')}>{leave.leaveDays}</td>
                                      <td className="py-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest" data-label={t('leave.type')}>{t(`leave.types.${leave.leaveType}`)}</td>
                                      <td className="px-10 py-6 text-right" data-label={t('leave.system_status')}>
                                         <div className="flex items-center justify-end gap-3 ml-auto w-fit">
                                            <button 
                                              onClick={() => handleDownloadPDF(leave.id, leave.employee?.fullName || 'Employee')}
                                              className="p-2 rounded-lg bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all border border-[var(--primary)]/10"
                                              title={t('common.export_report', 'Print Request PDF')}
                                            >
                                              <Printer size={14} />
                                            </button>
                                            <span className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm flex items-center justify-center gap-2", cfg.badge)}>
                                                {t(cfg.label)}
                                            </span>
                                            {userRank >= 90 && (
                                                <button 
                                                  onClick={() => handleDeleteLeave(leave.id)}
                                                  className="p-2 rounded-lg bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10"
                                                  title={t('common.delete', 'Administrative Delete')}
                                                >
                                                  <Trash2 size={14} />
                                                </button>
                                             )}
                                         </div>
                                      </td>
                                  </motion.tr>
                                );
                             })}
                             {allLeaves.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">{t('leave.no_vectors')}</td></tr>
                             )}
                          </tbody>
                        </table>
                      ) : activeTab === 'HISTORY' ? (
                        <table className="nexus-responsive-table w-full">
                          <thead>
                            <tr className="bg-[var(--bg-elevated)]/10">
                              <th className="px-10 py-6">{t('leave.handover_personnel')}</th>
                              <th className="py-6">{t('leave.leave_timeline')}</th>
                              <th className="py-6">{t('leave.accepted_on')}</th>
                              <th className="py-6">{t('leave.handover_status')}</th>
                              <th className="px-10 py-6 text-right">{t('leave.notes')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]/30 text-left">
                             {handoverHistory.map((rec, i) => (
                               <motion.tr key={rec.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                                  <td className="px-10 py-6" data-label={t('leave.handover_personnel')}>
                                     <div className="flex items-center gap-3">
                                        <div className={cn("w-2 h-2 rounded-full", rec.relieverId === user.id ? "bg-[var(--accent)]" : "bg-blue-500")} />
                                        <div>
                                          <p className="text-[12px] font-black text-[var(--text-primary)] uppercase tracking-tight">
                                            {rec.relieverId === user.id ? `Covering for ${rec.requester?.fullName}` : `${rec.reliever?.fullName} covering for me`}
                                          </p>
                                          <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{rec.relieverId === user.id ? rec.requester?.jobTitle : rec.reliever?.jobTitle}</p>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="py-6 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]" data-label={t('leave.leave_timeline')}>
                                     {rec.leaveRequest ? `${format(new Date(rec.leaveRequest.startDate), 'dd MMM')} — ${format(new Date(rec.leaveRequest.endDate), 'dd MMM yyyy')}` : '—'}
                                  </td>
                                  <td className="py-6 text-[10px] font-bold text-[var(--text-muted)]" data-label={t('leave.accepted_on')}>
                                     {format(new Date(rec.acceptedAt), 'PPp')}
                                  </td>
                                  <td className="py-6" data-label={t('leave.handover_status')}>
                                     <span className="px-3 py-1 rounded-lg bg-emerald-500/5 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-500/10 flex items-center gap-2 w-fit">
                                        <CheckCircle size={10} /> {rec.status}
                                     </span>
                                  </td>
                                  <td className="px-10 py-6 text-right" data-label={t('leave.notes')}>
                                     <div className="flex items-center justify-end gap-5">
                                        <button 
                                           className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest hover:underline underline-offset-4"
                                           onClick={() => toast.info(rec.handoverNotes || t('leave.no_instructions', "No specific instructions provided."))}
                                         >
                                           {t('leave.view_protocol', 'View Protocol')}
                                        </button>
                                        {userRank >= 90 && (
                                           <button 
                                             onClick={() => handleDeleteHandover(rec.id)}
                                             className="p-2 rounded-lg bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10"
                                             title={t('common.delete', 'Delete Record')}
                                           >
                                             <Trash2 size={14} />
                                           </button>
                                        )}
                                     </div>
                                  </td>
                               </motion.tr>
                             ))}
                             {handoverHistory.length === 0 && (
                                <tr><td colSpan={5} className="py-32 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30">{t('leave.no_handover_records', 'No handover history records found.')}</td></tr>
                             )}
                          </tbody>
                        </table>
                     ) : (
                        <div className="p-10 space-y-6 text-left">
                           {reliefRequests.map((req, i) => (
                             <motion.div key={req.id} initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.05 }}
                                  className="nx-card p-8 flex flex-col md:flex-row items-center justify-between border-[var(--border-subtle)] bg-[var(--bg-elevated)]/20 hover:border-[var(--accent)]/30 transition-all group"
                             >
                                <div className="flex items-center gap-8 mb-6 md:mb-0 w-full md:w-auto">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/5 text-[var(--accent)] border border-[var(--accent)]/10 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform flex-shrink-0"><Users size={24} /></div>
                                    <div className="flex-1 min-w-0">
                                       <p className="text-[13px] font-black text-[var(--text-primary)] uppercase tracking-tight">{t('leave.personnel_handover', { name: req.employee?.fullName })}</p>
                                       <p className="text-[11px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest">{format(new Date(req.startDate), 'PP')} — {format(new Date(req.endDate), 'PP')}</p>
                                       
                                       {req.handoverNotes && (
                                          <div className="mt-4 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50 text-[11px] text-[var(--text-secondary)] shadow-inner relative overflow-hidden group/note">
                                             <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/5 blur-3xl rounded-full opacity-0 group-hover/note:opacity-100 transition-opacity" />
                                             <p className="font-black uppercase tracking-[0.2em] text-[var(--primary)] mb-3 flex items-center gap-2">
                                                <HelpingHand size={14} /> Handover Protocol
                                             </p>
                                             <div className="whitespace-pre-wrap leading-relaxed opacity-90 font-medium border-l-2 border-[var(--primary)]/20 pl-4 py-1">
                                                {req.handoverNotes}
                                             </div>
                                             {req.relieverAcceptanceRequired && (
                                                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]/30 flex items-center gap-3">
                                                   <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                                                   <span className="px-3 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-[9px] font-black uppercase tracking-widest border border-[var(--accent)]/20">
                                                      Acknowledgment Required for Leave Validity
                                                   </span>
                                                </div>
                                             )}
                                          </div>
                                       )}
                                    </div>
                                </div>
                                <div className="flex gap-4 md:ml-8">
                                   <button onClick={() => handleRelieverResponse(req.id, true)} className="px-10 h-12 rounded-xl bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[rgba(var(--accent-rgb),0.3)] hover:scale-105 transition-all">{t('leave.accept_protocol')}</button>
                                   <button onClick={() => handleRelieverResponse(req.id, false)} className="px-10 h-12 rounded-xl border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/5 transition-all">{t('leave.decline_vector')}</button>
                                </div>
                             </motion.div>
                           ))}
                           {reliefRequests.length === 0 && (
                              <div className="py-24 flex flex-col items-center justify-center text-center opacity-30 italic space-y-4">
                                 <Users size={48} className="text-[var(--text-muted)]" />
                                 <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">{t('leave.no_handover_detected')}</h4>
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
          <div 
            className="modal-wrapper"
            onClick={() => setShowModal(false)}
          >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="modal-content-container"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="nx-card shadow-2xl overflow-visible modal-footer-clearance">
                  <div className="p-6 sm:p-12 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 backdrop-blur-xl sticky top-0 z-30 flex justify-between items-center rounded-t-[2rem]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                        <Calendar size={24} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight">{t('leave.initiate_vector_title')}</h2>
                    </div>
                    <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-all">
                       <X size={20} />
                    </button>
                  </div>

                  <div className="px-6 sm:px-12 py-6 relative modal-body-scroll custom-scrollbar">
                    <form id="leave-init-form" onSubmit={handleApply} className="space-y-6 relative z-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('leave.classification')}</label>
                            <select className="nx-input bg-[var(--bg-elevated)]/50" value={form.leaveType} onChange={e => setForm({...form, leaveType: e.target.value})}>
                              {Object.keys(leaveTypeIcons).map(tKey => <option key={tKey} value={tKey}>{t(`leave.types.${tKey}`)}</option>)}
                            </select>
                        </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('leave.relief_personnel')} <span className="text-[var(--primary)]/50 italic opacity-60">— {t('leave.peer_node_required')}</span></label>
                            <select className="nx-input bg-[var(--bg-elevated)]/50" value={form.relieverId} onChange={e => setForm({...form, relieverId: e.target.value})}>
                                <option value="">{t('leave.no_reliever')}</option>
                                {employees
                                  .filter(e => getRankFromRole(e.role) === userRank && e.id !== user.id)
                                  .map(e => (
                                    <option key={e.id} value={e.id}>{e.fullName} ({e.jobTitle})</option>
                                  ))
                                }
                            </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('leave.vector_commencement')}</label>
                            <input type="date" className="nx-input bg-[var(--bg-elevated)]/50" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('leave.vector_conclusion')}</label>
                            <input type="date" className="nx-input bg-[var(--bg-elevated)]/50" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('leave.mission_justification')}</label>
                          <textarea className="nx-input bg-[var(--bg-elevated)]/50 min-h-[80px] py-3" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder={t('leave.mission_placeholder')} required />
                      </div>

                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-2">{t('leave.handover_notes', 'Handover Notes for Reliever')}</label>
                          <textarea className="nx-input bg-[var(--bg-elevated)]/50 min-h-[100px] py-3 text-[11px] leading-relaxed" value={form.handoverNotes} onChange={e => setForm({...form, handoverNotes: e.target.value})} placeholder={t('leave.handover_placeholder', "Provide detailed instructions for the person covering your duties...")} />
                          
                          {form.relieverId && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/10">
                                <input 
                                  type="checkbox" 
                                  id="requireRelieverAcceptance"
                                  className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                  checked={form.relieverAcceptanceRequired}
                                  onChange={e => setForm({...form, relieverAcceptanceRequired: e.target.checked})}
                                />
                                <label htmlFor="requireRelieverAcceptance" className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest cursor-pointer select-none">
                                  {t('leave.require_handover_acceptance', 'Require Handover Acceptance')}
                                </label>
                            </motion.div>
                          )}
                      </div>
                    </form>
                  </div>

                  <div className="p-6 sm:px-12 pb-12 pt-0 relative z-20">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-12 rounded-2xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all order-2 sm:order-1">{t('common.abort')}</button>
                      <button form="leave-init-form" type="submit" disabled={saving} className="flex-[2] h-12 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-[rgba(var(--primary-rgb),0.35)] active:scale-95 transition-all order-1 sm:order-2">
                        {saving ? <Clock size={16} className="animate-spin mx-auto" /> : t('leave.deploy_vector')}
                      </button>
                    </div>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leave;
