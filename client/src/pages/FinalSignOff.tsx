import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../utils/toast';
import { Target, Clock, ShieldCheck, Users, Loader2, CheckCircle, Search, ChevronRight, Trash2, Sparkles, Edit2 } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import PageHeader from '../components/common/PageHeader';
import FlowSteps from '../components/common/FlowSteps';
import EmptyState from '../components/common/EmptyState';
import { useAI } from '../context/AIContext';
import { useTheme } from '../context/ThemeContext';

interface TeamAppraisal {
  id: string;
  status: string;
  currentStage: string;
  employee: { id: string; fullName: string; jobTitle: string; avatarUrl?: string };
  cycle: { title: string; endDate: string };
  reviews: Review[];
  finalScore?: number;
  isDisputed?: boolean;
  disputeReason?: string;
  disputeResolution?: string;
}

interface Review {
  id: string;
  reviewer: { fullName: string; avatarUrl?: string };
  reviewStage: string;
  overallRating: number | null;
  summary: string;
  submittedAt: string;
}

const FinalSignOff = () => {
  const { t, i18n: i18n_fe } = useTranslation();
  const [appraisals, setAppraisals] = useState<TeamAppraisal[]>([]);
  const [selectedAppraisal, setSelectedAppraisal] = useState<TeamAppraisal | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { setContextData, setIsOpen: setIsAIOpen, isEnabled: isAIEnabled } = useAI();
  const { theme, settings } = useTheme();

  useEffect(() => {
    fetchAwaitingSignOff();
  }, []);

  const fetchAwaitingSignOff = async () => {
    try {
      const res = await api.get('/appraisals/final-sign-off-list');
      setAppraisals(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      setAppraisals([]);
    } finally {
      setLoading(false);
    }
  };


  const [exporting, setExporting] = useState(false);
  const handlePrint = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExporting(true);
    try {
      const response = await api.get(`/export/appraisal/${id}/pdf?lang=${i18n_fe.language}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `appraisal-report-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success('PDF Generated');
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  const [finalComment, setFinalComment] = useState('');
  const [finalScoreOverride, setFinalScoreOverride] = useState<number>(0);

  useEffect(() => {
    if (selectedAppraisal) {
      setFinalScoreOverride(selectedAppraisal.finalScore || 0);
    }
  }, [selectedAppraisal]);

  const handleFinalApproval = async () => {
    if (!selectedAppraisal) return;
    if (!confirm(`Are you sure you want to provide final approval for ${selectedAppraisal.employee.fullName}?`)) return;
    
    setProcessing(true);
    try {
      await api.post('/appraisals/final-sign-off', { 
        packetId: selectedAppraisal.id,
        finalVerdict: finalComment,
        finalScore: finalScoreOverride
      });
      toast.success("Evaluation Finalized.");
      setSelectedAppraisal(null);
      setFinalComment('');
      fetchAwaitingSignOff();
    } catch (error: any) {
      toast.error(String(error?.response?.data?.error || 'Error completing approval'));
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (selectedAppraisal) {
      setContextData({
        type: 'APPRAISAL_PACKET',
        packetId: selectedAppraisal.id,
        employeeName: selectedAppraisal.employee.fullName,
        currentStage: selectedAppraisal.currentStage,
        reviews: selectedAppraisal.reviews,
        status: selectedAppraisal.status
      });
    } else {
      setContextData(null);
    }
    return () => setContextData(null);
  }, [selectedAppraisal, setContextData]);

  const handleDeleteAppraisal = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the review for ${name}? This cannot be undone.`)) return;
    
    try {
      await api.delete(`/appraisals/packet/${id}`);
      toast.info("Review record removed.");
      if (selectedAppraisal?.id === id) setSelectedAppraisal(null);
      fetchAwaitingSignOff();
    } catch (error: any) {
      toast.error(String(error?.response?.data?.error || 'Error deleting review'));
    }
  };

  const filtered = (appraisals || []).filter(a => a?.employee?.fullName?.toLowerCase().includes(searchTerm?.toLowerCase() || ''));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 bg-[var(--bg-main)]">
      <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Loading reviews...</p>
    </div>
  );

  return (
    <div className="space-y-10 page-transition min-h-screen pb-20 bg-[var(--bg-main)]">
      <div className="flex items-center justify-between">
        <PageHeader 
          title={t('common.executive_sign_off')}
          description={t('appraisals.packet.institutional_desc')}
          icon={ShieldCheck}
        />
        {isAIEnabled && selectedAppraisal && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAIOpen(true)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-[var(--primary)]/20 hover:shadow-primary/40 transition-all border border-white/10"
          >
            <Sparkles size={16} className="animate-pulse" /> {t('dashboard.pulse_advisor')}
          </motion.button>
        )}
      </div>

      <FlowSteps 
        currentStep={3}
        steps={[
          { id: 1, label: t('appraisals.packet.self_evaluation'), description: t('employees.roles.STAFF') },
          { id: 2, label: t('appraisals.packet.manager_assessment'), description: t('common.manager') },
          { id: 3, label: t('appraisals.packet.executive_signoff'), description: t('employees.roles.DIRECTOR') },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Awaiting Approval */}
        <div className="lg:col-span-4 space-y-6">
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" size={18} />
                <input 
                    placeholder={t('common.search')} 
                    className="nx-input !pl-14 !bg-[var(--bg-elevated)] !border-[var(--border-subtle)] focus:!border-[var(--primary)]/30 !text-[var(--text-primary)]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-3">
               {filtered.length === 0 ? (
                  <EmptyState 
                    title="Queue Empty"
                    description="No performance reviews are currently awaiting final approval."
                    icon={CheckCircle}
                    variant="slate"
                    className="p-10"
                  />
               ) : (
                  filtered.map((appraisal) => (
                    <motion.div
                      whileHover={{ x: 5 }}
                      key={appraisal.id}
                      onClick={() => setSelectedAppraisal(appraisal)}
                       className={cn(
                        "p-6 rounded-[1.8rem] cursor-pointer transition-all duration-300 border relative overflow-hidden group/card",
                        selectedAppraisal?.id === appraisal.id
                          ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 shadow-2xl shadow-[var(--primary)]/10"
                          : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30"
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/5 flex items-center justify-center text-xs font-black text-[var(--primary)] border border-[var(--primary)]/20">
                              {appraisal?.employee?.fullName?.split(' ')?.map(n => n[0])?.join('')?.slice(0, 2) || '??'}
                           </div>
                           <div>
                             <p className="font-bold text-sm text-[var(--text-primary)]">{appraisal.employee.fullName}</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">{appraisal.employee.jobTitle}</p>
                           </div>
                        </div>
                      </div>
                       <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
                         <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                                <Clock size={12} className="text-[var(--primary)]" />
                                Review Stage: <strong className="text-[var(--text-primary)] text-xs ml-1">{t(`appraisals.stages.${appraisal.currentStage}`)}</strong>
                            </span>
                            <button 
                                onClick={(e) => handleDeleteAppraisal(e, appraisal.id, appraisal.employee.fullName)}
                                className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--error)]/20 text-[var(--text-muted)] hover:text-[var(--error)] transition-all border border-transparent hover:border-[var(--error)]/20"
                            >
                                <Trash2 size={12} />
                            </button>
                         </div>
                         <ChevronRight size={14} className="text-[var(--text-muted)] group-hover/card:text-[var(--primary)] group-hover/card:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))
               )}
            </div>
        </div>

        {/* Right Column: Approval Area */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
              {!selectedAppraisal ? (
                  <div className="col-span-full">
                    <EmptyState 
                        title="Sign-off Required"
                        description="Select an appraisal from the queue to provide a final decision."
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
                  className="p-10 border border-[var(--border-subtle)] relative bg-[var(--bg-card)] backdrop-blur-3xl overflow-hidden rounded-[2.5rem] shadow-2xl"
                >
                  <div className="relative z-10 w-full mb-12 border-b border-[var(--border-subtle)] pb-10">
                    <h2 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight uppercase leading-none mb-4">{selectedAppraisal.employee.fullName}</h2>
                    <p className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-3">
                        {selectedAppraisal.employee.jobTitle} 
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-subtle)]" />
                        {selectedAppraisal.cycle.title}
                    </p>
                  </div>

                   <div className="space-y-10 relative z-10">
                     {/* Summary Dashboard */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 rounded-[2rem] bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] mb-6 flex items-center gap-2 font-bold">
                                <Users size={14} /> {t('appraisals.packet.calibration_overview')}
                            </h4>
                            <div className="space-y-6">
                                {selectedAppraisal.reviews.map(r => (
                                    <div key={r.id} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t(`appraisals.stages.${r.reviewStage}`)}</span>
                                            <span className="text-xs font-black text-[var(--text-primary)]">{r.overallRating !== null ? `${r.overallRating}%` : t('common.no_data')}</span>
                                        </div>
                                        <div className="w-full h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                            <div className="h-full bg-[var(--primary)]/40" style={{ width: `${r.overallRating || 0}%` }} />
                                        </div>
                                        {r.summary && (
                                            <p className="text-[9px] text-[var(--text-secondary)] leading-relaxed font-medium pl-3 border-l-2 border-[var(--primary)]/20 tracking-tighter italic">
                                                "{r.summary}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                         <div className="flex flex-col gap-6">
                            {selectedAppraisal.isDisputed && (
                                <div className="p-6 rounded-2xl bg-[var(--error)]/10 border border-[var(--error)]/20 animate-pulse">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-[var(--error)]" />
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--error)]">{t('appraisals.packet.dispute_flagged')}</h5>
                                    </div>
                                    <p className="text-xs text-[var(--error)] leading-relaxed italic">
                                        "{selectedAppraisal.disputeReason}"
                                    </p>
                                </div>
                            )}

                            <div className="flex-1 p-10 rounded-[2.5rem] bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex flex-col items-center justify-center text-center shadow-lg shadow-[var(--primary)]/5 relative group">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--primary)] mb-4 italic">{t('appraisals.packet.weighted_result')}</p>
                                
                                <div className="flex items-center gap-4 relative">
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        value={finalScoreOverride}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^0-9]/g, '');
                                          if (val === '' || (Number(val) >= 0 && Number(val) <= 100)) {
                                            setFinalScoreOverride(Number(val));
                                          }
                                        }}
                                        className="text-7xl font-black text-[var(--text-primary)] font-display leading-none bg-[var(--bg-input)] border-2 border-[var(--primary)]/20 rounded-3xl p-4 text-center w-56 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 outline-none transition-all shadow-inner"
                                    />
                                    <div className="absolute -top-2 -right-2 bg-[var(--primary)] text-white p-2 rounded-lg shadow-lg">
                                      <Edit2 size={16} />
                                    </div>
                                    <Sparkles size={24} className="text-[var(--primary)] animate-pulse" />
                                </div>

                                <div className="mt-6 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--success-color)] animate-ping" />
                                  {t('appraisals.packet.calibration_editable')}
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-4 italic">{t('appraisals.packet.executive_verdict')}</label>
                                <textarea 
                                    value={finalComment}
                                    onChange={(e) => setFinalComment(e.target.value)}
                                    placeholder={t('appraisals.packet.summary_placeholder_manager')}
                                    className="nx-input min-h-[100px] !bg-[var(--bg-input)] !border-[var(--border-subtle)] !text-[var(--text-primary)] !rounded-2xl"
                                />
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleFinalApproval}
                                disabled={processing}
                                className="w-full py-6 rounded-[2rem] bg-[var(--primary)] text-white flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-[var(--primary)]/30 group"
                            >
                                {processing ? t('common.loading') : <ShieldCheck size={18} className="group-hover:rotate-12 transition-transform" />}
                                {processing ? '' : t('appraisals.packet.provide_final_approval')}
                            </motion.button>

                            <button
                                onClick={(e) => handlePrint(e, selectedAppraisal.id)}
                                disabled={exporting}
                                className="w-full py-4 rounded-[1.5rem] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                {exporting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                {t('appraisals.packet.download_official_report')}
                            </button>
                        </div>
                     </div>
                  </div>
                </motion.div>
               )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default FinalSignOff;
