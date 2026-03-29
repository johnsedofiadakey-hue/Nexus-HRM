import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Award, Layers, TrendingUp, Calendar, Trash2, CheckCircle, Clock, AlertCircle, ChevronDown, User, Building2, Target, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { getStoredUser, getRankFromRole } from '../../utils/session';

interface TargetMetric {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  metricType: 'NUMERICAL' | 'PERCENTAGE' | 'BOOLEAN' | 'FINANCIAL' | 'QUALITATIVE';
  updates?: any[];
}

interface TargetProps {
  target: {
    id: string;
    title: string;
    description?: string;
    level: 'DEPARTMENT' | 'INDIVIDUAL';
    status: string;
    dueDate?: string;
    createdAt?: string;
    progress?: number;
    weight?: number;
    metrics: TargetMetric[];
    assignee?: { fullName: string; avatarUrl?: string };
    department?: { name: string };
    originator?: { fullName: string };
    originatorId: string;
    reviewerId?: string;
    updates?: any[];
  };
  onAcknowledge: (status: string, message?: string) => void;
  onUpdateProgress: (updates: any[], submit: boolean) => void;
  onReview: (approved: boolean, feedback?: string) => void;
  onCascade?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isReviewer?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; color: string; ring: string }> = {
  DRAFT: { label: 'Draft', badge: 'bg-slate-100 text-slate-600 border-slate-200', color: '#64748b', ring: 'ring-slate-400/20' },
  ASSIGNED: { label: 'Assigned', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100', color: '#6366f1', ring: 'ring-indigo-400/20' },
  ACKNOWLEDGED: { label: 'Acknowledged', badge: 'bg-blue-50 text-blue-700 border-blue-100', color: '#3b82f6', ring: 'ring-blue-400/20' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-amber-50 text-amber-700 border-amber-100', color: '#f59e0b', ring: 'ring-amber-400/20' },
  UNDER_REVIEW: { label: 'Under Review', badge: 'bg-purple-50 text-purple-700 border-purple-100', color: '#a855f7', ring: 'ring-purple-400/20' },
  COMPLETED: { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', color: '#10b981', ring: 'ring-emerald-400/20' },
  OVERDUE: { label: 'Overdue', badge: 'bg-rose-50 text-rose-700 border-rose-100', color: '#f43f5e', ring: 'ring-rose-400/20' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-slate-100 text-slate-600 border-slate-200', color: '#64748b', ring: 'ring-slate-400/20' },
};

const TargetCard: React.FC<TargetProps> = ({ target, onAcknowledge, onUpdateProgress, onReview, onCascade, onEdit, onDelete, isReviewer }) => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [metricComments, setMetricComments] = useState<Record<string, string>>({});
  const [updates, setUpdates] = useState<Record<string, number>>(
    target.metrics.reduce((acc, m) => ({ ...acc, [m.id]: m.currentValue }), {})
  );

  const user = getStoredUser();
  const userRank = getRankFromRole(user?.role);
  const rank = (user?.role?.toUpperCase() === 'MANAGING DIRECTOR' || user?.role?.toUpperCase() === 'MD') ? 90 : userRank;

  const isOwner = target.assignee?.fullName === user.name;
  const canReview = isReviewer || target.reviewerId === user.id;
  const canEdit = target.originatorId === user.id || rank >= 80;
  const isDepartmentTarget = target.level === 'DEPARTMENT';

  const getExpectationStatus = () => {
    if (!target.dueDate || !target.createdAt) return null;
    const start = new Date(target.createdAt).getTime();
    const end = new Date(target.dueDate).getTime();
    const now = Date.now();
    if (now >= end) return target.progress && target.progress >= 100 ? 'SUCCESS' : 'CRITICAL';
    const totalDuration = end - start;
    const elapsed = now - start;
    if (totalDuration <= 0) return null;
    const expectedProgress = (elapsed / totalDuration) * 100;
    const actualProgress = target.progress || 0;
    const delta = actualProgress - expectedProgress;
    if (delta >= 5) return 'AHEAD';
    if (delta <= -10) return 'BEHIND';
    return 'ON_TRACK';
  };

  const expStatus = getExpectationStatus();
  const EXPECTATION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    AHEAD: { label: 'Ahead', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: TrendingUp },
    ON_TRACK: { label: 'On Track', color: 'text-blue-600', bg: 'bg-blue-50', icon: CheckCircle },
    BEHIND: { label: 'Behind', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
    CRITICAL: { label: 'Critical', color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle },
    SUCCESS: { label: 'Achieved', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: Award }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-[2rem] border transition-all duration-500 bg-white/80 backdrop-blur-xl",
        showDetails ? "ring-8 ring-primary/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-20" : "hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] border-slate-200/60 z-10",
        STATUS_CONFIG[target.status]?.ring
      )}>
      
      {/* Dynamic Pulse Accent */}
      <div 
        className="absolute top-0 left-8 right-8 h-1 rounded-full overflow-hidden opacity-40"
        style={{ background: `linear-gradient(to right, transparent, ${STATUS_CONFIG[target.status]?.color}, transparent)` }}
      />

      {/* Main Row */}
      <div 
        className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer select-none"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex-1 min-w-0 flex gap-4 pr-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
            isDepartmentTarget ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-500"
          )}>
            {isDepartmentTarget ? <Building2 size={22} /> : <User size={22} />}
          </div>
          <div className="space-y-1.5 min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm', STATUS_CONFIG[target.status]?.badge)}>
                {STATUS_CONFIG[target.status]?.label}
              </span>
              {expStatus && (
                <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-current/20", EXPECTATION_CONFIG[expStatus].bg, EXPECTATION_CONFIG[expStatus].color)}>
                  {React.createElement(EXPECTATION_CONFIG[expStatus].icon, { size: 10 })} {EXPECTATION_CONFIG[expStatus].label}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-800 leading-tight truncate tracking-tight">{target.title}</h3>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500/80">
               <span className="flex items-center gap-1 font-bold">{target.assignee?.fullName || target.department?.name || 'Unassigned'}</span>
               <span className="w-1 h-1 rounded-full bg-slate-200" />
               <span className="flex items-center gap-1"><Calendar size={10} className="text-slate-400" /> {target.dueDate ? format(new Date(target.dueDate), 'MMM d, yyyy') : 'No due date'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 shrink-0 lg:border-l lg:border-slate-100 lg:pl-8 justify-between sm:justify-end">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-slate-800 tabular-nums">{(target.progress || 0).toFixed(0)}<span className="text-xs text-slate-300 ml-0.5">%</span></span>
              <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${target.progress || 0}%` }}
                  className="h-full bg-primary" />
              </div>
            </div>
            <div className="text-[9px] font-black text-slate-400/80 uppercase tracking-[0.15em]">System Vitality</div>
          </div>
          <motion.div animate={{ rotate: showDetails ? 180 : 0 }} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all">
             <ChevronDown size={20} strokeWidth={2.5} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-7 pb-10 pt-4 space-y-10 bg-slate-50/40 rounded-b-[2rem] border-t border-slate-200/30">
              
              {/* Description & Dynamic Actions */}
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between pt-4">
                <div className="max-w-xl text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 opacity-60">Strategic Context</p>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {target.description || 'Executing outlined operational excellence mandates to achieve strategic organizational alignment.'}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {isDepartmentTarget && canReview && onCascade && (
                    <button onClick={(e) => { e.stopPropagation(); onCascade(); }} className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95">
                      <Plus size={14} strokeWidth={3} /> Cascade
                    </button>
                  )}

                  {isOwner && target.status === 'ASSIGNED' && (
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); onAcknowledge('ACKNOWLEDGED'); }} className="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95">
                        <CheckCircle size={14} strokeWidth={3} /> Accept
                      </button>
                    </div>
                  )}

                  {isOwner && ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(target.status) && (
                    <button onClick={(e) => { e.stopPropagation(); setShowUpdate(!showUpdate); }} className="px-6 py-2.5 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95">
                      <TrendingUp size={14} strokeWidth={3} /> {showUpdate ? 'Dismiss' : 'Log Pulse'}
                    </button>
                  )}
                  
                  {canReview && target.status === 'UNDER_REVIEW' && (
                    <button onClick={(e) => { e.stopPropagation(); onReview(true); }} className="px-6 py-2.5 rounded-2xl bg-amber-500 text-white shadow-xl shadow-amber-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95">
                      <Award size={14} strokeWidth={3} /> Finalize
                    </button>
                  )}
                  
                  {canEdit && (
                    <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-2.5 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-50 transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this target?')) onDelete?.(); }} className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Update Layer */}
              {showUpdate && (
                <motion.div initial={{ opacity: 0, scale: 0.98, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="p-7 rounded-[2rem] bg-white border-2 border-primary/10 shadow-[0_30px_60px_rgba(var(--primary-rgb),0.1)] space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Operational Pulse Log</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {target.metrics.map(m => (
                      <div key={m.id} className="space-y-4 p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/20 transition-all group">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">{m.title}</label>
                          <span className="px-3 py-1 bg-white border border-slate-100 rounded-xl text-xs font-black text-primary tabular-nums shadow-sm">{updates[m.id]} {m.unit || ''}</span>
                        </div>
                        <input type="range" min="0" max={m.targetValue * 1.5} value={updates[m.id]} onChange={(e) => setUpdates({...updates, [m.id]: parseFloat(e.target.value)})} className="nx-range" />
                        <input type="text" placeholder="Observations / Remarks..." value={metricComments[m.id] || ''} onChange={(e) => setMetricComments({...metricComments, [m.id]: e.target.value})} className="nx-input p-3 text-xs bg-white border-slate-200/60" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setShowUpdate(false)} className="px-6 py-3 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all">Cancel</button>
                    <button onClick={() => {
                      const metricUpdates = Object.entries(updates).map(([id, val]) => ({ metricId: id, value: val, comment: metricComments[id] || '' }));
                      onUpdateProgress(metricUpdates, true);
                      setShowUpdate(false);
                    }} className="px-12 py-3.5 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/40 hover:brightness-110 active:scale-95 transition-all">Sync Pulse</button>
                  </div>
                </motion.div>
              )}

              {/* Metric Breakdown View */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Metric Insight Layer</h4>
                   <div className="w-10 h-1 rounded-full bg-slate-200/50" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {target.metrics.map(m => {
                     const prog = m.targetValue ? Math.min(100, (m.currentValue / m.targetValue) * 100) : 0;
                     const isDone = prog >= 100;
                     return (
                       <div key={m.id} className="group p-6 rounded-3xl bg-white border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500">
                         <div className="flex justify-between items-start mb-4">
                           <h5 className="text-xs font-bold text-slate-700 leading-snug line-clamp-2 pr-6">{m.title}</h5>
                           <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-12", isDone ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-300")}>
                              {isDone ? <CheckCircle size={16} strokeWidth={2.5} /> : <TrendingUp size={16} strokeWidth={2.5} />}
                           </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-end">
                               <span className="text-2xl font-black text-slate-800 tracking-tighter tabular-nums">{prog.toFixed(0)}<span className="text-[10px] text-slate-300 ml-0.5">%</span></span>
                               <span className="px-2 py-0.5 bg-slate-50 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{m.unit || 'Score'}</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5">
                               <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }}
                                className={cn("h-full rounded-full shadow-sm transition-colors duration-1000", isDone ? "bg-emerald-500" : "bg-primary")} />
                            </div>
                            <div className="flex justify-between pt-1 px-1">
                               <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1.5">Met</span>
                                  <span className="text-xs font-bold text-slate-700 tracking-tight">{m.currentValue}</span>
                               </div>
                               <div className="flex flex-col items-end">
                                  <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1.5">Goal</span>
                                  <span className="text-xs font-bold text-slate-700 tracking-tight">{m.targetValue}</span>
                               </div>
                            </div>
                         </div>
                       </div>
                     );
                   })}
                </div>
              </div>

              {/* Audit Timeline High-End */}
              <div className="pt-8 border-t border-slate-200/50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400">
                    <Clock size={18} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Execution Integrity Log</h4>
                    <p className="text-[9px] font-bold text-slate-400">Validated chronological audit of operational shift data.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                  {target.updates?.length ? (
                    target.updates.slice(0, 4).map((update, idx) => (
                      <div key={update.id || idx} className="relative pl-7 group">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 group-last:bg-gradient-to-b group-last:from-slate-200 group-last:to-transparent" />
                        <div className="absolute -left-[4px] top-2 w-[9px] h-[9px] rounded-full bg-white border-2 border-slate-300" />
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl hover:shadow-lg transition-all text-left">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-800">{update.submittedBy?.fullName}</span>
                              <span className="text-[9px] font-black text-primary tabular-nums tracking-tighter opacity-70">{update.createdAt ? format(new Date(update.createdAt), 'MMM d, p') : ''}</span>
                           </div>
                           <p className="text-[11px] text-slate-500 italic font-medium leading-relaxed">
                              {update.comment || `Incremented metrics for ${update.metric?.title || 'this objective'}`}
                           </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-50 border-2 border-slate-100 border-dashed rounded-[1.5rem] p-10 text-center w-full md:col-span-2">
                       <p className="text-[10px] font-bold text-slate-400 opacity-60 uppercase tracking-widest">Initial System Setup Confirmed. No operational variance logged.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TargetCard;
