import React, { useEffect, useState } from 'react';
import { Target, Clock, CheckCircle, ShieldCheck, Award, MessageSquare, AlertCircle, Save, Send, Lock, Loader2, Star, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

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
  PENDING_SELF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  PENDING_MANAGER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
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
      const data = res.data;
      setAppraisal(data);
      const initialRatings: { [key: string]: { score: number; comment: string } } = {};
      data.ratings?.forEach((r: Rating) => {
        initialRatings[r.competency.id] = { score: r.selfScore || 0, comment: r.selfComment || '' };
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
      fetchMyAppraisal();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Validation error during submission');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 size={32} className="animate-spin text-primary-light" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading performance data...</p>
      </div>
    );
  }

  if (!appraisal) {
    return (
      <div className="space-y-10 page-enter min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-white font-display tracking-tight">Appraisals</h1>
            <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
              <Award size={14} className="text-primary-light" />
              Employee Performance Evaluation
            </p>
          </div>
        </div>
        <div className="glass p-20 text-center border-white/[0.05]">
          <Target size={48} className="mx-auto mb-6 opacity-10 text-slate-300" />
          <h2 className="text-xl font-bold text-slate-400 mb-2 font-display uppercase tracking-tight">No Active Appraisal Cycle</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 max-w-sm mx-auto leading-relaxed">You have no active appraisal cycles at this time.</p>
        </div>
      </div>
    );
  }

  const isLocked = appraisal.status !== 'PENDING_SELF';

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Appraisals</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <Award size={14} className="text-primary-light" />
            Employee Performance Evaluation
          </p>
        </div>
      </div>

      {/* Cycle Telemetry */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass overflow-hidden border-white/[0.05] p-8 md:p-10 relative"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <TrendingUp size={120} className="text-white" />
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 justify-between relative z-10 w-full mb-8">
           <div className="space-y-4">
              <h2 className="text-3xl font-black text-white font-display uppercase tracking-tight">{appraisal.cycle.name}</h2>
              <div className="flex flex-wrap items-center gap-4">
                <span className={cn("px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border", statusColors[appraisal.status] || 'bg-white/5 text-slate-400 border-white/10')}>
                  {appraisal.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border border-white/5 bg-white/[0.02] px-3 py-1.5 rounded-xl">
                   <Clock size={12} className="text-primary-light" />
                   Due Date: {new Date(appraisal.cycle.endDate).toLocaleDateString()}
                </span>
              </div>
           </div>
           
           <div className="flex md:flex-col gap-6 md:text-right">
              <div>
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Manager</p>
                 <p className="text-sm font-bold text-white flex items-center md:justify-end gap-2">
                    <ShieldCheck size={14} className="text-primary-light" />
                    {appraisal.reviewer?.fullName}
                 </p>
              </div>
              {appraisal.status === 'COMPLETED' && appraisal.finalScore !== null && (
                <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Final Score</p>
                   <p className="text-2xl font-black text-emerald-400 font-display">{appraisal.finalScore}%</p>
                </div>
              )}
           </div>
        </div>
        
        {/* Core Competencies Grid */}
        <div className="space-y-6 pt-8 border-t border-white/[0.05]">
           <div className="flex items-center gap-3 mb-6">
              <Target size={16} className="text-primary-light" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Competencies</h3>
           </div>
           
           <div className="grid grid-cols-1 gap-6">
             {appraisal.ratings?.map((rating, idx) => (
               <motion.div 
                 key={rating.id}
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: idx * 0.1 }}
                 className="p-6 md:p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.03] space-y-6 hover:bg-white/[0.03] transition-colors"
               >
                 <div className="border-b border-white/[0.05] pb-6 mb-2">
                    <h4 className="text-lg font-black text-white font-display tracking-tight mb-2">{rating.competency.name}</h4>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-3xl">{rating.competency.description}</p>
                 </div>
                 
                 <div className="grid md:grid-cols-2 gap-8">
                    {/* Self Rating */}
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-light flex items-center gap-2">
                          <Target size={12} />
                          Self-Rating
                       </label>
                       
                       {isLocked ? (
                         <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="flex items-end gap-2 mb-3">
                               <span className="text-3xl font-black text-white font-display leading-none">{rating.selfScore || 0}</span>
                               <span className="text-sm font-bold text-slate-500 mb-1">/ 5</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed italic border-l-2 border-primary/30 pl-3 py-1">
                              "{rating.selfComment || 'No comments provided'}"
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
                                       ? "bg-primary/20 border-primary text-primary-light shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                       : "bg-white/[0.02] border-white/10 text-slate-600 hover:border-slate-500 hover:text-slate-400"
                                   )}
                                 >
                                    <Star size={18} className={ratings[rating.competency.id]?.score >= star ? "fill-current" : ""} />
                                    <span className="sr-only">{star} Stars</span>
                                 </button>
                               ))}
                            </div>
                            <textarea
                              value={ratings[rating.competency.id]?.comment ?? ''}
                              onChange={e => handleRatingChange(rating.competency.id, 'comment', e.target.value)}
                              placeholder="Provide a comment for this rating..."
                              className="nx-input w-full p-4 text-xs font-medium resize-none min-h-[100px]"
                            />
                         </div>
                       )}
                    </div>
                    
                    {/* Manager Rating */}
                    <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                          <ShieldCheck size={12} />
                          Manager Rating
                       </label>
                       
                       {rating.managerScore !== null ? (
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
                         <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                            <Lock size={20} className="text-slate-600 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Awaiting Manager<br/>Review</p>
                         </div>
                       )}
                    </div>
                 </div>
               </motion.div>
             ))}
           </div>
           
           {!isLocked && (
             <div className="mt-8 flex justify-end pt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={saving}
                  className="btn-primary px-10 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {saving ? 'Submitting...' : 'Submit Self-Evaluation'}
                </motion.button>
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
};

export default Appraisals;
