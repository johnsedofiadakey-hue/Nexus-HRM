import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Award, Layers, TrendingUp, Calendar, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
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

const STATUS_CONFIG: Record<string, { label: string; badge: string; color: string }> = {
  DRAFT: { label: 'Draft', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', color: '#64748b' },
  ASSIGNED: { label: 'Assigned', badge: 'bg-blue-500/10 text-blue-800 dark:text-blue-400 border-blue-500/20', color: '#3b82f6' },
  ACKNOWLEDGED: { label: 'Acknowledged', badge: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 border-indigo-500/20', color: '#6366f1' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-amber-500/10 text-amber-900 dark:text-amber-400 border-amber-500/20', color: '#f59e0b' },
  UNDER_REVIEW: { label: 'Under Review', badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-400 border-purple-500/20', color: '#a855f7' },
  COMPLETED: { label: 'Completed', badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20', color: '#10b981' },
  OVERDUE: { label: 'Overdue', badge: 'bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-500/20', color: '#f43f5e' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', color: '#64748b' },
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
  
  // Defensive rank check: if role is 'Managing Director' or 'MD', ensure rank 90
  const rank = (user?.role?.toUpperCase() === 'MANAGING DIRECTOR' || user?.role?.toUpperCase() === 'MD') ? 90 : userRank;

  const isOwner = target.assignee?.fullName === user.name;
  const canReview = isReviewer || target.reviewerId === user.id;
  const canEdit = target.originatorId === user.id || rank >= 80;
  const isDepartmentTarget = target.level === 'DEPARTMENT';

  // Performance vs Expectation Logic
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
  const EXPECTATION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    AHEAD: { label: 'Ahead of Target', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ON_TRACK: { label: 'On Track', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    BEHIND: { label: 'Behind Schedule', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    CRITICAL: { label: 'Overdue / At Risk', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    SUCCESS: { label: 'Exceeded Target', color: 'text-emerald-400', bg: 'bg-emerald-400/20' }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        "nx-card group overflow-hidden border-l-4 transition-all duration-300",
        showDetails ? "ring-2 ring-primary/20 shadow-2xl" : "hover:shadow-lg",
        STATUS_CONFIG[target.status]?.color ? "" : "border-l-primary"
      )}
      style={{ borderLeftColor: STATUS_CONFIG[target.status]?.color || 'var(--primary)' }}>
      
      {/* Compact Main Row */}
      <div 
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shrink-0', STATUS_CONFIG[target.status]?.badge)}>
              {STATUS_CONFIG[target.status]?.label}
            </span>
            {isDepartmentTarget && (
              <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1 shrink-0">
                <Users size={10} /> Dept
              </span>
            )}
            <span className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1 shrink-0">
               <Clock size={10} /> {target.dueDate ? format(new Date(target.dueDate), 'MMM d') : 'No date'}
            </span>
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight truncate">{target.title}</h3>
          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
             <span className="font-medium truncate max-w-[150px]">By {target.assignee?.fullName || target.department?.name || 'Unassigned'}</span>
             {expStatus && (
               <span className={cn("font-black uppercase tracking-tighter", EXPECTATION_CONFIG[expStatus].color)}>
                 {EXPECTATION_CONFIG[expStatus].label}
               </span>
             )}
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[var(--text-primary)]">{(target.progress || 0).toFixed(0)}%</span>
              <div className="w-20 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)] relative">
                <motion.div initial={{ width: 0 }} animate={{ width: `${target.progress || 0}%` }}
                  className="h-full bg-[var(--primary)]" />
              </div>
            </div>
            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Overall Progress</div>
          </div>
          <motion.div animate={{ rotate: showDetails ? 180 : 0 }} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
             <Plus size={16} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 space-y-6 pt-2 border-t border-[var(--border-subtle)]/30 bg-[var(--bg-elevated)]/30">
              
              {/* Detailed Description & Actions */}
              <div className="space-y-4 pt-2">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {target.description || 'Securely pursuing the objectives outlined in this strategic target.'}
                </p>
                
                <div className="flex flex-wrap items-center gap-3">
                  {isDepartmentTarget && canReview && onCascade && (
                    <button onClick={onCascade} className="btn-action-indigo flex items-center gap-2 font-bold uppercase tracking-widest text-[9px] px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/10 transition-all">
                      <Plus size={12} /> Cascade Goal
                    </button>
                  )}

                  {isOwner && target.status === 'ASSIGNED' && (
                    <div className="flex gap-2">
                      <button onClick={() => onAcknowledge('ACKNOWLEDGED')} className="btn-action-green flex items-center gap-2 font-black uppercase tracking-widest text-[9px] px-3 py-1.5 rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                        <CheckCircle size={12} /> Acknowledge
                      </button>
                      <button onClick={() => { const msg = window.prompt('Needs clarification?'); if(msg) onAcknowledge('DRAFT', msg); }} className="btn-action-subtle text-[9px] font-bold uppercase px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] rounded-lg">
                        Clarify
                      </button>
                    </div>
                  )}

                  {isOwner && ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(target.status) && (
                    <button onClick={() => setShowUpdate(!showUpdate)} className="btn-action-primary flex items-center gap-2 font-black uppercase tracking-widest text-[9px] px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white shadow-lg shadow-primary/20">
                      <TrendingUp size={12} /> {showUpdate ? 'Close Update' : 'Update Metrics'}
                    </button>
                  )}
                  
                  {canReview && target.status === 'UNDER_REVIEW' && (
                    <button onClick={() => onReview(true)} className="btn-action-amber flex items-center gap-2 font-black uppercase tracking-widest text-[9px] px-4 py-1.5 rounded-lg bg-amber-500 text-black shadow-lg shadow-amber-500/20">
                      <Award size={12} /> Finalize Review
                    </button>
                  )}

                  <div className="flex-1" />
                  
                  {canEdit && (
                    <div className="flex gap-2">
                      <button onClick={onEdit} className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-primary transition-all">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => { if(window.confirm('Delete this target?')) onDelete?.(); }} className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-rose-400 hover:bg-rose-500/10 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Update Form Inside Card */}
              {showUpdate && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-[var(--bg-card)] border-2 border-[var(--primary)]/20 space-y-5 shadow-xl"
                >
                  <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">Live Pulse Update</p>
                  {target.metrics.map(m => (
                    <div key={m.id} className="space-y-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]/50">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">{m.title}</label>
                        <span className="text-xs font-black text-[var(--primary)]">{updates[m.id]} {m.unit || ''}</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <input type="range" min="0" max={m.targetValue * 1.5} value={updates[m.id]} onChange={(e) => setUpdates({...updates, [m.id]: parseFloat(e.target.value)})} className="nx-range" />
                        <input type="text" placeholder="Update comment..." value={metricComments[m.id] || ''} onChange={(e) => setMetricComments({...metricComments, [m.id]: e.target.value})} className="nx-input-compact" />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setShowUpdate(false)} className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Cancel</button>
                    <button onClick={() => {
                      const metricUpdates = Object.entries(updates).map(([id, val]) => ({ 
                        metricId: id, value: val, comment: metricComments[id] || ''
                      }));
                      onUpdateProgress(metricUpdates, true);
                      setShowUpdate(false);
                    }} className="px-8 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Sync Progress</button>
                  </div>
                </motion.div>
              )}

              {/* Metric Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Detailed Metric Performance</p>
                   <Layers size={12} className="text-[var(--text-muted)]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {target.metrics.map(m => {
                     const prog = m.targetValue ? Math.min(100, (m.currentValue / m.targetValue) * 100) : 0;
                     const remaining = m.targetValue ? Math.max(0, m.targetValue - m.currentValue) : 0;
                     return (
                       <div key={m.id} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/60 space-y-3">
                         <div className="flex justify-between items-start">
                           <h4 className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">{m.title}</h4>
                           <span className={cn("text-[10px] font-black", prog >= 90 ? "text-emerald-500" : "text-[var(--text-primary)]")}>{prog.toFixed(1)}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-500/10 rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }}
                            className={cn("h-full", prog >= 100 ? "bg-emerald-500" : "bg-[var(--primary)]")} />
                         </div>
                         <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter text-[var(--text-muted)]">
                            <span>Met: <span className="text-[var(--text-primary)]">{m.currentValue}</span></span>
                            <span>Goal: <span className="text-[var(--text-primary)]">{m.targetValue}</span></span>
                            <span className={remaining > 0 ? "text-rose-400" : "text-emerald-400"}>Left: {remaining.toFixed(1)}</span>
                         </div>
                       </div>
                     );
                   })}
                </div>
              </div>

              {/* History Timeline */}
              <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]/30">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Audit Trail & Timeline</p>
                  <Clock size={12} className="text-[var(--text-muted)]" />
                </div>
                <div className="space-y-3 pl-3 border-l border-[var(--border-subtle)]">
                  {target.updates?.length ? (
                    target.updates.slice(0, 5).map((update, idx) => (
                      <div key={update.id || idx} className="relative pl-4 pb-4 last:pb-0">
                        <div className="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full bg-[var(--primary)] shadow-sm" />
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[var(--text-primary)]">{update.submittedBy?.fullName}</span>
                          <span className="text-[8px] text-[var(--text-muted)] uppercase">{update.createdAt ? format(new Date(update.createdAt), 'MMM d, HH:mm') : ''}</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] italic leading-tight">
                           {update.comment || `Updated ${update.metric?.title || 'general progress'}`}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[9px] italic text-[var(--text-muted)]">No updates logged yet.</p>
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

export default TargetCard;
