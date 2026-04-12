import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, ShieldCheck, UserCheck, CheckCircle,
  Clock, Target, BookOpen,
  ThumbsUp, Zap, Award,
  AlertTriangle, Printer, Scale
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { getStoredUser, getRankFromRole } from '../../utils/session';
import { useTranslation } from 'react-i18next';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';
import FinalizeCalibrationModal from '../../components/performance/FinalizeCalibrationModal';
import GrowthTracer from '../../components/performance/GrowthTracer';


// ── GET LOCALIZED COMPETENCY FRAMEWORK ──────────────────────────────────────────
const getCompetencyFramework = (t: any) => [
  {
    id: 'delivery',
    category: t('appraisals.packet.categories.results'),
    icon: Target,
    color: '#6366f1',
    competencies: [
      { id: 'goal_achievement', name: t('appraisals.packet.competencies.goal_achievement.name'), desc: t('appraisals.packet.competencies.goal_achievement.desc') },
      { id: 'quality_of_work', name: t('appraisals.packet.competencies.quality_of_work.name'), desc: t('appraisals.packet.competencies.quality_of_work.desc') },
      { id: 'productivity', name: t('appraisals.packet.competencies.productivity.name'), desc: t('appraisals.packet.competencies.productivity.desc') },
      { id: 'reliability', name: t('appraisals.packet.competencies.reliability.name'), desc: t('appraisals.packet.competencies.reliability.desc') },
    ],
  },
  {
    id: 'skills',
    category: t('appraisals.packet.categories.skills'),
    icon: BookOpen,
    color: '#10b981',
    competencies: [
      { id: 'job_knowledge', name: t('appraisals.packet.competencies.job_knowledge.name'), desc: t('appraisals.packet.competencies.job_knowledge.desc') },
      { id: 'problem_solving', name: t('appraisals.packet.competencies.problem_solving.name'), desc: t('appraisals.packet.competencies.problem_solving.desc') },
      { id: 'innovation', name: t('appraisals.packet.competencies.innovation.name'), desc: t('appraisals.packet.competencies.innovation.desc') },
    ],
  },
  {
    id: 'people',
    category: t('appraisals.packet.categories.people'),
    icon: ThumbsUp,
    color: '#f59e0b',
    competencies: [
      { id: 'teamwork', name: t('appraisals.packet.competencies.teamwork.name'), desc: t('appraisals.packet.competencies.teamwork.desc') },
      { id: 'communication', name: t('appraisals.packet.competencies.communication.name'), desc: t('appraisals.packet.competencies.communication.desc') },
      { id: 'customer_focus', name: t('appraisals.packet.competencies.customer_focus.name'), desc: t('appraisals.packet.competencies.customer_focus.desc') },
    ],
  },
  {
    id: 'leadership',
    category: t('appraisals.packet.categories.leadership'),
    icon: Zap,
    color: '#a855f7',
    competencies: [
      { id: 'ownership', name: t('appraisals.packet.competencies.ownership.name'), desc: t('appraisals.packet.competencies.ownership.desc') },
      { id: 'adaptability', name: t('appraisals.packet.competencies.adaptability.name'), desc: t('appraisals.packet.competencies.adaptability.desc') },
      { id: 'development', name: t('appraisals.packet.competencies.development.name'), desc: t('appraisals.packet.competencies.development.desc') },
      { id: 'punctuality', name: t('appraisals.packet.competencies.punctuality.name'), desc: t('appraisals.packet.competencies.punctuality.desc') },
    ],
  },
];

const getRatingLabels = (t: any): Record<number, { label: string; color: string; bg: string }> => ({
  1: { label: t('appraisals.packet.ratings.1'), color: 'text-[var(--error)]', bg: 'bg-[var(--error)]/10 border-[var(--error)]/20' },
  2: { label: t('appraisals.packet.ratings.2'), color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10 border-[var(--warning)]/20' },
  3: { label: t('appraisals.packet.ratings.3'), color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10 border-[var(--warning)]/20' },
  4: { label: t('appraisals.packet.ratings.4'), color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10 border-[var(--success)]/20' },
  5: { label: t('appraisals.packet.ratings.5'), color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/10 border-[var(--primary)]/20' },
});

// Weighted score: each competency is equal weight within its category
const calcOverallRating = (ratings: Record<string, number>): number => {
  const values = Object.values(ratings).filter(v => v > 0);
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 20); // → 0-100
};

// ── REVIEW FORM ───────────────────────────────────────────────────────────────
const AppraisalReviewForm: React.FC<{
  stage: string;
  onSubmit: (data: any) => void;
}> = ({ stage, onSubmit }) => {
  const { t } = useTranslation();
  const COMPETENCY_FRAMEWORK = getCompetencyFramework(t);
  const RATING_LABELS = getRatingLabels(t);

  const isSelf = stage === 'SELF_REVIEW';
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');

  const handleRating = (compId: string, val: number) => setRatings(prev => ({ ...prev, [compId]: val }));

  const getValidationErrors = () => {
    const errors: string[] = [];
    
    COMPETENCY_FRAMEWORK.forEach(cat => {
      const missingInCat = cat.competencies.filter(comp => !ratings[comp.id] || ratings[comp.id] === 0);
      if (missingInCat.length > 0) {
        errors.push(`${missingInCat.length} missing in "${cat.category}"`);
      }
    });

    if (summary.trim().length === 0) {
      errors.push(t('appraisals.packet.validation.summary_required', 'Executive summary is required'));
    } else if (summary.trim().length < 11) {
      errors.push(t('appraisals.packet.validation.summary_too_short', 'Executive summary is too short (min 11 chars)'));
    }

    return errors;
  };

  const handlePreSubmit = () => {
    const errors = getValidationErrors();
    if (errors.length > 0) {
      toast.warning(`${t('appraisals.packet.validation.incomplete_title', 'Submission Blocked')}: ${errors.join(', ')}`);
      return;
    }

    onSubmit({
      summary,
      strengths,
      weaknesses: improvements,
      overallRating: calcOverallRating(ratings),
      responses: JSON.stringify({ 
        competencyScores: COMPETENCY_FRAMEWORK.map(cat => ({
          category: cat.category,
          categoryAverage: cat.competencies.reduce((acc, c) => acc + (ratings[c.id] || 0), 0) / cat.competencies.length,
          competencies: cat.competencies.map(c => ({ id: c.id, name: c.name, rating: ratings[c.id], comment: comments[c.id] }))
        }))
      })
    });
  };

  return (
    <div className="space-y-12">
      <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10">
        <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">
          {isSelf ? t('appraisals.packet.self_review_title') : t('appraisals.packet.manager_review_title')}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] font-medium">{t('appraisals.packet.review_instruction')}</p>
      </div>

      {COMPETENCY_FRAMEWORK.map(cat => (
        <div key={cat.id} className="space-y-8">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: cat.color }}>
                <cat.icon size={24} />
             </div>
             <div>
               <h4 className="text-lg font-black text-[var(--text-primary)] uppercase">{cat.category}</h4>
               <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">{t('appraisals.packet.category_weight', 'Standard Institutional Weighting')}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cat.competencies.map(comp => (
              <div key={comp.id} className="p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-5 hover:border-primary/20 transition-all group">
                <div>
                  <h5 className="font-bold text-[var(--text-primary)] text-sm mb-1">{comp.name}</h5>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed italic">{comp.desc}</p>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      onClick={() => handleRating(comp.id, val)}
                      className={cn(
                        'flex-1 h-10 rounded-xl text-[11px] font-black transition-all border',
                        ratings[comp.id] === val ? RATING_LABELS[val].bg + ' ' + RATING_LABELS[val].color : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-primary/30'
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <textarea 
                  className="nx-input text-[11px] bg-[var(--bg-card)]/30 border-none min-h-[60px]" 
                  placeholder={t('appraisals.packet.comp_comment_placeholder', 'Add specific context...')}
                  value={comments[comp.id] || ''}
                  onChange={e => setComments({...comments, [comp.id]: e.target.value})}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-8 pt-8 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2">{t('appraisals.packet.strengths_label')}</label>
              <textarea className="nx-input min-h-[120px]" value={strengths} onChange={e => setStrengths(e.target.value)} placeholder={t('appraisals.packet.strengths_placeholder')} />
           </div>
           <div className="space-y-3">
              <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-2">{t('appraisals.packet.improvements_label')}</label>
              <textarea className="nx-input min-h-[120px]" value={improvements} onChange={e => setImprovements(e.target.value)} placeholder={t('appraisals.packet.improvements_placeholder')} />
           </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center ml-2">
            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('appraisals.packet.executive_summary')}</label>
            <span className={cn(
              "text-[9px] font-bold uppercase",
              summary.trim().length < 11 ? "text-[var(--error)]" : "text-[var(--success)]"
            )}>
              {summary.trim().length} / 11+
            </span>
          </div>
          <textarea 
            className="nx-input min-h-[150px] text-sm" 
            value={summary} 
            onChange={e => setSummary(e.target.value)} 
            placeholder={t('appraisals.packet.summary_placeholder')}
          />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-1">{t('appraisals.packet.computed_score')}</p>
            <div className="flex items-baseline gap-2">
               <span className="text-5xl font-black text-[var(--text-primary)]">{calcOverallRating(ratings)}</span>
               <span className="text-xl font-bold text-[var(--text-muted)]">%</span>
            </div>
          </div>
          <button
            onClick={handlePreSubmit}
            className="btn-primary px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
          >
            {t('appraisals.packet.finalize_review')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── MANAGEMENT COMPONENT ──────────────────────────────────────────────────────
const AppraisalManagementForm: React.FC<{
  packet: any;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  isDeleting: boolean;
}> = ({ packet, onUpdate, onDelete, isDeleting }) => {
  const [form, setForm] = useState({
    supervisorId: packet.supervisorId || '',
    managerId: packet.managerId || '',
    matrixSupervisorId: packet.matrixSupervisorId || '',
    hrReviewerId: packet.hrReviewerId || '',
    finalReviewerId: packet.finalReviewerId || '',
    currentStage: packet.currentStage
  });

  const [personnel, setPersonnel] = useState<any[]>([]);
  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const res = await api.get('/users');
        setPersonnel(res.data);
      } catch {}
    };
    fetchPersonnel();
  }, []);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {[
           { label: 'Primary Supervisor', key: 'supervisorId' },
           { label: 'Secondary/Matrix Manager', key: 'matrixSupervisorId' },
           { label: 'Department Manager', key: 'managerId' },
           { label: 'HR Reviewer', key: 'hrReviewerId' },
           { label: 'Final Executive Sign-off', key: 'finalReviewerId' }
         ].map(field => (
           <div key={field.key} className="space-y-2">
             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">{field.label}</label>
             <select 
               className="nx-input" 
               value={form[field.key as keyof typeof form]} 
               onChange={e => setForm({...form, [field.key]: e.target.value})}
             >
               <option value="">No Assignment</option>
               {personnel.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.jobTitle})</option>)}
             </select>
           </div>
         ))}

         <div className="space-y-2">
           <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Override Institutional Stage</label>
           <select className="nx-input border-amber-500/30" value={form.currentStage} onChange={e => setForm({...form, currentStage: e.target.value})}>
              <option value="SELF_REVIEW">Self Evaluation Stage</option>
              <option value="MANAGER_REVIEW">Manager Assessment Stage</option>
              <option value="FINAL_REVIEW">Final Executive Review Stage</option>
              <option value="COMPLETED">Institutional Handshake Complete (Locked)</option>
           </select>
         </div>
      </div>

      <div className="flex gap-4 pt-6 border-t border-[var(--border-subtle)]">
         <button onClick={() => onUpdate(form)} className="btn-primary px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Apply Transformations</button>
         <button onClick={onDelete} disabled={isDeleting} className="px-8 py-4 rounded-xl border border-[var(--error)]/20 text-[var(--error)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--error)]/5 transition-all">
            {isDeleting ? 'Decommissioning...' : 'Decommission Packet'}
         </button>
      </div>
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const AppraisalPacketView: React.FC = () => {
  const { packetId } = useParams<{ packetId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [packet, setPacket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REVIEW' | 'HISTORY' | 'MANAGEMENT'>('REVIEW');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);
  const canManage = rank >= 80;

  const stages = [
    { key: 'SELF_REVIEW', label: t('appraisals.packet.self_evaluation'), icon: UserCheck },
    { key: 'MANAGER_REVIEW', label: t('appraisals.packet.manager_assessment'), icon: ShieldCheck },
    { key: 'FINAL_REVIEW', label: t('appraisals.packet.executive_signoff'), icon: Award },
  ];

  useEffect(() => { fetchPacket(); }, [packetId]);

  const fetchPacket = async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s circuit breaker
      
      const res = await api.get(`/appraisals/packet/${packetId}`, { 
        signal: controller.signal,
        params: { _t: Date.now() }
      });
      clearTimeout(timeoutId);
      
      if (!res.data) throw new Error('Institutional vault returned an empty docket.');
      setPacket(res.data);
    } catch (err: any) {
      console.error('[AppraisalSync] Critical Sync Failure:', err);
      
      if (err.response?.status === 404) {
        toast.error('Appraisal Packet Decommissioned');
        navigate('/performance/appraisals');
        return;
      }

      const isTimeout = err.name === 'AbortError' || err.code === 'ECONNABORTED';
      if (isTimeout) {
        setFetchError('Synchronization timed out. The institutional vault is non-responsive.');
      } else {
        setFetchError(err.response?.data?.error || `Failed to establish connection: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHardSync = () => {
    setLoading(true);
    setPacket(null);
    setFetchError(null);
    setTimeout(fetchPacket, 500);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/appraisals/packet/${packetId}`);
      toast.success('Appraisal packet deleted.');
      navigate('/performance/appraisals');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Deletion failed');
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSubmitReview = async (formData: any) => {
    try {
      await api.post(`/appraisals/review/${packetId}`, formData);
      toast.success('Review submitted successfully.');
      fetchPacket();
    } catch (err: any) {
      const errMsg = err.response?.data?.error;
      toast.error(typeof errMsg === 'string' ? errMsg : 'Submission failed');
    }
  };

  const handleUpdatePacket = async (formData: any) => {
    try {
      await api.patch(`/appraisals/packet/${packetId}`, formData);
      toast.success('Packet configuration updated.');
      fetchPacket();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const handleResolveDispute = async () => {
    setIsCalibrationModalOpen(true);
  };

  const handleFinalArbitration = async (data: any) => {
    setFinalizing(true);
    try {
      await api.post(`/appraisals/final-verdict`, { 
        packetId, 
        ...data 
      });
      toast.success('Appraisal finalized and docket sealed.');
      setIsCalibrationModalOpen(false);
      fetchPacket();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const handleRaiseDispute = async () => {
     const reason = window.prompt('State the reason for your dispute:');
     if (!reason) return;
     try {
        await api.post(`/appraisals/packet/${packetId}/dispute`, { reason });
        toast.success('Dispute raised.');
        fetchPacket();
     } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to raise dispute');
     }
  };

  const [exporting, setExporting] = useState(false);
  const handlePrint = async () => {
    setExporting(true);
    try {
      const response = await api.get(`/export/appraisal/${packetId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `appraisal-${packetId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-12">
          <div className="w-32 h-32 rounded-[3.5rem] border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="text-[var(--primary)] animate-pulse" size={40} />
          </div>
        </div>
        <div className="space-y-6 max-w-sm mx-auto">
          <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{t('performance.establishing_sync')}</h2>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] leading-relaxed">
            Establishing secure encrypted handshake with institutional vault for packet <span className="text-[var(--primary)]">#{packetId?.slice(-8)}</span>
          </p>
          
          <div className="pt-8 space-y-4">
             <button onClick={handleHardSync} className="w-full h-14 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-[var(--primary)]/40 hover:scale-[1.02] transition-all">
                Execute Hard Re-Sync
             </button>
             <button onClick={() => navigate('/performance/appraisals')} className="w-full h-14 rounded-2xl border border-[var(--border-subtle)] text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest hover:bg-[var(--bg-elevated)] transition-all">
                Return to Dashboard
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
        <div className="nx-card p-12 max-w-xl text-center border-[var(--error)]/20 shadow-2xl shadow-[var(--error)]/5">
           <AlertTriangle size={60} className="text-[var(--error)] mx-auto mb-8" />
           <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-4 text-[var(--error)]">Sync Link Interrupted</h2>
           <p className="text-[var(--text-secondary)] mb-10 leading-relaxed font-medium">{fetchError}</p>
           
           <div className="flex flex-col gap-4">
              <button onClick={handleHardSync} className="w-full h-14 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-[var(--primary)]/20">Protocol Restrike</button>
              <button onClick={() => navigate('/performance/appraisals')} className="w-full h-14 border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--bg-elevated)]">Abort & Return</button>
           </div>
        </div>
      </div>
    );
  }

  if (!packet) return (
     <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center justify-center p-6">
        <ClipboardCheck size={64} className="text-[var(--text-muted)] mb-6 opacity-20" />
        <h2 className="text-xl font-black text-[var(--text-muted)] uppercase tracking-widest">Docket Non-Existent</h2>
        <button onClick={() => navigate('/performance/appraisals')} className="mt-8 text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.3em] hover:underline underline-offset-8">Return to Performance Center</button>
     </div>
  );

  const currentStageIndex = stages.findIndex(s => s.key === packet.currentStage);
  const isMyTurn = (
    (packet.currentStage === 'SELF_REVIEW' && packet.employeeId == user.id) ||
    (packet.currentStage === 'MANAGER_REVIEW' && (packet.supervisorId == user.id || packet.managerId == user.id)) ||
    (packet.currentStage === 'FINAL_REVIEW' && (packet.finalReviewerId == user.id || packet.hrReviewerId == user.id || rank >= 85))
  );
  const isCompleted = packet.currentStage === 'COMPLETED';
  const needsFinalSignoff = packet.currentStage === 'FINAL_REVIEW' && rank >= 90;
  const isMDArbiter = rank >= 90;

  return (
    <div className="space-y-10 page-enter pb-32">
       <PageHeader
          title={`${t('appraisals.packet.title')}: ${packet.employee?.fullName}`}
          description={`${packet.cycle?.title} · Current: ${packet.currentStage}`}
          icon={ClipboardCheck}
          variant="indigo"
        />

      <div className="nx-card p-10">
        <div className="flex items-center justify-between relative max-w-4xl mx-auto">
          <div className="absolute top-5 left-10 right-10 h-[2px] bg-[var(--border-subtle)]/30 -z-0" />
          {stages.map((stage, idx) => {
            const done = idx < currentStageIndex || isCompleted;
            const active = idx === currentStageIndex && !isCompleted;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-4 relative z-10 w-24">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-700',
                  done ? 'bg-[var(--success)] border-[var(--success)]/80 text-white shadow-lg shadow-[var(--success)]/20' :
                  active ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-2xl shadow-primary/40' :
                  'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                )}>
                  {done ? <CheckCircle size={22} /> : <stage.icon size={22} />}
                </div>
                <p className={cn('text-[9px] font-black uppercase tracking-[0.2em] text-center', active ? 'text-[var(--primary)]' : done ? 'text-[var(--success)]' : 'text-[var(--text-muted)] opacity-50')}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {needsFinalSignoff && (
        <div className="nx-card p-10 border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 bg-amber-500 text-white text-[8px] font-black uppercase tracking-tighter rounded-bl-xl shadow-lg">Calibration Phase Active</div>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
               <Scale size={32} />
            </div>
            <div>
              <p className="font-black text-amber-600 text-[11px] uppercase tracking-[0.2em] mb-2">Institutional Arbitration Authority</p>
              <p className="text-sm font-bold text-[var(--text-primary)] max-w-xl leading-relaxed">
                As the Managing Director, you are tasked with the final calibration of this appraisal. Your verdict will form the official institutional record.
              </p>
            </div>
          </div>
          <button onClick={() => handleResolveDispute()} className="bg-amber-500 text-white px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/30 hover:scale-105 transition-all">
            Initiate Final Calibration
          </button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-10">
        <div className="flex-1">
          <div className="flex gap-2 mb-8 p-1.5 bg-[var(--bg-elevated)]/50 rounded-2xl border border-[var(--border-subtle)] w-fit backdrop-blur-sm">
            {(['REVIEW', 'HISTORY', 'MANAGEMENT'] as const).filter(t_tab => t_tab !== 'MANAGEMENT' || canManage).map(t_tab => (
              <button key={t_tab} onClick={() => setActiveTab(t_tab)}
                className={cn('px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', activeTab === t_tab ? 'bg-[var(--bg-card)] text-[var(--primary)] shadow-md border border-[var(--border-subtle)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
              >{t_tab}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">
             {activeTab === 'REVIEW' ? (
                <motion.div key="review" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-20 }} className="nx-card p-10">
                    {isMyTurn && !isCompleted ? (
                       isMDArbiter && packet.currentStage === 'FINAL_REVIEW' ? (
                         <div className="space-y-12">
                            <div className="p-10 rounded-[2.5rem] bg-amber-500/10 border border-amber-500/20 text-center space-y-6">
                               <div className="w-20 h-20 rounded-[2rem] bg-amber-500/20 flex items-center justify-center text-amber-600 mx-auto border border-amber-500/30">
                                  <Scale size={40} />
                               </div>
                               <div>
                                  <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">Strategic Calibration Ready</h3>
                                  <p className="text-sm text-[var(--text-muted)] font-medium max-w-md mx-auto leading-relaxed mt-2">
                                     The evaluation has passed through Self and Manager phases. You are now required to certify the weighted result and issue a final verdict.
                                  </p>
                               </div>
                               <button 
                                  onClick={() => handleResolveDispute()}
                                  className="mx-auto block bg-amber-500 text-white px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
                               >
                                  Open Calibration Dashboard
                               </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="nx-card p-8 bg-[var(--bg-elevated)]/30 border-dashed">
                                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Self Evaluation Summary</p>
                                  <div className="text-4xl font-black text-[var(--text-primary)] mb-2">
                                     {packet.reviews?.find((r: any) => r.reviewStage === 'SELF_REVIEW')?.overallRating || 0}%
                                  </div>
                                  <p className="text-xs text-[var(--text-secondary)] italic font-medium leading-relaxed">
                                     "{packet.reviews?.find((r: any) => r.reviewStage === 'SELF_REVIEW')?.summary?.slice(0, 150)}..."
                                  </p>
                               </div>
                               <div className="nx-card p-8 bg-amber-500/5 border-amber-500/10 border-dashed">
                                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Manager Recommendation</p>
                                  <div className="text-4xl font-black text-amber-600 mb-2">
                                     {packet.reviews?.find((r: any) => r.reviewStage === 'MANAGER_REVIEW')?.overallRating || 0}%
                                  </div>
                                  <p className="text-xs text-amber-600/80 italic font-medium leading-relaxed">
                                     "{packet.reviews?.find((r: any) => r.reviewStage === 'MANAGER_REVIEW')?.summary?.slice(0, 150)}..."
                                  </p>
                               </div>
                            </div>
                         </div>
                       ) : (
                         <AppraisalReviewForm stage={packet.currentStage} onSubmit={handleSubmitReview} />
                       )
                    ) : (
                      <div className="py-24 flex flex-col items-center text-center space-y-6">
                         <div className="w-20 h-20 rounded-full bg-[var(--warning)]/5 flex items-center justify-center border border-[var(--warning)]/10 text-[var(--warning)]">
                             {isCompleted ? <Award size={40} className="text-[var(--success)]" /> : <Clock size={40} />}
                         </div>
                         <div className="space-y-2">
                            <h3 className="text-lg font-black uppercase tracking-widest text-[var(--text-primary)]">{isCompleted ? 'Institutional Dossier Locked' : 'Awaiting Peer Assessment'}</h3>
                            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-widest max-w-sm mx-auto">This docket is currently awaiting other participants or has reached its final state.</p>
                         </div>
                      </div>
                   )}
                </motion.div>
             ) : activeTab === 'MANAGEMENT' ? (
                <motion.div key="mgmt" initial={{ opacity:0 }} animate={{ opacity:1 }} className="nx-card p-10">
                   <AppraisalManagementForm packet={packet} onUpdate={handleUpdatePacket} onDelete={() => setIsDeleteModalOpen(true)} isDeleting={deleting} />
                </motion.div>
             ) : (
                <motion.div key="history" initial={{ opacity:0 }} animate={{ opacity:1 }} className="space-y-6">
                   {packet.reviews?.map((rev: any) => (
                      <div key={rev.id} className="nx-card p-8">
                         <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-black uppercase">{rev.reviewer?.fullName?.charAt(0)}</div>
                               <div>
                                  <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest">{rev.reviewStage}</p>
                                  <h4 className="text-md font-black text-[var(--text-primary)] uppercase">{rev.reviewer?.fullName}</h4>
                               </div>
                            </div>
                            <div className="text-right">
                               <span className="text-3xl font-black text-[var(--text-primary)]">{rev.overallRating}%</span>
                            </div>
                         </div>
                         <div className="p-6 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] text-[12px] leading-relaxed italic text-[var(--text-secondary)]">"{rev.summary}"</div>
                      </div>
                   ))}
                </motion.div>
             )}
          </AnimatePresence>
        </div>

        <div className="w-full xl:w-96 space-y-8">
           <div className="nx-card p-8 space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] border-b border-[var(--border-subtle)]/30 pb-4">Institutional Docket Chain</p>
              {[
                { label: 'Personnel Node', name: packet.employee?.fullName },
                { label: 'Supervisor Node', name: packet.supervisor?.fullName || 'N/A' },
                { label: 'Management Node', name: packet.manager?.fullName || 'N/A' },
                { label: 'Verification Hook', name: packet.hrReviewer?.fullName || 'Awaiting Assign' }
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{p.label}</p>
                   <p className="text-[11px] font-bold text-[var(--text-primary)]">{p.name || 'Not Configured'}</p>
                </div>
              ))}
           </div>

           {/* Strategic Growth Tracer */}
           <div className="nx-card p-6 border-[var(--primary)]/10 bg-[var(--primary)]/5">
              <GrowthTracer employeeId={packet.employeeId} />
           </div>

           
           {isCompleted && (
              <button 
                onClick={handlePrint}
                disabled={exporting}
                className="w-full h-16 rounded-2xl bg-[var(--success)] text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-[var(--success)]/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Printer size={20} /> Generate Institutional Record (PDF)
              </button>
           )}

           {!packet.isDisputed && packet.employeeId == user.id && !isCompleted && (
              <button 
                onClick={handleRaiseDispute}
                className="w-full h-14 rounded-2xl border border-[var(--error)]/20 bg-[var(--error)]/5 text-[var(--error)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--error)]/10 transition-all flex items-center justify-center gap-2"
              >
                 Raise Institutional Contest
              </button>
           )}
        </div>
      </div>

       <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        itemName={`Packet ${packetId?.slice(-8)}`}
        loading={deleting}
      />

      <FinalizeCalibrationModal
        isOpen={isCalibrationModalOpen}
        onClose={() => setIsCalibrationModalOpen(false)}
        packet={packet}
        onFinalize={handleFinalArbitration}
        loading={finalizing}
      />
    </div>
  );
};

export default AppraisalPacketView;
