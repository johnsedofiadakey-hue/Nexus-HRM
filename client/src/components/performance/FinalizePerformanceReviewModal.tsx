import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ShieldCheck, Scale, Award, 
  Target, AlertTriangle, ChevronRight, 
  CheckCircle, Plus, Trash2, Info,
  Sparkles
} from 'lucide-react';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { useAI } from '../../context/AIContext';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  packet: any;
  onFinalized: () => void;
}

const FinalizePerformanceReviewModal: React.FC<Props> = ({ isOpen, onClose, packet, onFinalized }) => {
  const [suggestion, setSuggestion] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [verdict, setVerdict] = useState('');
  const [loading, setLoading] = useState(false);
  const { setIsOpen: setIsAIOpen, isEnabled: isAIEnabled } = useAI();
  const { theme } = useTheme();

  // Growth targets state
  const [targets, setTargets] = useState<any[]>([]);
  const [newTarget, setNewTarget] = useState({ title: '', description: '', metricTitle: '', metricValue: 5, metricUnit: 'tasks' });
  const [showAddTarget, setShowAddTarget] = useState(false);

  useEffect(() => {
    if (packet?.reviews) {
      const self = packet.reviews.find((r: any) => r.reviewStage === 'SELF_REVIEW' && r.status === 'SUBMITTED');
      const manager = packet.reviews.find((r: any) => r.reviewStage === 'MANAGER_REVIEW' && r.status === 'SUBMITTED');
      
      const selfScore = self?.overallRating || 0;
      const managerScore = manager?.overallRating || 0;
      
      // Suggested score: 20% Self, 80% Manager
      const suggested = Math.round((selfScore * 0.2) + (managerScore * 0.8));
      setSuggestion(suggested);
      setFinalScore(suggested);
    }
  }, [packet]);

  const handleFinalize = async () => {
    if (!verdict || verdict.trim().length < 10) {
      toast.error('Please provide a final comment (at least 10 characters).');
      return;
    }

    setLoading(true);
    try {
      await api.post('/appraisals/final-sign-off', {
        packetId: packet.id,
        finalScore,
        finalVerdict: verdict,
        assignedTargets: targets
      });
      toast.success('Performance review finalized and closed.');
      onFinalized();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to finalize review.');
    } finally {
      setLoading(false);
    }
  };

  const addTarget = () => {
    if (!newTarget.title) return;
    setTargets([...targets, { ...newTarget, id: Date.now() }]);
    setNewTarget({ title: '', description: '', metricTitle: '', metricValue: 5, metricUnit: 'tasks' });
    setShowAddTarget(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto border-[var(--border-subtle)] p-10 relative shadow-2xl rounded-[3rem] bg-[var(--bg-card)]"
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-[var(--bg-elevated)] rounded-full text-[var(--text-muted)] transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[2rem] bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 shadow-2xl shadow-[var(--primary)]/20">
              <ShieldCheck className="text-[var(--primary)]" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight">Final Performance Review</h2>
              <p className="text-xs font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest flex items-center gap-2">
                Closing Session <ChevronRight size={12} /> {packet.employee.fullName}
              </p>
            </div>
          </div>

          {isAIEnabled && (
            <button 
              onClick={() => setIsAIOpen(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles size={16} /> AI Insights
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Scoring Area */}
          <div className="space-y-10">
            <div className="p-8 rounded-[2rem] bg-[var(--primary)]/5 border border-[var(--primary)]/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Target size={80} className="text-[var(--primary)]" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-8 flex items-center gap-2">
                    <Award size={14} /> Scoring Recommendation
                </h4>

                <div className="flex items-end gap-6 mb-10">
                   <div className="flex-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 italic">Suggested Score</p>
                      <div className="text-5xl font-black text-[var(--text-primary)]">{suggestion}%</div>
                   </div>
                   <div className="flex-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] mb-2 italic font-bold">Approved Result</p>
                      <input 
                        type="number" 
                        className="nx-input !text-3xl !font-black !py-2 !px-4 !bg-[var(--bg-input)] !border-[var(--primary)]/30 !text-[var(--text-primary)]"
                        value={finalScore}
                        onChange={(e) => setFinalScore(Number(e.target.value))}
                        max={100}
                        min={0}
                      />
                   </div>
                </div>

                <div className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--text-secondary)]">
                   <Scale size={18} className="shrink-0 text-[var(--primary)]" />
                   <p className="text-xs font-medium leading-relaxed">
                     <span className="font-black text-[var(--primary)] uppercase text-[9px] block mb-1">Standard Calibration Model</span>
                     Institutional recommendation follows the <span className="text-[var(--text-primary)] font-bold">20/80 Allocation Rule</span>: 20% Weighted Self-Review + 80% Manager Professional Assessment.
                   </p>
                </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-4 italic">Final Review Narrative</label>
              <textarea 
                placeholder="Provide the MD's final commentary and justification for the approved result..."
                className="nx-input min-h-[150px] !rounded-[2rem] !p-8 !bg-[var(--bg-input)] !text-[var(--text-primary)] !border-[var(--border-subtle)]"
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
              />
            </div>
          </div>

          {/* Growth & Development Area */}
          <div className="space-y-8">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-3">
                   <Target className="text-[var(--primary)]" size={18} /> Performance Targets
                </h3>
                <button 
                  onClick={() => setShowAddTarget(true)}
                  className="p-2.5 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-all border border-[var(--primary)]/20 shadow-xl shadow-[var(--primary)]/10"
                >
                   <Plus size={18} />
                </button>
             </div>

             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                   {targets.length === 0 ? (
                      <motion.div className="p-10 border-2 border-dashed border-[var(--border-subtle)] rounded-[2rem] text-center">
                         <Target size={32} className="mx-auto text-[var(--text-muted)] mb-4 opacity-30" />
                         <p className="text-xs font-bold text-[var(--text-muted)]">No future growth targets assigned.</p>
                      </motion.div>
                   ) : (
                      targets.map(t => (
                        <motion.div key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-[2rem] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-start justify-between group">
                           <div>
                              <h4 className="font-bold text-[var(--text-primary)] text-sm mb-1">{t.title}</h4>
                              <p className="text-[10px] text-[var(--text-secondary)] font-medium mb-3">{t.description}</p>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                 {t.metricValue} {t.metricUnit}
                              </div>
                           </div>
                           <button onClick={() => setTargets(targets.filter(x => x.id !== t.id))} className="p-2 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error)] transition-all">
                              <Trash2 size={14} />
                           </button>
                        </motion.div>
                      ))
                   )}

                   {showAddTarget && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 border border-[var(--primary)]/30 space-y-4 rounded-[2rem] bg-[var(--primary)]/5 shadow-2xl">
                         <input 
                           placeholder="Goal Title (e.g. Sales Training)"
                           className="nx-input !bg-[var(--bg-card)] !border-[var(--border-subtle)] !text-[var(--text-primary)]"
                           value={newTarget.title}
                           onChange={e => setNewTarget({...newTarget, title: e.target.value})}
                         />
                         <textarea 
                           placeholder="Briefly describe what needs to be achieved..."
                           className="nx-input !bg-[var(--bg-card)] !border-[var(--border-subtle)] !text-[var(--text-primary)] min-h-[80px]"
                           value={newTarget.description}
                           onChange={e => setNewTarget({...newTarget, description: e.target.value})}
                         />
                         <div className="grid grid-cols-2 gap-4">
                            <input 
                               type="number"
                               placeholder="Metric Value"
                               className="nx-input !bg-[var(--bg-card)] !border-[var(--border-subtle)] !text-[var(--text-primary)]"
                               value={newTarget.metricValue}
                               onChange={e => setNewTarget({...newTarget, metricValue: Number(e.target.value)})}
                            />
                            <input 
                               placeholder="Unit (e.g. tasks, %)"
                               className="nx-input !bg-[var(--bg-card)] !border-[var(--border-subtle)] !text-[var(--text-primary)]"
                               value={newTarget.metricUnit}
                               onChange={e => setNewTarget({...newTarget, metricUnit: e.target.value})}
                            />
                         </div>
                         <div className="flex gap-2 pt-2">
                           <button onClick={addTarget} className="flex-1 py-3 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[var(--primary-hover)] transition-all">Add Goal</button>
                           <button onClick={() => setShowAddTarget(false)} className="px-6 py-3 bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[var(--border-subtle)] transition-all">Cancel</button>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>

             <div className="pt-8 flex flex-col items-center">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFinalize}
                  disabled={loading}
                  className="w-full py-6 rounded-[2rem] bg-[var(--primary)] text-white flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-[var(--primary)]/20 transition-all group lg:mt-6"
                >
                  {loading ? <CheckCircle className="animate-pulse" size={18} /> : <ShieldCheck size={18} className="group-hover:rotate-12 transition-transform" />}
                  {loading ? 'Finalizing Review...' : 'Close & Finalize Review'}
                </motion.button>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-6 flex items-center gap-2">
                  <AlertTriangle size={12} className="text-[var(--warning)]/50" /> This action cannot be undone.
                </p>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FinalizePerformanceReviewModal;
