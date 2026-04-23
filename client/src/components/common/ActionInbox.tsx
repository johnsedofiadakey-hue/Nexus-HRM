import React, { useState, useEffect } from 'react';
import { 
  Inbox, X, Target, Briefcase, Calendar, 
  ChevronRight, AlertCircle, Clock, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useNavigate, useLocation } from 'react-router-dom';

interface ActionItem {
  id: string;
  type: 'TARGET_ACK' | 'TARGET_REVIEW' | 'APPRAISAL_REVIEW' | 'LEAVE_RELIEF' | 'LEAVE_APPROVE';
  title: string;
  subtitle: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link: string;
  data?: { startDate?: string; endDate?: string; reason?: string };
  createdAt: string;
}

interface ActionInboxProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCountUpdate?: (count: number) => void;
  isInline?: boolean;
}

const ActionInbox: React.FC<ActionInboxProps> = ({ isOpen, onClose, onCountUpdate, isInline }) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inbox');
      const data = Array.isArray(res.data) ? res.data : [];
      setActions(data);
      if (onCountUpdate) onCountUpdate(data.length);
    } catch (err) {
      console.error('Failed to fetch inbox actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInline || isOpen) {
      fetchActions();
    }
  }, [isOpen, isInline]);

  useEffect(() => {
    const interval = setInterval(fetchActions, 60000); // 1 min poll
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'TARGET_ACK': return Target;
      case 'APPRAISAL_REVIEW': return Briefcase;
      case 'LEAVE_RELIEF': return Calendar;
      case 'LEAVE_APPROVE': return Calendar;
      default: return AlertCircle;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'MEDIUM': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const renderContent = () => (
    <div className={cn("flex flex-col h-full", isInline ? "" : "bg-[var(--bg-card)]")}>
      {!isInline && (
        <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/30">
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight uppercase">Action Inbox</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1 opacity-60">Pending Tasks & Decisions</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-500 transition-all"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto custom-scrollbar space-y-4", isInline ? "" : "p-6")}>
        {loading && actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40 italic">
            <div className="w-10 h-10 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin mb-4" />
            <p className="text-[10px] uppercase font-black tracking-widest">Compiling Actions...</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
            <div className="w-20 h-20 rounded-[2.5rem] bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
              <Inbox size={32} />
            </div>
            <div>
              <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Clear Inbox</p>
              <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">All protocols synchronized</p>
            </div>
          </div>
        ) : (
          actions.map((action) => {
            const Icon = getIcon(action.type);
            return (
              <motion.button
                key={action.id}
                onClick={() => {
                  if (location.pathname === action.link) {
                      if (onClose) onClose();
                      window.dispatchEvent(new CustomEvent('nexus-action-refresh', { detail: { type: action.type, id: action.id } }));
                  } else {
                      navigate(action.link);
                      if (onClose) onClose();
                  }
                }}
                className="w-full text-left nx-card p-5 group transition-all relative overflow-hidden bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] hover:shadow-xl hover:shadow-[var(--primary)]/5 border-transparent hover:border-[var(--primary)]/20 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 border border-[var(--primary)]/20 group-hover:scale-110 transition-transform">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border", getPriorityColor(action.priority))}>
                        {action.priority}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 flex items-center gap-1">
                        <Clock size={10} /> {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h4 className="text-[14px] font-black tracking-tight text-[var(--text-primary)] mt-2 uppercase">
                      {action.title}
                    </h4>
                    <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-1 uppercase tracking-widest opacity-80">
                      {action.subtitle}
                    </p>

                    {action.data?.startDate && action.data?.endDate && (
                      <div className="mt-4 flex flex-col gap-2 p-3 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)]">
                        <div className="px-2 py-0.5 rounded-md bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-widest w-fit shadow-lg shadow-[var(--primary)]/20">
                          {format(new Date(action.data.startDate), 'MMM dd')} - {format(new Date(action.data.endDate), 'MMM dd')}
                        </div>
                        {action.data?.reason && (
                          <p className="text-[9px] font-medium text-[var(--text-muted)] italic leading-relaxed line-clamp-2">
                            "{action.data.reason}"
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      Execute Action <ChevronRight size={10} />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
      
      {!isInline && (
        <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
                 <AlertCircle size={16} />
              </div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] leading-tight"> Actions require immediate attention to maintain organizational velocity.</p>
            </div>
            <button 
              onClick={() => { navigate('/notifications'); if (onClose) onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all border border-[var(--primary)]/20"
            >
              View All Actions <ArrowRight size={10} />
            </button>
         </div>
      )}
    </div>
  );

  if (isInline) return renderContent();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose} 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md h-full bg-[var(--bg-card)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col"
          >
            {renderContent()}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ActionInbox;
