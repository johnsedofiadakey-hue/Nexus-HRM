import { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { Target, Clock, ShieldCheck, Award, Star, Loader2, Send, Lock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import PageHeader from '../components/common/PageHeader';
import FlowSteps from '../components/common/FlowSteps';
import EmptyState from '../components/common/EmptyState';
import GuidedTooltip from '../components/common/GuidedTooltip';

interface Appraisal {
  id: string;
  status: string;
  finalScore: number | null;
  reviewer: { fullName: string };
  cycle: { name: string; endDate: string };
  ratings: Rating[];
}

interface Rating {
  id: string;
  competency: { id: string; name: string; description: string };
  selfScore: number | null;
  managerScore: number | null;
  selfComment: string;
  managerComment?: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  STAFF_SUBMITTED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  MANAGER_REVIEW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  FINAL_VERDICT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft (Awaiting Self-Rating)',
  STAFF_SUBMITTED: 'Submitted (Awaiting Manager)',
  MANAGER_REVIEW: 'Manager Reviewing',
  FINAL_VERDICT: 'Awaiting MD Verdict',
  COMPLETED: 'Appraisal Completed',
};

const Appraisals = () => {
  const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<{ [key: string]: { score: number; comment: string } }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMyAppraisal();
  }, []);

  const fetchMyAppraisal = async () => {
    try {
      const res = await api.get('/appraisals/my-latest');
      if (!res.data) {
        setAppraisal(null);
        return;
      }
      setAppraisal(res.data);
      const initialRatings: { [key: string]: { score: number; comment: string } } = {};
      (res.data.ratings || []).forEach((rating: Rating) => {
        const compId = rating?.competency?.id;
        if (compId) {
          initialRatings[compId] = { score: rating.selfScore || 0, comment: rating.selfComment || '' };
        }
      });
      setRatings(initialRatings);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (competencyId: string, field: 'score' | 'comment', value: string | number) => {
    setRatings(prev => ({
      ...prev,
      [competencyId]: { ...prev[competencyId], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    if (!appraisal) return;
    setSaving(true);
    const payload = {
      appraisalId: appraisal.id,
      ratings: Object.keys(ratings).map(key => ({
        competencyId: key,
        score: Number(ratings[key].score),
        comment: ratings[key].comment
      }))
    };

    try {
      await api.post('/appraisals/self-rating', payload);
      toast.info("Evaluation Submitted Successfully!");
      fetchMyAppraisal();
    } catch (error: any) {
      toast.info(String(error?.response?.data?.error || 'Validation error during submission'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 size={32} className="animate-spin text-[var(--growth-light)]" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Syncing evaluation telemetry...</p>
    </div>
  );

  if (!appraisal) {
    return (
      <div className="space-y-10 page-enter min-h-screen pb-20">
        <PageHeader 
          title="Performance Growth Matrix"
          description="Your personal growth journey. When an appraisal cycle is initiated by management, you will be able to perform your self-evaluation here."
          icon={Award}
          variant="purple"
        />
        <EmptyState 
          title="No Active Appraisal Cycle"
          description="The system is currently not in an active evaluation window. You will be notified when the next calibration cycle begins."
          icon={Target}
          variant="purple"
        />
      </div>
    );
  }

  const isLocked = appraisal.status !== 'DRAFT';

  return (
    <div className="space-y-10 page-enter min-h-screen pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <PageHeader 
          title="Performance Self-Review"
          description={`Active Calibration: ${(appraisal?.cycle?.name || 'ANNUAL CYCLE').toUpperCase()}. Complete your self-evaluation to initiate the review process.`}
          icon={Award}
          variant="purple"
          className="flex-1"
        />

        <div className="flex items-center gap-4">
           {appraisal.status === 'COMPLETED' && appraisal.finalScore !== null && (
             <div className="glass p-6 border-[var(--growth)]/20 shadow-2xl shadow-[var(--growth)]/10 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--growth-light)] mb-2">Aggregate Rating</p>
                <div className="text-4xl font-black text-white font-display tracking-tighter">
                   {appraisal.finalScore}<span className="text-xl text-slate-600">%</span>
                </div>
             </div>
           )}
        </div>
      </div>

      <FlowSteps 
        currentStep={1}
        variant="purple"
        steps={[
          { id: 1, label: 'Self Review', description: 'Internal Calibration' },
          { id: 2, label: 'Manager Review', description: 'HQ Alignment' },
          { id: 3, label: 'Calibration Complete', description: 'Final Result' },
        ]}
      />

      <AnimatePresence>
        {appraisal.status === 'STAFF_SUBMITTED' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-8 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 flex flex-col items-center text-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Send size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Submission Successful</h3>
              <p className="text-xs font-medium text-blue-400/80 mt-1 uppercase tracking-widest leading-relaxed">Your appraisal has been submitted and is awaiting manager review.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Context Area */}
        <div className="lg:col-span-1 space-y-6">
           <div className="glass p-8 border-white/[0.05] relative overflow-hidden bg-[#0a0c1a]/60">
              <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                 <ShieldCheck size={120} className="text-[var(--growth)]" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[var(--growth-light)] mb-6">Review Parameters</h3>
              
              <div className="space-y-6 relative z-10">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Reviewer Authority</p>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                       <ShieldCheck size={16} className="text-emerald-400" />
                       {appraisal?.reviewer?.fullName || 'Unassigned HQ Reviewer'}
                    </p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Current Status</p>
                    <span className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border block text-center",
                      statusColors[appraisal?.status || ''] || 'bg-white/5 text-slate-400 border-white/10'
                    )}>
                      {statusLabels[appraisal.status] || appraisal.status}
                    </span>
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Deadline Vector</p>
                    <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-4 py-2 rounded-xl flex items-center justify-center gap-2">
                       <Clock size={12} />
                       {appraisal?.cycle?.endDate ? new Date(appraisal.cycle.endDate).toLocaleDateString() : 'N/A'}
                    </span>
                 </div>
              </div>
           </div>

           <div className="p-6 rounded-2xl bg-[var(--growth)]/5 border border-[var(--growth)]/10">
              <div className="flex items-center gap-2 mb-3 text-[var(--growth-light)]">
                 <AlertCircle size={14} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Growth Note</span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-wider">
                 Your self-evaluation is the first vector in our objective calibration. Be detailed and evidence-based.
              </p>
           </div>
        </div>

        {/* Right Column: Execution Area (Competencies) */}
        <div className="lg:col-span-2 space-y-6">
           {appraisal.ratings.map((rating, idx) => {
              const compId = rating?.competency?.id || '';
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  key={rating.id || idx} 
                  className="glass p-8 md:p-10 border-white/[0.05] hover:border-[var(--growth)]/20 transition-all bg-[#0d1020]/40 backdrop-blur-3xl"
                >
                   <div className="border-b border-white/[0.05] pb-8 mb-8">
                      <h4 className="text-2xl font-black text-white font-display tracking-tight mb-3 uppercase">{rating?.competency?.name}</h4>
                      <p className="text-sm font-medium text-slate-400 leading-relaxed max-w-2xl">{rating?.competency?.description}</p>
                   </div>

                   <div className="grid md:grid-cols-2 gap-10">
                      {/* Self-Rating Section */}
                      <div className="space-y-6">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--growth-light)] flex items-center gap-2">
                            <Star size={14} className="fill-current" />
                            Self-Calibration
                            <GuidedTooltip text="Rate your own performance on this competency from 1 (Low) to 5 (Exceptional)." />
                         </label>

                         {isLocked ? (
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                               <div className="flex items-end gap-2">
                                  <span className="text-4xl font-black text-white font-display">{rating.selfScore || 0}</span>
                                  <span className="text-sm font-bold text-slate-500 mb-1">/ 5.0</span>
                               </div>
                               <p className="text-xs font-medium text-slate-400 leading-relaxed italic border-l-2 border-[var(--growth)]/40 pl-4">
                                  "{rating.selfComment || 'No feedback provided'}"
                               </p>
                            </div>
                         ) : (
                            <div className="space-y-4">
                               <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map(star => (
                                     <button
                                        key={star}
                                        onClick={() => handleRatingChange(compId, 'score', star)}
                                        className={cn(
                                          "w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
                                          (ratings[compId]?.score ?? 0) >= star
                                            ? "bg-[var(--growth)] border-[var(--growth)] text-white shadow-2xl shadow-[var(--growth)]/30"
                                            : "bg-white/[0.03] border-white/5 text-slate-600 hover:border-slate-400"
                                        )}
                                     >
                                        <Star size={18} className={(ratings[compId]?.score ?? 0) >= star ? "fill-current" : ""} />
                                     </button>
                                  ))}
                               </div>
                               <textarea
                                  value={ratings[compId]?.comment ?? ''}
                                  onChange={e => handleRatingChange(compId, 'comment', e.target.value)}
                                  placeholder="Input mission evidence..."
                                  className="nx-input min-h-[140px] resize-none border-white/5 focus:ring-[var(--growth)]/20"
                               />
                            </div>
                         )}
                      </div>

                      {/* Manager-Rating Section (Always Read Only for Staff) */}
                      <div className="space-y-6">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                            <ShieldCheck size={14} />
                            HQ Calibration
                            <GuidedTooltip text="The rating and feedback provided by your manager or the reviewer after their assessment." />
                         </label>

                         {rating.managerScore !== null ? (
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                               <div className="flex items-end gap-2">
                                  <span className="text-4xl font-black text-white font-display">{rating.managerScore}</span>
                                  <span className="text-sm font-bold text-slate-500 mb-1">/ 5.0</span>
                               </div>
                               <p className="text-xs font-medium text-slate-400 leading-relaxed italic border-l-2 border-emerald-500/40 pl-4">
                                  "{rating.managerComment || 'No feedback provided'}"
                               </p>
                            </div>
                         ) : (
                            <div className="h-full flex flex-col items-center justify-center p-10 rounded-2xl border border-dashed border-white/5 bg-white/[0.01] opacity-30 grayscale">
                               <Lock size={24} className="mb-4" />
                               <p className="text-[10px] font-black uppercase tracking-widest text-center">Awaiting Manager<br />Vector Analysis</p>
                            </div>
                         )}
                      </div>
                   </div>
                </motion.div>
              );
           })}

           {!isLocked && (
             <div className="flex justify-end pt-10">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-10 py-5 rounded-3xl bg-[var(--growth)] text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-[var(--growth)]/30 flex items-center gap-4 group"
                >
                   {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                   {saving ? 'Syncing...' : 'Submit Evaluation Vector'}
                </motion.button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Appraisals;
