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
      className="nx-card group overflow-hidden border-l-4"
      style={{ borderLeftColor: STATUS_CONFIG[target.status]?.color || 'var(--primary)' }}>
      
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn('px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border', STATUS_CONFIG[target.status]?.badge)}>
                {STATUS_CONFIG[target.status]?.label}
              </span>
              {isDepartmentTarget && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Users size={10} /> Dept
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight">{target.title}</h3>
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] line-clamp-1">{target.description || 'No description provided'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm font-black text-[var(--text-primary)]">{(target.progress || 0).toFixed(1)}%</div>
            <div className="w-24 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)] relative">
              <motion.div initial={{ width: 0 }} animate={{ width: `${target.progress || 0}%` }}
                className="h-full bg-[var(--primary)]" />
              {/* Expectation Marker */}
              {target.dueDate && target.createdAt && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white/40 shadow-sm"
                  style={{ left: `${Math.min(100, Math.max(0, ((Date.now() - new Date(target.createdAt).getTime()) / (new Date(target.dueDate).getTime() - new Date(target.createdAt).getTime())) * 100))}%` }}
                />
              )}
            </div>
          </div>
        </div>

        {expStatus && (
          <div className={cn("px-4 py-2 rounded-xl border border-transparent flex items-center justify-between", EXPECTATION_CONFIG[expStatus].bg)}>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className={EXPECTATION_CONFIG[expStatus].color} />
              <span className={cn("text-[10px] font-black uppercase tracking-widest", EXPECTATION_CONFIG[expStatus].color)}>
                {EXPECTATION_CONFIG[expStatus].label}
              </span>
            </div>
            <span className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Performance Pulse</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border-subtle)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]"><Users size={14} /></div>
            <div>
              <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Assignee</div>
              <div className="text-[11px] font-bold text-[var(--text-primary)]">{target.assignee?.fullName || target.department?.name || 'Unassigned'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]"><Calendar size={14} /></div>
            <div>
              <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Due Date</div>
              <div className="text-[11px] font-bold text-[var(--text-primary)]">{target.dueDate ? format(new Date(target.dueDate), 'MMM d, yyyy') : 'No date'}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center -space-x-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-white/10 flex items-center justify-center text-[8px] font-bold text-primary">T</div>
            <div className="pl-3 text-[10px] font-bold text-[var(--text-muted)]">{target.metrics?.length || 0} Metrics</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-primary hover:border-primary/30 transition-all"><Layers size={14} /></button>
            
            {isDepartmentTarget && canReview && onCascade && (
              <button 
                onClick={onCascade}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-all flex items-center gap-2"
              >
                <Plus size={12} /> Cascade
              </button>
            )}

            {isOwner && target.status === 'ASSIGNED' && (
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => onAcknowledge('ACKNOWLEDGED')}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle size={12} /> Acknowledge
                </button>
                <button 
                  onClick={() => {
                    const msg = window.prompt('Please provide details for clarification:');
                    if (msg) onAcknowledge('DRAFT', msg);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-[10px] font-black uppercase tracking-widest hover:border-rose-400 transition-all font-bold"
                >
                  Clarify
                </button>
              </div>
            )}

            {isOwner && ['ACKNOWLEDGED', 'IN_PROGRESS'].includes(target.status) && (
              <button 
                onClick={() => setShowUpdate(true)} 
                className="px-6 py-1.5 rounded-lg bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
              >
                <TrendingUp size={12} /> Update Progress
              </button>
            )}
            
            {canReview && target.status === 'UNDER_REVIEW' && (
              <button onClick={() => onReview(true)} className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
                <Award size={12} /> Review
              </button>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3 pt-4 mt-2 border-t border-[var(--border-subtle)]/30">
            {onEdit && (
              <button 
                onClick={onEdit}
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest hover:border-[var(--primary)]/30 transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={12} /> Edit Target
              </button>
            )}
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className={cn("flex-1 px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2", showDetails ? "bg-primary text-white border-primary" : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--primary)]/30")}
            >
              <Layers size={12} /> {showDetails ? 'Hide Timeline' : 'View History'}
            </button>
            {onDelete && (
              <button 
                onClick={() => { if(window.confirm('Are you sure? This will delete the target for EVERYONE including staff and managers.')) onDelete(); }}
                className="px-4 py-2 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={12} /> Delete
              </button>
            )}
          </div>
        )}

        {/* Metric Breakdown & Progress */}
        <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]/30">
           <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest mb-3 flex items-center gap-2">
             <Award size={14} className="text-[var(--primary)]" /> Metric-Level Progress
           </p>
           {target.metrics.map(m => {
             const prog = m.targetValue ? Math.min(100, (m.currentValue / m.targetValue) * 100) : 0;
             const remaining = m.targetValue ? Math.max(0, m.targetValue - m.currentValue) : 0;
             return (
               <div key={m.id} className="p-4 rounded-2xl bg-white/[0.02] border border-[var(--border-subtle)] space-y-3">
                 <div className="flex justify-between items-start">
                   <div>
                     <h4 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">{m.title}</h4>
                     <p className="text-[9px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{m.metricType} Goal</p>
                   </div>
                   <div className="text-right">
                     <span className="text-xs font-black text-[var(--text-primary)]">{prog.toFixed(1)}%</span>
                   </div>
                 </div>
                 
                 {/* Mini progress bar */}
                 <div className="h-2 w-full bg-slate-500/10 rounded-full overflow-hidden relative">
                   <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }}
                    className={cn("h-full transition-all duration-1000", prog >= 100 ? "bg-emerald-500" : "bg-[var(--primary)]")} />
                 </div>

                 {/* Stats */}
                 <div className="grid grid-cols-3 gap-2">
                   <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-center">
                     <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-0.5">Required</div>
                     <div className="text-[11px] font-black text-[var(--text-primary)]">{m.targetValue} {m.unit}</div>
                   </div>
                   <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-center">
                     <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-0.5">Met</div>
                     <div className="text-[11px] font-black text-emerald-500">{m.currentValue} {m.unit}</div>
                   </div>
                   <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-center">
                     <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-0.5">Left</div>
                     <div className="text-[11px] font-black text-rose-500">{remaining.toFixed(1)} {m.unit}</div>
                   </div>
                 </div>
               </div>
             );
           })}
        </div>

        {/* History Timeline Expansion */}
        <AnimatePresence>
          {showDetails && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-strong)]/30 mt-4"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} className="text-indigo-400" /> Objective History & Timeline
                  </p>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                    {target.updates?.length || 0} Entries
                  </span>
                </div>

                <div className="space-y-4 border-l-2 border-[var(--border-subtle)] ml-2 pl-6 py-2">
                  {target.updates?.length ? (
                    target.updates.map((update, idx) => (
                      <div key={update.id || idx} className="relative mb-8 last:mb-2">
                        {/* Dot */}
                        <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--primary)] border-2 border-white shadow-sm ring-4 ring-[var(--primary)]/10" />
                        
                        <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-subtle)] shadow-sm hover:border-[var(--primary)]/30 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-[var(--text-primary)]">
                              {update.submittedBy?.fullName || 'Colleague'}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] font-medium">
                              {update.createdAt ? format(new Date(update.createdAt), 'MMM d, h:mm a') : 'Recently'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-3">
                             <div className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-tighter">
                                {update.metric?.title || 'General Progress'}
                             </div>
                             <div className="text-[11px] font-black text-emerald-500 flex items-center gap-1">
                                <TrendingUp size={10} /> +{update.value} 
                             </div>
                          </div>

                          {update.comment && (
                            <div className="p-3 bg-[var(--bg-elevated)] rounded-lg text-xs italic text-[var(--text-secondary)] leading-relaxed border-l-2 border-amber-500/30">
                               "{update.comment}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest py-4">No progress updates recorded yet.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showUpdate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-[var(--border-subtle)]/50 space-y-4">
          <div className="p-5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-strong)]/30 space-y-5 shadow-inner">
            <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-[0.2em] mb-2 px-1">Update Progress Metrics</p>
            {target.metrics.map(m => (
              <div key={m.id} className="space-y-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]/50">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">{m.title}</label>
                  <span className="text-xs font-black text-[var(--primary)]">{updates[m.id]} {m.unit || ''}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max={m.targetValue * 1.5} 
                      value={updates[m.id]} 
                      onChange={(e) => setUpdates({...updates, [m.id]: parseFloat(e.target.value)})}
                      className="flex-1 nx-range" 
                      style={{ minHeight: '12px' }}
                    />
                    <div className="text-[10px] font-bold text-[var(--text-muted)] min-w-[3rem] text-right">Target: {m.targetValue}</div>
                  </div>
                  <input 
                    type="text"
                    placeholder="Progress note/comment..."
                    value={metricComments[m.id] || ''}
                    onChange={(e) => setMetricComments({...metricComments, [m.id]: e.target.value})}
                    className="nx-input-compact"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowUpdate(false)} className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Cancel</button>
            <button onClick={() => {
              const metricUpdates = Object.entries(updates).map(([id, val]) => ({ 
                metricId: id, 
                value: val,
                comment: metricComments[id] || ''
              }));
              onUpdateProgress(metricUpdates, true);
              setShowUpdate(false);
            }} className="px-10 py-3 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-primary/20">Submit Update</button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TargetCard;
