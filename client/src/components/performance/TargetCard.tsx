import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle, Clock, AlertCircle, MessageSquare, ChevronRight, User, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';

interface TargetMetric {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  metricType: 'NUMERICAL' | 'PERCENTAGE' | 'BOOLEAN';
}

interface TargetProps {
  target: {
    id: string;
    title: string;
    description?: string;
    level: 'DEPARTMENT' | 'INDIVIDUAL';
    status: string;
    dueDate?: string;
    metrics: TargetMetric[];
    assignee?: { fullName: string; avatarUrl?: string };
    originator?: { fullName: string };
  };
  onAcknowledge: (status: 'ACKNOWLEDGED' | 'CLARIFICATION_REQUESTED', message?: string) => void;
  onUpdateProgress: (updates: { metricId: string; value: number; comment?: string }[], submit: boolean) => void;
  onReview: (approved: boolean, feedback?: string) => void;
  isReviewer?: boolean;
}

const TargetCard: React.FC<TargetProps> = ({ target, onAcknowledge, onUpdateProgress, onReview, isReviewer }) => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updates, setUpdates] = useState<Record<string, number>>(
    target.metrics.reduce((acc, m) => ({ ...acc, [m.id]: m.currentValue }), {})
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'UNDER_REVIEW': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ACKNOWLEDGED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'CLARIFICATION_REQUESTED': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 rounded-[2rem] border-white/5 bg-slate-900/40 hover:border-primary/30 transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border",
            target.level === 'DEPARTMENT' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          )}>
            {target.level === 'DEPARTMENT' ? <Users size={20} /> : <Target size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border", getStatusColor(target.status))}>
                {target.status.replace(/_/g, ' ')}
              </span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {target.level}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1">{target.title}</h3>
          </div>
        </div>
        {target.dueDate && (
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Due Date</p>
            <p className="text-[10px] font-bold text-white mt-0.5">{format(new Date(target.dueDate), 'MMM dd, yyyy')}</p>
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {target.metrics.map(metric => {
          const progress = (metric.currentValue / (metric.targetValue || 1)) * 100;
          return (
            <div key={metric.id} className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-400 uppercase tracking-wider">{metric.title}</span>
                <span className="text-white">
                  {metric.currentValue} / {metric.targetValue} {metric.unit}
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  className={cn(
                    "h-full rounded-full transition-all",
                    progress >= 100 ? "bg-emerald-500" : "bg-primary"
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-white/5">
        {target.assignee && (
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
               <User size={12} className="text-slate-400" />
             </div>
             <span className="text-[10px] font-bold text-slate-400">{target.assignee.fullName}</span>
          </div>
        )}

        <div className="ml-auto flex gap-2">
          {target.status === 'ASSIGNED' && (
            <>
              <button 
                onClick={() => onAcknowledge('ACKNOWLEDGED')}
                className="px-4 py-2 rounded-xl bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-primary-light transition-all"
              >
                Acknowledge
              </button>
              <button 
                onClick={() => {
                  const msg = window.prompt("Enter clarification request message:");
                  if (msg) onAcknowledge('CLARIFICATION_REQUESTED', msg);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/10"
              >
                Clarify
              </button>
            </>
          )}

          {(target.status === 'ACKNOWLEDGED' || target.status === 'IN_PROGRESS') && !showUpdate && (
            <button 
              onClick={() => setShowUpdate(true)}
              className="px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary-light text-[9px] font-black uppercase tracking-widest hover:bg-primary/30"
            >
              Update Progress
            </button>
          )}

          {target.status === 'UNDER_REVIEW' && isReviewer && (
            <div className="flex gap-2">
              <button 
                onClick={() => onReview(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/30"
              >
                Approve
              </button>
              <button 
                onClick={() => {
                  const fb = window.prompt("Feedback for return:");
                  if (fb) onReview(false, fb);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/30"
              >
                Return
              </button>
            </div>
          )}
        </div>
      </div>

      {showUpdate && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 pt-6 border-t border-white/5 space-y-4"
        >
          {target.metrics.map(m => (
            <div key={m.id} className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.title}</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" 
                  max={m.targetValue * 1.5} 
                  value={updates[m.id]} 
                  onChange={(e) => setUpdates({...updates, [m.id]: parseFloat(e.target.value)})}
                  className="flex-1 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs font-black text-white min-w-[3rem] text-right">{updates[m.id]}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setShowUpdate(false)}
              className="text-[9px] font-black text-slate-500 uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const metricUpdates = Object.entries(updates).map(([id, val]) => ({ metricId: id, value: val }));
                onUpdateProgress(metricUpdates, true);
                setShowUpdate(false);
              }}
              className="px-6 py-2 rounded-xl bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-primary-light"
            >
              Submit for Review
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TargetCard;
