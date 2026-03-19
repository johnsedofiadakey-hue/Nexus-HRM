import { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { Target, Clock, ShieldCheck, Star, Users, Loader2, Save, Search, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import PageHeader from '../components/common/PageHeader';
import FlowSteps from '../components/common/FlowSteps';
import EmptyState from '../components/common/EmptyState';
import GuidedTooltip from '../components/common/GuidedTooltip';

interface TeamAppraisal {
  id: string;
  status: string;
  finalScore: number | null;
  employee: { id: string; fullName: string; position: string; departmentObj?: { name: string } };
  cycle: { name: string; endDate: string };
  ratings: Rating[];
}

interface Rating {
  id: string;
  competency: { id: string; name: string; description: string; weight: number };
  selfScore: number | null;
  managerScore: number | null;
  selfComment: string;
  managerComment?: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  SUBMITTED_BY_STAFF: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  UNDER_MANAGER_REVIEW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const ManagerAppraisals = () => {
  const [appraisals, setAppraisals] = useState<TeamAppraisal[]>([]);
  const [selectedAppraisal, setSelectedAppraisal] = useState<TeamAppraisal | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<{ [key: string]: { score: number; comment: string } }>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTeamAppraisals();
  }, []);

  const fetchTeamAppraisals = async () => {
    try {
      const res = await api.get('/appraisals/team');
      setAppraisals(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      setAppraisals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAppraisal = (appraisal: TeamAppraisal) => {
    setSelectedAppraisal(appraisal);
    const initialRatings: Record<string, { score: number; comment: string }> = {};
    (appraisal?.ratings || []).forEach((r: Rating) => {
      const compId = r?.competency?.id;
      if (compId) {
        initialRatings[compId] = {
          score: r.managerScore || 0,
          comment: r.managerComment || ''
        };
      }
    });
    setRatings(initialRatings);
  };

  const handleRatingChange = (competencyId: string, field: 'score' | 'comment', value: string | number) => {
    setRatings(prev => ({
      ...prev,
      [competencyId]: { ...prev[competencyId], [field]: value }
    }));
  };

  const handleSubmitReview = async () => {
    if (!selectedAppraisal) return;
    setSaving(true);
    const payload = {
      appraisalId: selectedAppraisal.id,
      ratings: Object.keys(ratings).map(k => ({
        competencyId: k,
        score: Number(ratings[k].score),
        comment: ratings[k].comment
      }))
    };

    try {
      await api.post('/appraisals/manager-rating', payload);
      toast.info("Evaluation Calibrated Successfully!");
      setSelectedAppraisal(null);
      fetchTeamAppraisals();
    } catch (error: any) {
      toast.info(String(error?.response?.data?.error || 'Validation error during submission'));
    } finally {
      setSaving(false);
    }
  };

  const filtered = appraisals.filter(a => a.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 size={32} className="animate-spin text-[var(--growth-light)]" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Calibrating evaluation roster...</p>
    </div>
  );

  return (
    <div className="space-y-10 page-enter min-h-screen pb-20">
      <PageHeader 
        title="Team Appraisal Reviews"
        description="Review and calibrate self-evaluations submitted by your team members. Your objective feedback ensures strategic alignment."
        icon={Users}
        variant="purple"
      />

      <FlowSteps 
        currentStep={2}
        variant="purple"
        steps={[
          { id: 1, label: 'Self Review', description: 'Internal Calibration' },
          { id: 2, label: 'Manager Review', description: 'HQ Alignment' },
          { id: 3, label: 'Calibration Complete', description: 'Final Result' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Unit Roster */}
        <div className="lg:col-span-4 space-y-6">
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[var(--growth-light)] transition-colors" size={18} />
                <input 
                    placeholder="Search Personnel Vector..." 
                    className="nx-input !pl-14 !bg-white/[0.02] !border-white/5 focus:!border-[var(--growth)]/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-3">
               {filtered.length === 0 ? (
                  <EmptyState 
                    title="No Evaluations Found"
                    description="No pending evaluation vectors detected for your team at this time."
                    icon={ShieldCheck}
                    variant="slate"
                    className="p-10"
                  />
               ) : (
                  filtered.map((appraisal) => (
                    <motion.div
                      whileHover={{ x: 5 }}
                      key={appraisal.id}
                      onClick={() => handleSelectAppraisal(appraisal)}
                      className={cn(
                        "p-6 rounded-[1.8rem] cursor-pointer transition-all duration-300 border relative overflow-hidden group/card",
                        selectedAppraisal?.id === appraisal.id
                          ? "bg-[var(--growth)]/10 border-[var(--growth)]/30 shadow-2xl shadow-[var(--growth)]/10"
                          : "glass border-white/5 hover:border-white/10"
                      )}
                    >
                      {selectedAppraisal?.id === appraisal.id && (
                        <motion.div layoutId="active-appraisal" className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--growth)]" />
                      )}
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black text-white border border-white/5">
                              {appraisal.employee.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                           </div>
                           <div>
                             <p className="font-bold text-sm text-white">{appraisal.employee.fullName}</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{appraisal.employee.position}</p>
                           </div>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                          statusColors[appraisal.status] || 'bg-white/5 text-slate-400 border-white/10'
                        )}>
                          {appraisal.status === 'SUBMITTED_BY_STAFF' ? 'AWAITING REVIEW' : appraisal.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.03]">
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                            <Clock size={12} className="text-[var(--growth-light)]" />
                            {appraisal.cycle.name}
                         </span>
                         <ChevronRight size={14} className="text-slate-700 group-hover/card:text-[var(--growth-light)] group-hover/card:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))
               )}
            </div>
        </div>

        {/* Right Column: Execution Area */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
              {!selectedAppraisal ? (
                  <div className="col-span-full">
                    <EmptyState 
                        title="Selection Required"
                        description="Identify a mission vector from the roster to begin evaluation calibration."
                        icon={Target}
                        variant="purple"
                        className="h-[60vh]"
                    />
                  </div>
               ) : (
                <motion.div
                  key={selectedAppraisal.id}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="glass p-10 md:p-12 border-white/[0.05] relative bg-[#0d0f1a]/60 backdrop-blur-3xl"
                >
                  <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                     <Users size={160} className="text-[var(--growth)]" />
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 justify-between relative z-10 w-full mb-12 border-b border-white/[0.05] pb-10">
                    <div>
                      <h2 className="text-4xl font-black text-white font-display tracking-tight uppercase leading-none">{selectedAppraisal.employee.fullName}</h2>
                      <div className="flex items-center gap-4 mt-6">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 border border-white/10 bg-white/5 px-4 py-2 rounded-2xl">
                           {selectedAppraisal.employee.position}
                         </span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-[var(--growth-light)] flex items-center gap-2 border border-[var(--growth)]/20 bg-[var(--growth)]/5 px-4 py-2 rounded-2xl">
                           <Clock size={12} />
                           {selectedAppraisal.cycle.name}
                         </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8 relative z-10">
                     {selectedAppraisal.ratings.map((rating, idx) => {
                        const compId = rating.competency.id || '';
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={rating.id || idx} 
                            className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.03] space-y-8 hover:bg-white/[0.03] transition-all group/rating"
                          >
                             <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/[0.05] pb-8">
                                <div className="flex-1">
                                   <h4 className="text-2xl font-black text-white font-display tracking-tight mb-2 uppercase group-hover/rating:text-[var(--growth-light)] transition-colors">{rating.competency.name}</h4>
                                   <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-2xl">{rating.competency.description}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Weight Vector</p>
                                   <p className="text-lg font-black text-white">Weight: {rating.competency.weight}</p>
                                </div>
                             </div>

                             <div className="grid md:grid-cols-2 gap-10">
                                {/* Employee Feedback */}
                                <div className="space-y-6">
                                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                                      <Users size={14} />
                                      Self-Evaluation Data
                                      <GuidedTooltip text="The score and comments provided by the employee during their self-review phase." />
                                   </label>
                                   <div className="p-6 rounded-3xl bg-cyan-500/5 border border-cyan-500/10 space-y-4">
                                      <div className="flex items-end gap-2">
                                         <span className="text-4xl font-black text-white font-display leading-none">{rating.selfScore ?? 0}</span>
                                         <span className="text-sm font-bold text-slate-500 mb-1">/ 5.0</span>
                                      </div>
                                      <p className="text-xs font-medium text-slate-300 leading-relaxed italic border-l-2 border-cyan-500/30 pl-4 py-1">
                                         "{rating.selfComment || 'No self-evaluation provided'}"
                                      </p>
                                   </div>
                                </div>

                                {/* Calibration Input */}
                                <div className="space-y-6">
                                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--growth-light)] flex items-center gap-2">
                                      <ShieldCheck size={14} />
                                      Reviewer Calibration
                                      <GuidedTooltip text="Provide your objective assessment and feedback. This will be the final score for this competency." />
                                   </label>

                                   {selectedAppraisal.status === 'COMPLETED' ? (
                                      <div className="p-6 rounded-3xl bg-[var(--growth)]/5 border border-[var(--growth)]/10 space-y-4">
                                         <div className="flex items-end gap-2">
                                            <span className="text-4xl font-black text-[var(--growth-light)] font-display leading-none">{rating.managerScore ?? 0}</span>
                                            <span className="text-sm font-bold text-slate-500 mb-1">/ 5.0</span>
                                         </div>
                                         <p className="text-xs font-medium text-slate-400 leading-relaxed italic border-l-2 border-[var(--growth)]/30 pl-4 py-1">
                                            "{rating.managerComment || 'No comments provided'}"
                                         </p>
                                      </div>
                                   ) : (
                                      <div className="space-y-5">
                                         <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(star => (
                                               <button
                                                  key={star}
                                                  onClick={() => handleRatingChange(compId, 'score', star)}
                                                  className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                                                    (ratings[compId]?.score ?? 0) >= star
                                                      ? "bg-[var(--growth)] border-[var(--growth)] text-white shadow-2xl shadow-[var(--growth)]/30"
                                                      : "bg-white/[0.02] border-white/10 text-slate-600 hover:border-slate-500 hover:text-slate-400"
                                                  )}
                                               >
                                                  <Star size={18} className={(ratings[compId]?.score ?? 0) >= star ? "fill-current" : ""} />
                                               </button>
                                            ))}
                                         </div>
                                         <textarea
                                            value={ratings[compId]?.comment ?? ''}
                                            onChange={e => handleRatingChange(compId, 'comment', e.target.value)}
                                            placeholder="Provide technical calibration feedback..."
                                            className="nx-input min-h-[120px] resize-none !text-xs !bg-white/[0.01] focus:!bg-white/[0.03]"
                                         />
                                      </div>
                                   )}
                                </div>
                             </div>
                          </motion.div>
                        );
                     })}
                  </div>

                  {selectedAppraisal.status !== 'COMPLETED' && selectedAppraisal.status !== 'DRAFT' && (
                    <div className="mt-12 pt-10 border-t border-white/[0.05] flex flex-col sm:flex-row sm:justify-end gap-5">
                      <button
                        onClick={() => setSelectedAppraisal(null)}
                        className="px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                      >
                        Cancel Calibration
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSubmitReview}
                        disabled={saving}
                        className="px-10 py-5 rounded-2xl bg-[var(--growth)] text-white flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-[var(--growth)]/40 group"
                      >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
                        {saving ? 'Processing Vector...' : 'Finalize & Deploy Calibration'}
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ManagerAppraisals;
