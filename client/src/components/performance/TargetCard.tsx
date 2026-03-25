import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Edit2, Award, Layers, TrendingUp, Calendar, Trash2 } from 'lucide-react';
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
}

interface TargetProps {
  target: {
    id: string;
    title: string;
    description?: string;
    level: 'DEPARTMENT' | 'INDIVIDUAL';
    status: string;
    dueDate?: string;
    progress?: number;
    weight?: number;
    metrics: TargetMetric[];
    assignee?: { fullName: string; avatarUrl?: string };
    department?: { name: string };
    originator?: { fullName: string };
    originatorId: string;
    reviewerId?: string;
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

const TargetCard: React.FC<TargetProps> = ({ target, onUpdateProgress, onReview, onCascade, onEdit, onDelete, isReviewer }) => {
  const [showUpdate, setShowUpdate] = useState(false);
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

  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="nx-card group overflow-hidden border-l-4"
      style={{ borderLeftColor: STATUS_CONFIG[target.status]?.color || 'var(--primary)' }}>
      
      <div className="p-6 space-y-6">
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
            <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">{target.title}</h3>
            <p className="text-xs text-[var(--text-muted)] line-clamp-1">{target.description || 'No description provided'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm font-black text-[var(--text-primary)]">{(target.progress || 0).toFixed(1)}%</div>
            <div className="w-24 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
              <motion.div initial={{ width: 0 }} animate={{ width: `${target.progress || 0}%` }}
                className="h-full bg-[var(--primary)]" />
            </div>
          </div>
        </div>

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

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-primary hover:border-primary/30 transition-all"><Layers size={14} /></button>
            
            {isDepartmentTarget && canReview && onCascade && (
              <button 
                onClick={onCascade}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-all flex items-center gap-2"
              >
                <Plus size={12} /> Cascade
              </button>
            )}

            {isOwner && ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(target.status) && (
              <button onClick={() => setShowUpdate(true)} className="btn-primary py-1.5 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={12} /> Update
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
      </div>

      {showUpdate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-[var(--border-subtle)]/30 space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-4">
            {target.metrics.map(m => (
              <div key={m.id} className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{m.title}</label>
                <div className="flex items-center gap-4">
                  <input type="range" min="0" max={m.targetValue * 1.5} value={updates[m.id]} 
                    onChange={(e) => setUpdates({...updates, [m.id]: parseFloat(e.target.value)})}
                    className="flex-1 h-1.5 bg-[var(--bg-card)] rounded-full appearance-none cursor-pointer accent-[var(--primary)]" />
                  <span className="text-xs font-black text-[var(--text-primary)] min-w-[3rem] text-right">{updates[m.id]}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowUpdate(false)} className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Cancel</button>
            <button onClick={() => {
              const metricUpdates = Object.entries(updates).map(([id, val]) => ({ metricId: id, value: val }));
              onUpdateProgress(metricUpdates, true);
              setShowUpdate(false);
            }} className="px-6 py-2 rounded-xl bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110">Submit</button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TargetCard;
