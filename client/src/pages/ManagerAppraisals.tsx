import React, { useEffect, useState } from 'react';
import { Target, Clock, CheckCircle, ShieldCheck, Award, MessageSquare, Save, Send, Lock, Loader2, Star, TrendingUp, Users } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

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
  PENDING_SELF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  PENDING_MANAGER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const ManagerAppraisals = () => {
  const [appraisals, setAppraisals] = useState<TeamAppraisal[]>([]);
  const [selectedAppraisal, setSelectedAppraisal] = useState<TeamAppraisal | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<{ [key: string]: { score: number; comment: string } }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeamAppraisals();
  }, []);

  const fetchTeamAppraisals = async () => {
    try {
      const res = await api.get('/appraisals/team');
      setAppraisals(res.data || []);
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
    appraisal.ratings.forEach((r: Rating) => {
      initialRatings[r.competency.id] = {
        score: r.managerScore || 0,
        comment: r.managerComment || ''
      };
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
      setSelectedAppraisal(null);
      fetchTeamAppraisals();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Validation error during submission');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 size={32} className="animate-spin text-primary-light" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading appraisals...</p>
    </div>
  );

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Manager Appraisals</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <Users size={14} className="text-primary-light" />
            Review and approve your team's appraisals
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Unit Roster */}
        <div className="lg:col-span-4 space-y-4">
           {appraisals.length === 0 ? (
             <div className="glass p-12 text-center rounded-[2rem] border-white/[0.05]">
                <ShieldCheck size={32} className="mx-auto mb-3 opacity-10 text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No Pending Appraisals</p>
             </div>
           ) : (
             appraisals.map((appraisal) => (
               <motion.div
                 key={appraisal.id}
                 whileHover={{ x: 5 }}
                 onClick={() => handleSelectAppraisal(appraisal)}
                 className={cn(
                   "p-6 rounded-[1.5rem] cursor-pointer transition-all border relative overflow-hidden",
                   selectedAppraisal?.id === appraisal.id
                     ? "bg-primary/5 border-primary/30 shadow-2xl shadow-primary/10"
                     : "glass border-white/[0.05] hover:border-white/10"
                 )}
               >
                 {selectedAppraisal?.id === appraisal.id && (
                   <motion.div layoutId="run-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                 )}
                 <div className="flex items-start justify-between mb-3">
                    <div>
                       <p className="font-bold text-sm text-white transition-colors">{appraisal.employee.fullName}</p>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{appraisal.employee.position}</p>
                    </div>
                    <span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border", statusColors[appraisal.status] || 'bg-white/5 text-slate-400 border-white/10')}>
                       {appraisal.status === 'PENDING_MANAGER' ? 'AWAITING YOU' : appraisal.status.replace('_', ' ')}
                    </span>
                 </div>
                 <div className="flex items-center text-[9px] font-bold uppercase tracking-widest text-slate-600 gap-2">
                    <Clock size={10} className="text-primary-light" />
                    Cycle: {appraisal.cycle.name}
                 </div>
               </motion.div>
             ))
           )}
        </div>

        {/* Validation Orchestrator */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
             {!selectedAppraisal ? (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="glass h-full min-h-[500px] flex flex-col items-center justify-center p-20 text-center border-white/[0.05]"
               >
                 <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center mb-6">
                    <Target size={40} className="text-slate-800" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-400 mb-2 font-display uppercase tracking-tight">Select an Appraisal</h3>
                 <p className="text-[10px] text-slate-600 max-w-xs leading-relaxed uppercase tracking-widest font-black">Select an employee from the list to review and approve their appraisal.</p>
               </motion.div>
             ) : (
               <motion.div 
                 key={selectedAppraisal.id}
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="glass overflow-hidden border-white/[0.05] p-8 md:p-10 relative bg-[#0a0f1e]/40"
               >
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Award size={120} className="text-white" />
                 </div>
                 
                 <div className="flex flex-col md:flex-row gap-8 justify-between relative z-10 w-full mb-8 pt-2">
                    <div className="space-y-4">
                       <h2 className="text-3xl font-black text-white font-display uppercase tracking-tight">{selectedAppraisal.employee.fullName}</h2>
                       <div className="flex flex-wrap items-center gap-4">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 border border-white/10 bg-white/5 px-3 py-1.5 rounded-xl">
                            {selectedAppraisal.employee.position}
                         </span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border border-white/5 bg-white/[0.02] px-3 py-1.5 rounded-xl">
                            <Clock size={12} className="text-primary-light" />
                            Cycle: {selectedAppraisal.cycle.name}
                         </span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="space-y-6 pt-4 border-t border-white/[0.05]">
                    {selectedAppraisal.ratings.map((rating, idx) => (
                      <motion.div 
                        key={rating.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 md:p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.03] space-y-6 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="border-b border-white/[0.05] pb-6 mb-2 flex items-start justify-between gap-4">
                           <div>
                              <h4 className="text-lg font-black text-white font-display tracking-tight mb-2">{rating.competency.name}</h4>
                              <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-2xl">{rating.competency.description}</p>
                           </div>
                           <span className="px-3 py-1.5 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                              Weight: {rating.competency.weight}x
                           </span>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8">
                           {/* Self Rating (Read Only) */}
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                                 <Target size={12} />
                                 Employee Self-Evaluation
                              </label>
                              
                              <div className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 h-full">
                                 <div className="flex items-end gap-2 mb-3">
                                    <span className="text-3xl font-black text-white font-display leading-none">{rating.selfScore ?? 0}</span>
                                    <span className="text-sm font-bold text-slate-500 mb-1">/ 5</span>
                                 </div>
                                 <p className="text-slate-400 text-xs leading-relaxed italic border-l-2 border-cyan-500/30 pl-3 py-1">
                                   "{rating.selfComment || 'No self-evaluation provided'}"
                                 </p>
                              </div>
                           </div>
                           
                           {/* Manager Rating */}
                           <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                                 <ShieldCheck size={12} />
                                 Manager Rating
                              </label>
                              
                              {selectedAppraisal.status === 'COMPLETED' ? (
                                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 h-full">
                                   <div className="flex items-end gap-2 mb-3">
                                      <span className="text-3xl font-black text-emerald-400 font-display leading-none">{rating.managerScore}</span>
                                      <span className="text-sm font-bold text-slate-500 mb-1">/ 5</span>
                                   </div>
                                   <p className="text-slate-400 text-xs leading-relaxed italic border-l-2 border-emerald-500/30 pl-3 py-1">
                                     "{rating.managerComment || 'No comments provided'}"
                                   </p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                   <div className="flex gap-2">
                                      {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                          key={star}
                                          onClick={() => handleRatingChange(rating.competency.id, 'score', star)}
                                          className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
                                            ratings[rating.competency.id]?.score >= star 
                                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                              : "bg-white/[0.02] border-white/10 text-slate-600 hover:border-slate-500 hover:text-slate-400"
                                          )}
                                        >
                                           <Star size={18} className={ratings[rating.competency.id]?.score >= star ? "fill-current" : ""} />
                                        </button>
                                      ))}
                                   </div>
                                   <textarea
                                     value={ratings[rating.competency.id]?.comment ?? ''}
                                     onChange={e => handleRatingChange(rating.competency.id, 'comment', e.target.value)}
                                     placeholder="Provide manager comments..."
                                     className="nx-input w-full p-4 text-xs font-medium resize-none min-h-[100px]"
                                   />
                                </div>
                              )}
                           </div>
                        </div>
                      </motion.div>
                    ))}
                 </div>
                 
                 {selectedAppraisal.status !== 'COMPLETED' && (
                   <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-white/[0.05]">
                      <button
                        onClick={() => setSelectedAppraisal(null)}
                        className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                      >
                         Cancel
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmitReview}
                        disabled={saving}
                        className="btn-primary px-10 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Submitting...' : 'Submit Manager Review'}
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
