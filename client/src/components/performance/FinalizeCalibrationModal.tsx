import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Scale, Award, AlertCircle, ChevronRight, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { analyzeContext } from '../../services/InsightEngine';

interface FinalizeCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  packet: any;
  onFinalize: (data: { finalScore: number; finalVerdict: string; arbitrationLogic: string, assignedTargets: any[] }) => void;
  loading: boolean;
}

const FinalizeCalibrationModal: React.FC<FinalizeCalibrationModalProps> = ({ isOpen, onClose, packet, onFinalize, loading }) => {
  const reviews = packet?.reviews || [];
  
  const selfReview = reviews.find((r: any) => r.reviewStage === 'SELF_REVIEW' && r.status === 'SUBMITTED');
  const managerReview = reviews.find((r: any) => r.reviewStage === 'MANAGER_REVIEW' && r.status === 'SUBMITTED');
  
  const selfScore = selfReview ? Number(selfReview.overallRating) : 0;
  const managerScore = managerReview ? Number(managerReview.overallRating) : 0;
  
  // 20/80 Logic
  const suggestedScore = Math.round((selfScore * 0.2) + (managerScore * 0.8));
  
  const [selectedScore, setSelectedScore] = useState<number>(suggestedScore);
  const [verdict, setVerdict] = useState('');
  const [logic, setLogic] = useState('WEIGHTED_AVG');

  // AI Strategic Insights
  const verdictData = analyzeContext('/performance/finalize', packet);
  const [approvedTargetTitles, setApprovedTargetTitles] = useState<string[]>([]);

  const handleToggleTarget = (title: string) => {
    setApprovedTargetTitles(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleApplyLogic = (type: 'SELF' | 'MANAGER' | 'WEIGHTED' | 'CUSTOM') => {
    setLogic(type === 'WEIGHTED' ? 'WEIGHTED_AVG' : type === 'MANAGER' ? 'MANAGER_REC' : 'MD_CALIBRATION');
    if (type === 'SELF') setSelectedScore(selfScore);
    else if (type === 'MANAGER') setSelectedScore(managerScore);
    else if (type === 'WEIGHTED') setSelectedScore(suggestedScore);
  };

  const isDeviationLarge = Math.abs(selectedScore - suggestedScore) > 10;
  const canSubmit = verdict.trim().length >= 10 && (!isDeviationLarge || verdict.length > 20);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-[var(--border-subtle)]/50 flex justify-between items-center bg-[var(--bg-card)] sticky top-0 z-[20]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                <Scale size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Institutional Arbitration</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Final Execution for {packet?.employee?.fullName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
            {/* Score Calibration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => handleApplyLogic('SELF')}
                className={cn(
                  "p-5 rounded-3xl border text-left transition-all",
                  logic === 'MD_CALIBRATION' && selectedScore === selfScore ? "border-primary bg-primary/5 shadow-lg" : "border-[var(--border-subtle)] hover:border-primary/30"
                )}
              >
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Self Assessment</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--text-primary)]">{selfScore}</span>
                  <span className="text-sm font-bold text-[var(--text-muted)]">%</span>
                </div>
              </button>

              <button 
                onClick={() => handleApplyLogic('MANAGER')}
                className={cn(
                  "p-5 rounded-3xl border text-left transition-all",
                  logic === 'MANAGER_REC' ? "border-primary bg-primary/5 shadow-lg" : "border-[var(--border-subtle)] hover:border-primary/30"
                )}
              >
                <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Manager Rec</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--text-primary)]">{managerScore}</span>
                  <span className="text-sm font-bold text-[var(--text-muted)]">%</span>
                </div>
              </button>

              <button 
                onClick={() => handleApplyLogic('WEIGHTED')}
                className={cn(
                  "p-5 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden",
                  logic === 'WEIGHTED_AVG' ? "border-primary bg-primary/5 shadow-xl" : "border-[var(--primary)]/20 hover:border-primary/40 bg-primary/5"
                )}
              >
                <div className="absolute top-0 right-0 p-2 bg-primary text-white text-[8px] font-black uppercase tracking-tighter rounded-bl-xl">Suggested</div>
                <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">Arb. Baseline (20/80)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--primary)]">{suggestedScore}</span>
                  <span className="text-sm font-bold text-[var(--primary)] opacity-60">%</span>
                </div>
              </button>
            </div>

            {/* Institutional Wisdom Section */}
            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-3">
              <div className="flex items-center gap-2 text-[var(--primary)]">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Wisdom Model</span>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] leading-relaxed">
                The <span className="font-bold text-[var(--text-primary)]">20/80 Rule</span> balances participation with oversight: <span className="italic">Self-Reflection (20%)</span> captures the operative's personal perspective, while <span className="italic">Supervisory Oversight (80%)</span> prioritizes direct operational validation. Your role is the final calibration to ensure institutional alignment and meritocratic fairness.
              </p>
            </div>

            {/* Custom Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Final Arbitrated Score</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="0" max="100" 
                    value={selectedScore} 
                    onChange={e => { setSelectedScore(Number(e.target.value)); setLogic('MD_CALIBRATION'); }}
                    className="w-48 accent-primary h-1.5 rounded-full"
                  />
                  <div className="bg-[var(--bg-elevated)] px-4 py-2 rounded-xl border border-[var(--border-subtle)] min-w-[80px] text-center">
                    <span className="text-xl font-black text-[var(--text-primary)]">{selectedScore}%</span>
                  </div>
                </div>
              </div>

              {isDeviationLarge && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-600 font-bold leading-relaxed">
                    Significant deviation detected from the suggested baseline ({suggestedScore}%). Please provide strong justification in your verdict.
                  </p>
                </motion.div>
              )}
            </div>

            {/* AI Suggested Strategic Targets */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1 px-2">
                <Target size={14} className="text-primary" />
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Suggested Growth Targets (Strategic AI)</label>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {verdictData.suggestedTargets?.map((t, idx) => {
                  const isApproved = approvedTargetTitles.includes(t.title);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleToggleTarget(t.title)}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all flex items-start gap-3",
                        isApproved ? "border-primary bg-primary/5 shadow-md" : "border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]"
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isApproved ? "bg-primary border-primary text-white" : "border-[var(--border-subtle)]"
                      )}>
                        {isApproved && <CheckCircle2 size={12} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={cn("text-[11px] font-black uppercase tracking-tight", isApproved ? "text-primary" : "text-[var(--text-primary)]")}>{t.title}</p>
                          <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter",
                            t.priority === 'HIGH' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                          )}>{t.priority} Priority</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed">{t.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {approvedTargetTitles.length > 0 && (
                <p className="text-[9px] text-primary font-bold italic ml-2">Note: Selected targets will be officially assigned to {packet?.employee?.fullName} upon finalization.</p>
              )}
            </div>

            {/* Verdict */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2">Calibration Note & Final Verdict</label>
              <textarea 
                className="nx-input min-h-[120px] text-sm py-4 px-6 rounded-3xl resize-none"
                placeholder="Detail the rationale behind this final score. This will be visible on the institutional record..."
                value={verdict}
                onChange={e => setVerdict(e.target.value)}
              />
            </div>
          </div>

          {/* Global Warning & Action Footer */}
          <div className="p-8 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] sticky bottom-0 z-[20]">
            <div className="p-5 rounded-[2rem] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
                   <Award size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Final Sign-off Authority</p>
                   <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Executing this action will finalize the appraisal for this cycle.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const assignedTargets = verdictData.suggestedTargets?.filter(t => approvedTargetTitles.includes(t.title)) || [];
                  onFinalize({ 
                    finalScore: selectedScore, 
                    finalVerdict: verdict, 
                    arbitrationLogic: logic,
                    assignedTargets
                  });
                }}
                disabled={loading || !canSubmit}
                className={cn(
                  "px-8 py-4 rounded-2xl text-[10px] font-white font-black uppercase tracking-widest shadow-2xl transition-all flex items-center gap-2",
                  canSubmit ? "bg-primary text-white shadow-primary/30 hover:scale-105 active:scale-95" : "bg-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed"
                )}
              >
                {loading ? 'Processing...' : 'Sanction & Finalize'}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FinalizeCalibrationModal;
