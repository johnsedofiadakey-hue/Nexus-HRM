import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, UserX, Package, FileText, CheckCircle2, 
  Plus, Shield, Save,
  AlertCircle, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../utils/cn';
import { toast } from '../../utils/toast';

interface OffboardingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  processId: string;
}

const steps = [
  { label: 'Initiation', status: 'INITIATED' },
  { label: 'Asset Return', status: 'ASSET_RETURN' },
  { label: 'Exit Interview', status: 'INTERVIEW' },
  { label: 'Clearance', status: 'COMPLETED' },
];

const OffboardingDetailsModal = ({ isOpen, onClose, processId }: OffboardingDetailsModalProps) => {
  const [process, setProcess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isHR = (currentUser?.rank || 0) >= 70;

  // Form States
  const [interviewData, setInterviewData] = useState({
    feedback: '',
    rehireEligible: true,
    interviewDate: ''
  });
  const [assetName, setAssetName] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');

  useEffect(() => {
    if (isOpen && processId) {
      fetchDetails();
    }
  }, [isOpen, processId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/offboarding/${processId}`);
      setProcess(res.data);
      
      const statusIdx = steps.findIndex(s => s.status === res.data.status);
      setActiveStep(statusIdx >= 0 ? statusIdx : 0);

      if (res.data.exitInterviews?.[0]) {
        setInterviewData({
          feedback: res.data.exitInterviews[0].feedback || '',
          rehireEligible: res.data.exitInterviews[0].rehireEligible ?? true,
          interviewDate: res.data.exitInterviews[0].interviewDate?.split('T')[0] || ''
        });
      }
    } catch (err) {
      toast.error('Failed to sync exit protocols');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInterview = async () => {
    try {
      await api.patch(`/offboarding/${processId}/interview`, interviewData);
      toast.success('Interview transcript synchronized');
      fetchDetails();
    } catch (err) {
      toast.error('Transcription failure');
    }
  };

  const handleTrackAsset = async () => {
    if (!assetName) return;
    try {
      await api.post('/offboarding/assets', { 
        offboardingId: processId, 
        assetName, 
        conditionNotes 
      });
      setAssetName('');
      setConditionNotes('');
      toast.success('Asset return logged in registry');
      fetchDetails();
    } catch (err) {
      toast.error('Registry update failed');
    }
  };

  const handleCompleteClearance = async () => {
    if (!window.confirm('Confirm final clearance? This will deactivate the personnel account.')) return;
    try {
      await api.post(`/offboarding/${processId}/complete`);
      toast.success('Clearance finalized. Account deactivated.');
      onClose();
    } catch (err) {
      toast.error('Clearance failure');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 40 }}
          className="w-full max-w-5xl bg-[var(--bg-card)] rounded-[3rem] border border-[var(--border-subtle)] shadow-3xl overflow-hidden relative z-10 flex flex-col h-[85vh]"
        >
          {/* Header */}
          <div className="p-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-between items-center relative overflow-hidden">
             <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-2xl">
                   <UserX size={32} />
                </div>
                <div>
                   <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight uppercase">Separation <span className="opacity-40 italic">v4.0</span></h2>
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-1">{process?.employee?.fullName} · {process?.employee?.employeeCode}</p>
                </div>
             </div>
             <button onClick={onClose} className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 transition-all shadow-lg active:scale-90">
                <X size={24} />
             </button>
             <div className="absolute top-[-30px] right-[-30px] w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>

          <div className="flex-1 flex min-h-0">
             {/* Stepper Sidebar */}
             <div className="w-[300px] border-r border-[var(--border-subtle)] p-8 space-y-3 bg-[var(--bg-elevated)]/20">
                {steps.map((step, i) => {
                  const isPast = activeStep > i || process?.status === 'COMPLETED';
                  const isCurrent = activeStep === i;
                  return (
                    <button 
                      key={i}
                      disabled={!isHR && !isCurrent}
                      onClick={() => setActiveStep(i)}
                      className={cn(
                        "w-full p-5 rounded-2xl flex items-center gap-4 transition-all text-left group border border-transparent",
                        isCurrent ? "bg-[var(--primary)] text-white shadow-xl scale-[1.05] z-10 border-white/20" : 
                        isPast ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/10" : "text-[var(--text-muted)] hover:bg-[var(--bg-sidebar-active)]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-12",
                        isCurrent ? "bg-white/20" : isPast ? "bg-emerald-500/10" : "bg-[var(--bg-elevated)]"
                      )}>
                        {isPast ? <CheckCircle2 size={18} /> : <span className="text-xs font-black">{i + 1}</span>}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">{step.label}</p>
                        <p className={cn("text-[8px] font-bold uppercase tracking-tight mt-0.5 opacity-60", isCurrent ? "text-white" : "text-[var(--text-muted)]")}>
                           {isPast ? 'Verified' : isCurrent ? 'Active Process' : 'Pending'}
                        </p>
                      </div>
                    </button>
                  );
                })}
             </div>

             {/* Content Area */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                {loading ? (
                   <div className="h-full flex flex-col items-center justify-center gap-6">
                      <div className="w-16 h-16 rounded-full border-4 border-rose-500/10 border-t-rose-500 animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">Decoding Protocols</p>
                   </div>
                ) : (
                  <div className="space-y-12">
                     {activeStep === 0 && (
                        <div className="space-y-8">
                           <div className="p-8 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                              <h4 className="text-sm font-black uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2 italic">
                                 <AlertCircle size={16} /> Initiation Details
                              </h4>
                              <div className="grid grid-cols-2 gap-10">
                                 <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Notice Date</p>
                                    <p className="text-base font-black text-[var(--text-primary)]">{new Date(process.createdAt).toLocaleDateString()}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Expected Exit</p>
                                    <p className="text-base font-black text-[var(--text-primary)]">{process.effectiveDate ? new Date(process.effectiveDate).toLocaleDateString() : 'TBD'}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="p-8 rounded-3xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 italic opacity-40">Original Feedback On Exit</p>
                              <p className="text-sm font-medium leading-relaxed italic text-[var(--text-muted)]">"{process.exitInterviews?.[0]?.reason || 'No specific reason entered at initiation.'}"</p>
                           </div>
                        </div>
                     )}

                     {activeStep === 1 && (
                        <div className="space-y-8">
                           <div className="flex items-center justify-between">
                              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Asset Registry <span className="text-rose-500">Return</span></h3>
                              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border-subtle)] px-3 py-1 rounded-full">{process.assetReturns?.length || 0} Items Logged</span>
                           </div>

                           <div className="p-8 rounded-3xl bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                 <input type="text" placeholder="Asset Name (e.g. MacBook Pro M3)" className="nx-input" value={assetName} onChange={e => setAssetName(e.target.value)} />
                                 <input type="text" placeholder="Condition (e.g. Minor scratches)" className="nx-input" value={conditionNotes} onChange={e => setConditionNotes(e.target.value)} />
                              </div>
                              <button onClick={handleTrackAsset} className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                                 <Plus size={16} /> Log Asset Return
                              </button>
                           </div>

                           <div className="space-y-3">
                              {process.assetReturns?.map((asset: any) => (
                                 <div key={asset.id} className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20"><Package size={18} /></div>
                                       <div>
                                          <p className="text-sm font-black text-[var(--text-primary)]">{asset.assetName}</p>
                                          <p className="text-[10px] text-[var(--text-muted)] font-bold">{asset.conditionNotes || 'Condition: Perfect'}</p>
                                       </div>
                                    </div>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{new Date(asset.returnedAt).toLocaleDateString()}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     {activeStep === 2 && (
                        <div className="space-y-8">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-lg"><FileText size={20} /></div>
                              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter italic">Exit Interview <span className="text-amber-500">Transcript</span></h3>
                           </div>
                           
                           <div className="space-y-6">
                              <div className="space-y-3">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-2 opacity-60 italic">In-depth Feedback & Sentiments</label>
                                 <textarea 
                                    className="nx-input min-h-[150px] resize-none py-6 leading-relaxed bg-[var(--bg-elevated)]/50 border-2" 
                                    placeholder="Enter exhaustive feedback from the employee..." 
                                    value={interviewData.feedback}
                                    onChange={e => setInterviewData({ ...interviewData, feedback: e.target.value })}
                                 />
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-2 opacity-60">Interview Date</label>
                                    <input 
                                       type="date" 
                                       className="nx-input" 
                                       value={interviewData.interviewDate}
                                       onChange={e => setInterviewData({ ...interviewData, interviewDate: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-2 opacity-60">Rehire Eligibility</label>
                                    <select 
                                       className="nx-input" 
                                       value={interviewData.rehireEligible ? "true" : "false"}
                                       onChange={e => setInterviewData({ ...interviewData, rehireEligible: e.target.value === "true" })}
                                    >
                                       <option value="true">YES - ELIGIBLE</option>
                                       <option value="false">NO - RESTRICTED</option>
                                    </select>
                                 </div>
                              </div>

                              <button onClick={handleUpdateInterview} className="w-full py-5 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                 <Save size={18} /> Synchronize Transcript
                              </button>
                           </div>
                        </div>
                     )}

                     {activeStep === 3 && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-10 py-10">
                           <div className="w-32 h-32 rounded-[3rem] bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-3xl shadow-emerald-500/10">
                              <Shield size={60} className="animate-pulse" />
                           </div>
                           <div className="max-w-md space-y-4">
                              <h3 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight">Ready for <span className="text-emerald-500">Clearance</span></h3>
                              <p className="text-[var(--text-muted)] font-medium leading-relaxed opacity-60 italic">I, reaching this stage, confirm that all assets have been returned, knowledge has been transferred, and the exit interview is documented.</p>
                           </div>
                           
                           {process.status !== 'COMPLETED' ? (
                              <button onClick={handleCompleteClearance} className="px-12 py-6 rounded-3xl bg-[var(--primary)] text-white font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(var(--primary-rgb),0.3)] hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-4">
                                 Execute Final Clearance <ArrowRight size={20} />
                              </button>
                           ) : (
                              <div className="px-10 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-3">
                                 <CheckCircle2 size={18} /> Personnel File Decoupled & Deactivated
                              </div>
                           )}
                        </div>
                     )}
                  </div>
                )}
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OffboardingDetailsModal;
