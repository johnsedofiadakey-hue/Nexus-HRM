import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Search, Filter, Inbox as InboxIcon, 
  ArrowRight, Target, ClipboardCheck, Users, 
  Calendar, AlertCircle, Clock, ChevronRight,
  ExternalLink, Hash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { cn } from '../utils/cn';
import { formatDistanceToNow, format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface InboxAction {
  id: string;
  type: 'TARGET_ACK' | 'TARGET_REVIEW' | 'APPRAISAL_REVIEW' | 'LEAVE_RELIEF' | 'LEAVE_APPROVE';
  title: string;
  subtitle: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link: string;
  data?: { startDate?: string; endDate?: string; reason?: string };
  createdAt: string;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  TARGET_ACK: { icon: Target, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10', label: 'KPI Acknowledgement' },
  TARGET_REVIEW: { icon: Target, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10', label: 'KPI Review' },
  APPRAISAL_REVIEW: { icon: ClipboardCheck, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10', label: 'Appraisal' },
  LEAVE_RELIEF: { icon: Users, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10', label: 'Leave Handover' },
  LEAVE_APPROVE: { icon: Calendar, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10', label: 'Leave Approval' },
};

const ActionCenter: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [actions, setActions] = useState<InboxAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'LEAVE' | 'PERFORMANCE'>('ALL');

  const fetchInbox = async () => {
    try {
      const res = await api.get('/inbox');
      setActions(res.data || []);
    } catch (e) {
      console.error('Inbox Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const filteredActions = actions.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                         a.subtitle.toLowerCase().includes(search.toLowerCase()) ||
                         (a.data?.reason?.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filter === 'ALL') return true;
    if (filter === 'HIGH') return a.priority === 'HIGH';
    if (filter === 'LEAVE') return a.type.includes('LEAVE');
    if (filter === 'PERFORMANCE') return a.type.includes('TARGET') || a.type.includes('APPRAISAL');
    return true;
  });

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                <InboxIcon size={12} className="animate-pulse" /> Unified Action Center
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Real-time Decision Hub</span>
          </div>
          <h1 className="font-black text-5xl text-[var(--text-primary)] tracking-tight leading-none">
            Inbox <span className="text-[var(--text-muted)] font-thin">/ Full Interface</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed italic">
            Review, read, and execute organizational requests from a centralized portal.
          </p>
        </motion.div>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        <div className="xl:col-span-8 flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
              <input 
                type="text" 
                placeholder="Search through messages, reasons, or personnel..." 
                className="nx-input pl-14 h-14 rounded-2xl bg-[var(--bg-elevated)]/50 focus:bg-[var(--bg-card)] transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 h-14">
              {[
                { id: 'ALL', label: 'All Actions' },
                { id: 'HIGH', label: 'Critical Only' },
                { id: 'LEAVE', label: 'Leave' },
                { id: 'PERFORMANCE', label: 'Performance' },
              ].map(btn => (
                <button 
                  key={btn.id}
                  onClick={() => setFilter(btn.id as any)}
                  className={cn(
                    "px-6 h-full rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                    filter === btn.id 
                      ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20" 
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30"
                  )}
                >
                  {btn.label}
                </button>
              ))}
           </div>
        </div>
        <div className="xl:col-span-4 flex justify-end">
           <div className="px-6 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center gap-4">
              <div className="text-right">
                 <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] leading-none">Awaiting Decision</p>
                 <p className="text-xl font-black text-[var(--text-primary)] mt-1">{filteredActions.length} Items</p>
              </div>
              <div className="w-[1px] h-8 bg-[var(--border-subtle)]" />
              <Filter className="text-[var(--primary)]" size={20} />
           </div>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="py-40 flex flex-col items-center gap-6 opacity-40 italic">
               <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Compiling Action Registry...</p>
            </div>
          ) : filteredActions.length === 0 ? (
            <motion.div 
               initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
               className="py-40 flex flex-col items-center text-center opacity-40 italic space-y-6"
            >
               <div className="w-24 h-24 rounded-[3rem] bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                  <InboxIcon size={40} />
               </div>
               <div>
                  <p className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">No Pending Decisions</p>
                  <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mt-1">All organizational vectors are clear</p>
               </div>
            </motion.div>
          ) : (
            filteredActions.map((action, idx) => {
              const cfg = typeConfig[action.type] || { icon: AlertCircle, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-elevated)]', label: 'General' };
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03 }}
                  className="nx-card group overflow-hidden border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] hover:shadow-2xl hover:shadow-[var(--primary)]/5"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center gap-8 p-10">
                    {/* Visual Indicator */}
                    <div className="flex items-center gap-6">
                       <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500", cfg.bg, cfg.color)}>
                         <Icon size={32} />
                       </div>
                       <div className="space-y-1">
                          <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border w-fit", 
                            action.priority === 'HIGH' ? "text-rose-500 border-rose-500/20 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.1)]" : "text-[var(--text-muted)] border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                          )}>
                            {action.priority === 'HIGH' ? 'Critical Priority' : `${action.priority} Priority`}
                          </span>
                          <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">{cfg.label}</span>
                       </div>
                    </div>

                    <div className="flex-1 space-y-4">
                       <div>
                          <h4 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight group-hover:text-[var(--primary)] transition-colors">{action.title}</h4>
                          <p className="text-[13px] font-medium text-[var(--text-secondary)] uppercase tracking-[0.1em] mt-1 italic opacity-80">{action.subtitle}</p>
                       </div>

                       {/* 📖 FULL READABLE DATA */}
                       {action.data?.startDate && action.data?.endDate && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2rem] bg-[var(--primary)]/5 border border-[var(--primary)]/10 shadow-inner">
                            <div className="space-y-4 border-r border-[var(--primary)]/10 pr-6">
                               <div className="flex items-center gap-3">
                                  <Calendar size={14} className="text-[var(--primary)]" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Timeframe Registry</span>
                               </div>
                               <div className="flex items-center gap-4">
                                  <div className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20">
                                   {format(new Date(action.data.startDate), 'MMMM dd, yyyy')}
                                  </div>
                                  <ArrowRight size={14} className="text-[var(--text-muted)]" />
                                  <div className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20">
                                   {format(new Date(action.data.endDate), 'MMMM dd, yyyy')}
                                  </div>
                               </div>
                            </div>
                            {action.data?.reason && (
                              <div className="space-y-4">
                                 <div className="flex items-center gap-3">
                                    <AlertCircle size={14} className="text-[var(--primary)]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Official Request Reason</span>
                                 </div>
                                 <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed bg-[var(--bg-card)]/50 p-4 rounded-2xl border border-[var(--border-subtle)] shadow-sm">
                                   "{action.data.reason}"
                                 </p>
                              </div>
                            )}
                         </div>
                       )}
                    </div>

                    <div className="xl:w-64 flex flex-col items-center xl:items-end justify-center gap-4 pt-6 xl:pt-0 border-t xl:border-t-0 xl:border-l border-[var(--border-subtle)] xl:pl-8">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                          <Clock size={12} /> {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                       </div>
                       <button 
                         onClick={() => navigate(action.link)}
                         className="w-full flex items-center justify-center gap-3 px-8 h-14 rounded-2xl bg-[var(--primary)] text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/20 hover:scale-[1.05] active:scale-95 transition-all text-center no-underline"
                       >
                         Execute Review <ExternalLink size={14} />
                       </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer System Status */}
      <div className="pt-10 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
         <div className="flex items-center gap-4">
            <Hash size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Vector Registry: V3.4.5</span>
         </div>
         <p className="text-[9px] font-bold uppercase tracking-widest">All actions are logged in the audit hierarchy.</p>
      </div>
    </div>
  );
};

export default ActionCenter;
