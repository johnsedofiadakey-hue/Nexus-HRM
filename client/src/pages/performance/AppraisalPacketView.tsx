import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardCheck, ShieldCheck, UserCheck, History, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { getStoredUser } from '../../utils/session';
import { format } from 'date-fns';

const AppraisalPacketView: React.FC = () => {
  const { packetId } = useParams<{ packetId: string }>();
  const [packet, setPacket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REVIEW' | 'HISTORY'>('REVIEW');
  const user = getStoredUser();

  const stages = [
    { key: 'SELF_REVIEW', label: 'Self Review', icon: UserCheck },
    { key: 'SUPERVISOR_REVIEW', label: 'Supervisor', icon: ShieldCheck },
    { key: 'MANAGER_REVIEW', label: 'Manager', icon: ShieldCheck },
    { key: 'HR_REVIEW', label: 'HR Review', icon: ShieldCheck },
    { key: 'FINAL_REVIEW', label: 'Final Verdict', icon: CheckCircle }
  ];

  useEffect(() => {
    fetchPacket();
  }, [packetId]);

  const fetchPacket = async () => {
    try {
      const res = await api.get(`/appraisals/packet/${packetId}`);
      setPacket(res.data);
    } catch (err) {
      toast.error('Failed to load appraisal details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (formData: any) => {
    try {
       await api.post(`/appraisals/review/${packetId}`, formData);
       toast.success('Review submitted successfully.');
       fetchPacket();
    } catch (err: any) {
       toast.error(err.response?.data?.error || 'Submission failed');
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing Appraisal Packet...</div>;
  if (!packet) return <div className="p-20 text-center">Packet not found.</div>;

  const currentStageIndex = stages.findIndex(s => s.key === packet.currentStage);
  const isMyTurn = (
    (packet.currentStage === 'SELF_REVIEW' && packet.employeeId === user.id) ||
    (packet.currentStage === 'SUPERVISOR_REVIEW' && packet.supervisorId === user.id) ||
    (packet.currentStage === 'MANAGER_REVIEW' && packet.managerId === user.id) ||
    (packet.currentStage === 'HR_REVIEW' && packet.hrReviewerId === user.id) ||
    (packet.currentStage === 'FINAL_REVIEW' && packet.finalReviewerId === user.id)
  );

  return (
    <div className="space-y-8 page-enter pb-20">
      <PageHeader 
        title={`Appraisal: ${packet.employee?.fullName}`}
        description={`Cycle: ${packet.cycle?.title} · Current Stage: ${packet.currentStage.replace(/_/g, ' ')}`}
        icon={ClipboardCheck}
        variant="indigo"
      />

      {/* Stage Progress Bar */}
      <div className="glass p-8 rounded-[2.5rem] bg-slate-900/40 border-white/5">
        <div className="flex justify-between relative">
           <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/5 -z-10" />
           {stages.map((stage, idx) => {
             const isCompleted = idx < currentStageIndex;
             const isActive = idx === currentStageIndex;
             return (
               <div key={stage.key} className="flex flex-col items-center gap-3 relative z-10 w-32">
                 <div className={cn(
                   "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                   isCompleted ? "bg-emerald-500 border-emerald-400 text-white" : 
                   isActive ? "bg-primary border-primary-light text-white shadow-lg shadow-primary/40 ring-4 ring-primary/10" : 
                   "bg-slate-800 border-white/10 text-slate-500"
                 )}>
                   {isCompleted ? <CheckCircle size={20} /> : <stage.icon size={20} />}
                 </div>
                 <div className="text-center">
                   <p className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? "text-primary-light" : "text-slate-500")}>
                     {stage.label}
                   </p>
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 space-y-6">
           <div className="flex gap-4 p-1 bg-slate-900/40 rounded-2xl w-fit border border-white/5">
              <button 
                onClick={() => setActiveTab('REVIEW')}
                className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'REVIEW' ? "bg-primary text-white" : "text-slate-500 hover:text-white")}
              >
                Active Review
              </button>
              <button 
                onClick={() => setActiveTab('HISTORY')}
                className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'HISTORY' ? "bg-primary text-white" : "text-slate-500 hover:text-white")}
              >
                Audit Trail
              </button>
           </div>

           <AnimatePresence mode="wait">
             {activeTab === 'REVIEW' ? (
               <motion.div 
                 key="review"
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="glass p-10 rounded-[2.5rem] min-h-[400px]"
               >
                 {isMyTurn ? (
                   <AppraisalReviewForm 
                     stage={packet.currentStage}
                     onSubmit={handleSubmitReview}
                   />
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                         <Clock size={32} />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Pending Next Stage</h3>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">This appraisal is currently awaiting action from the next reviewer in the hierarchy.</p>
                   </div>
                 )}
               </motion.div>
             ) : (
               <motion.div 
                 key="history"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="space-y-4"
               >
                 {packet.reviews?.length > 0 ? (
                   packet.reviews.map((rev: any) => (
                     <div key={rev.id} className="glass p-6 rounded-3xl border-white/5 bg-slate-900/20 hover:border-white/10 transition-all">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-black text-xs">
                                {rev.reviewer?.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-primary-light uppercase tracking-widest">{rev.reviewStage.replace(/_/g, ' ')}</p>
                                <p className="text-xs font-bold text-white">{rev.reviewer?.fullName}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{format(new Date(rev.submittedAt), 'PPp')}</p>
                           </div>
                        </div>
                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                           <p className="text-xs text-slate-300 italic">"{rev.comment}"</p>
                           {rev.score !== null && (
                             <div className="mt-4 flex items-center gap-2">
                               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Score:</span>
                               <span className="text-sm font-black text-primary-light">{rev.score}%</span>
                             </div>
                           )}
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-20 text-slate-500 uppercase tracking-[0.2em] font-black text-[10px]">No historical data identified.</div>
                 )}
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="w-full xl:w-96 space-y-6">
           <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Evaluation Context</h3>
              
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <UserCheck className="text-primary-light" size={16} />
                    <span className="text-xs font-bold text-white">Employee Profile Sync Active</span>
                 </div>
                 <div className="flex items-center gap-3 text-slate-500">
                    <History size={16} />
                    <span className="text-[10px] uppercase font-black tracking-widest">Version Control: V3.1</span>
                 </div>
              </div>
           </div>

           <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-amber-500" size={20} />
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Compliance Warning</h4>
              </div>
              <p className="text-[10px] font-bold text-amber-500/60 leading-relaxed uppercase tracking-widest">
                Reviews are immutable once submitted. Ensure all scores and comments comply with the corporate performance mandate.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

const AppraisalReviewForm: React.FC<{ stage: string, onSubmit: (data: any) => void }> = ({ stage, onSubmit }) => {
  const [score, setScore] = useState(70);
  const [comment, setComment] = useState('');

  return (
    <div className="space-y-8">
      <div>
         <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">Perform {stage.replace(/_/g, ' ')}</h2>
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deployment level: Active Review</p>
      </div>

      <div className="space-y-4">
         <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-black text-white uppercase tracking-widest">Performance Score</label>
            <span className="text-2xl font-black text-primary-light">{score}%</span>
         </div>
         <input 
           type="range" 
           min="0" max="100" 
           value={score} 
           onChange={(e) => setScore(parseInt(e.target.value))}
           className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
         />
         <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
            <span>Critical (0)</span>
            <span>Target (80)</span>
            <span>Exceptional (100)</span>
         </div>
      </div>

      <div className="space-y-2">
         <label className="text-xs font-black text-white uppercase tracking-widest">Quantitative Feedback</label>
         <textarea 
           placeholder="Enter detailed review commentary..."
           className="glass-input w-full min-h-[150px] p-4 text-white text-xs"
           value={comment}
           onChange={(e) => setComment(e.target.value)}
         />
      </div>

      <button 
        onClick={() => onSubmit({ score, comment })}
        className="w-full py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-primary-light shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all"
      >
        <CheckCircle size={18} /> Deploy Review Submission
      </button>
    </div>
  );
};

export default AppraisalPacketView;
