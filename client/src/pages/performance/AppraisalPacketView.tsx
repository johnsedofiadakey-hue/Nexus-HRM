import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ClipboardCheck, ShieldCheck, UserCheck, CheckCircle,
  Clock, AlertCircle, Star, Target, BookOpen,
  ThumbsUp, Zap, ChevronDown, ChevronUp, Award, Trash2,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { getStoredUser, getRankFromRole } from '../../utils/session';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import ConfirmDeleteModal from '../../components/common/ConfirmDeleteModal';

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
  1: { label: t('appraisals.packet.ratings.1'), color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  2: { label: t('appraisals.packet.ratings.2'), color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  3: { label: t('appraisals.packet.ratings.3'), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  4: { label: t('appraisals.packet.ratings.4'), color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  5: { label: t('appraisals.packet.ratings.5'), color: 'text-[var(--primary)]', bg: 'bg-primary/10 border-primary/20' },
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
  packet: any;
  onSubmit: (data: any) => void;
}> = ({ stage, packet, onSubmit }) => {
  const { t } = useTranslation();
  const COMPETENCY_FRAMEWORK = getCompetencyFramework(t);
  const RATING_LABELS = getRatingLabels(t);

  const isSelf = stage === 'SELF_REVIEW';
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [devPlan, setDevPlan] = useState('');
  const [expanded, setExpanded] = useState<string | null>('delivery');
  const [submitting, setSubmitting] = useState(false);

  const overallScore = calcOverallRating(ratings);
  const ratingInfo = RATING_LABELS[Math.round(overallScore / 20)] || RATING_LABELS[3];
  const totalRated = Object.keys(ratings).length;
  const totalCompetencies = COMPETENCY_FRAMEWORK.reduce((a, c) => a + c.competencies.length, 0);

  const handleSubmit = async () => {
    if (totalRated < totalCompetencies) {
      toast.error(`Please rate all ${totalCompetencies} competencies before submitting.`);
      return;
    }
    if (!summary.trim()) {
      toast.error('Please provide an overall summary comment.');
      return;
    }

    setSubmitting(true);
    const competencyScores = COMPETENCY_FRAMEWORK.map(cat => ({
      category: cat.category,
      competencies: cat.competencies.map(c => ({
        id: c.id, name: c.name, rating: ratings[c.id] || 0, comment: comments[c.id] || ''
      })),
      categoryAverage: cat.competencies.reduce((sum, c) => sum + (ratings[c.id] || 0), 0) / cat.competencies.length,
    }));

    await onSubmit({
      overallRating: overallScore,
      summary,
      strengths,
      weaknesses: improvements,
      developmentNeeds: devPlan,
      responses: JSON.stringify({ competencyScores, ratings, itemComments: comments }),
    });
    setSubmitting(false);
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-1">
          {isSelf ? t('appraisals.packet.self_evaluation') : t('appraisals.packet.manager_assessment')}
        </h2>
        <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-widest">
          {isSelf
            ? t('appraisals.packet.summary_placeholder_self')
            : t('appraisals.packet.summary_placeholder_manager', { name: packet.employee?.fullName })}
        </p>
      </div>

      {/* Overall Score Preview */}
      <div className="nx-card p-6 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">{t('appraisals.packet.overall_score')}</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-[var(--text-primary)]">{overallScore}<span className="text-xl text-[var(--text-muted)]">%</span></span>
            {overallScore > 0 && (
              <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border', ratingInfo.bg, ratingInfo.color)}>
                {ratingInfo.label}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">{t('appraisals.packet.progress')}</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">{totalRated}/{totalCompetencies} {t('appraisals.packet.rated')}</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
          animate={{ width: `${overallScore}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Competency Categories */}
      {COMPETENCY_FRAMEWORK.map(cat => (
        <div key={cat.id} className="nx-card overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
            className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>
                <cat.icon size={18} style={{ color: cat.color }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-[var(--text-primary)]">{cat.category}</p>
                <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-widest">
                  {cat.competencies.filter(c => ratings[c.id] > 0).length}/{cat.competencies.length} {t('appraisals.packet.rated')}
                </p>
              </div>
            </div>
            {expanded === cat.id ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>

          <AnimatePresence>
            {expanded === cat.id && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 space-y-6 border-t border-white/5 pt-6">
                  {cat.competencies.map(comp => (
                    <div key={comp.id} className="space-y-3">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{comp.name}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{comp.desc}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5].map(n => {
                          const info = RATING_LABELS[n];
                          const selected = ratings[comp.id] === n;
                          return (
                            <button
                              key={n}
                              onClick={() => setRatings(r => ({ ...r, [comp.id]: n }))}
                              className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold border transition-all',
                                selected ? `${info.bg} ${info.color} scale-105 shadow-lg` : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                              )}
                            >
                              <Star size={12} className={selected ? 'fill-current' : ''} /> {n} — {info.label}
                            </button>
                          );
                        })}
                      </div>
                      <textarea 
                        className="nx-input text-[11px] bg-[var(--bg-card)] min-h-[60px] py-2"
                        value={comments[comp.id] || ''}
                        onChange={e => setComments(c => ({ ...c, [comp.id]: e.target.value }))}
                        placeholder={t('common.add_comment_placeholder')}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Written Sections */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {t('appraisals.packet.summary_label')} <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={4}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder={isSelf
              ? t('appraisals.packet.summary_placeholder_self')
              : t('appraisals.packet.summary_placeholder_manager', { name: packet.employee?.fullName })}
            className="nx-input text-sm leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t('appraisals.packet.strengths_label')}</label>
            <textarea
              rows={3}
              value={strengths}
              onChange={e => setStrengths(e.target.value)}
              placeholder={t('appraisals.packet.strengths_placeholder')}
              className="nx-input text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">{t('appraisals.packet.improvements_label')}</label>
            <textarea
              rows={3}
              value={improvements}
              onChange={e => setImprovements(e.target.value)}
              placeholder={t('appraisals.packet.improvements_placeholder')}
              className="nx-input text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">{t('appraisals.packet.dev_plan_label')}</label>
          <textarea
            rows={3}
            value={devPlan}
            onChange={e => setDevPlan(e.target.value)}
            placeholder={t('appraisals.packet.dev_plan_placeholder')}
            className="nx-input text-sm"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || totalRated < totalCompetencies || !summary.trim()}
        className={cn(
          "w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all",
          totalRated === totalCompetencies && summary.trim()
            ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:bg-primary-dark'
            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-subtle)]'
        )}
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><CheckCircle size={18} /> {t('appraisals.packet.submit_review', { stage: isSelf ? t('appraisals.packet.self_evaluation') : t('appraisals.packet.manager_assessment') })}</>
        )}
      </button>

      {totalRated < totalCompetencies && (
        <p className="text-center text-[10px] text-amber-400 font-bold uppercase tracking-widest">
          {totalCompetencies - totalRated} {t('appraisals.packet.competencies_remaining')}
        </p>
      )}
    </div>
  );
};

// ── MANAGEMENT FORM ───────────────────────────────────────────────────────────
const AppraisalManagementForm: React.FC<{
  packet: any;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  isDeleting: boolean;
}> = ({ packet, onUpdate, onDelete, isDeleting }) => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({
    supervisorId: packet.supervisorId || '',
    matrixSupervisorId: packet.matrixSupervisorId || '',
    managerId: packet.managerId || '',
    hrReviewerId: packet.hrReviewerId || '',
    finalReviewerId: packet.finalReviewerId || '',
    currentStage: packet.currentStage,
    status: packet.status,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/users').then(res => setEmployees(Array.isArray(res.data) ? res.data : []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onUpdate(form);
    setSaving(false);
  };

  const STAGES = [
    'SELF_REVIEW', 'MANAGER_REVIEW', 'COMPLETED', 'CANCELLED'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-1">{t('common.settings')}</h2>
        <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-widest">{t('appraisals.packet.institutional_desc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('employees.roles.MANAGER')}</label>
          <div className="space-y-3">
            {[
              { label: 'Supervisor', key: 'supervisorId' },
              { label: 'Matrix Manager', key: 'matrixSupervisorId' },
              { label: 'Department Manager', key: 'managerId' },
              { label: 'HR Reviewer', key: 'hrReviewerId' },
              { label: 'Final Approver', key: 'finalReviewerId' },
            ].map(row => (
              <div key={row.key} className="space-y-1">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{row.label}</p>
                <select 
                  className="nx-input text-xs"
                  value={form[row.key as keyof typeof form]} 
                  onChange={e => setForm({...form, [row.key]: e.target.value})}
                >
                  <option value="">-- None --</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName} — {emp.jobTitle}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Current Stage</label>
            <select className="nx-input text-xs" value={form.currentStage} onChange={e => setForm({...form, currentStage: e.target.value})}>
              {STAGES.map(s => (
                <option key={s} value={s}>
                  {s === 'SELF_REVIEW' ? t('appraisals.packet.self_evaluation') : 
                   s === 'MANAGER_REVIEW' ? t('appraisals.packet.manager_assessment') : 
                   s === 'FINAL_REVIEW' ? t('appraisals.packet.executive_signoff') : 
                   s === 'COMPLETED' ? t('common.done') : t('common.discard')}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('common.status')}</label>
            <select className="nx-input text-xs" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="OPEN">{t('common.active')}</option>
              <option value="COMPLETED">{t('common.done')}</option>
              <option value="CANCELLED">{t('common.discard')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 pt-4">
        <button
          type="submit"
          disabled={saving || isDeleting}
          className="btn-primary flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShieldCheck size={16} /> {t('common.save_changes')}</>}
        </button>

        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          disabled={saving || isDeleting}
          className="px-8 py-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"
        >
          {isDeleting ? <div className="w-4 h-4 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" /> : <><Trash2 size={16} /> {t('common.discard')}</>}
        </button>
      </div>
    </form>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const AppraisalPacketView: React.FC = () => {
  const { packetId } = useParams<{ packetId: string }>();
  const [packet, setPacket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REVIEW' | 'HISTORY' | 'MANAGEMENT'>('REVIEW');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [syncStartTime] = useState<number>(Date.now());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { t } = useTranslation();
  const RATING_LABELS = getRatingLabels(t);
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
      setFetchError(null);
      console.log(`[AppraisalSync] Initiating link with docket ${packetId}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await api.get(`/appraisals/packet/${packetId}`, { 
        signal: controller.signal,
        params: { _t: Date.now() }
      });
      clearTimeout(timeoutId);
      
      if (!res.data) throw new Error('Institutional vault returned an empty docket.');
      setPacket(res.data);
      console.log(`[AppraisalSync] Link established successfully.`);
    } catch (err: any) {
      console.error('[AppraisalSync] Critical Sync Failure:', err);
      const isTimeout = err.name === 'AbortError' || err.code === 'ECONNABORTED';
      
      if (isTimeout) {
        setFetchError('Synchronization timed out. The institutional vault is non-responsive or under heavy load.');
      } else {
        setFetchError(err.response?.data?.error || `Failed to establish connection: ${err.message}`);
      }
      toast.error('Appraisal Sync Interrupted');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/appraisals/packet/${packetId}`);
      toast.success('Appraisal packet deleted.');
      window.location.href = '/performance/appraisals';
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Deletion failed');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
    const isDisputed = packet.isDisputed || packet.gapDetected;
    
    if (!isDisputed) {
      if (!confirm('Are you ready to perform the standard institutional sign-off and close this appraisal docket?')) return;
      try {
        await api.post(`/appraisals/final-verdict`, { packetId });
        toast.success('Appraisal finalized and closed.');
        fetchPacket();
        return;
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to finalize appraisal');
        return;
      }
    }

    const resolution = window.prompt('Provide final arbitration resolution (internal note):', 'Resolved after institutional review.');
    if (!resolution) return;
    const score = window.prompt('Provide final arbitrated score (%) [0-100]:', '70');
    const verdict = window.prompt('Provide final institutional verdict (official statement):');
    
    try {
      await api.post(`/appraisals/packet/${packetId}/resolve`, { 
        resolution, 
        finalScore: score ? Number(score) : undefined,
        finalVerdict: verdict || undefined
      });
      toast.success('Dispute resolved and docket closed.');
      fetchPacket();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resolve dispute');
    }
  };

  const handleRaiseDispute = async () => {
     const reason = window.prompt('Please state the reason for your dispute:');
     if (!reason) return;
     try {
        await api.post(`/appraisals/packet/${packetId}/dispute`, { reason });
        toast.success('Dispute raised successfully. HR has been notified.');
        fetchPacket();
     } catch (err: any) {
        toast.error(err.response?.data?.error || 'Failed to raise dispute');
     }
  };

  const handleAcceptGaps = async () => {
     if (!window.confirm('By accepting, you acknowledge the supervisor reviews and agree to move to the next stage of the appraisal without a formal dispute.')) return;
     try {
        await api.patch(`/appraisals/packet/${packetId}`, { gapDetected: false });
        toast.success('Reviews accepted. The appraisal will proceed.');
        fetchPacket();
     } catch (err: any) {
        toast.error('Failed to accept reviews.');
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 page-enter">
      <div className="relative">
        <div className="w-20 h-20 rounded-[2rem] border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[var(--primary)]">
          <Clock size={24} className="animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Syncing Appraisal Packet</h3>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Establishing secure link with institutional vault...</p>
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[var(--bg-main)]">
      <div className="nx-card p-12 max-w-xl text-center border-red-500/20 shadow-2xl shadow-red-500/5">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
           <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-4">Docket Link Interrupted</h2>
        <p className="text-[var(--text-secondary)] mb-10 leading-relaxed font-medium">
          {fetchError}
        </p>
        
        {/* 🛠️ Diagnostic Overlay */}
        <div className="mb-10 p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-left">
           <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">System Trace Data</p>
           <div className="space-y-3 font-mono text-[11px] text-[var(--text-secondary)]">
              <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-2">
                 <span>DOCKET_ID:</span>
                 <span className="text-[var(--text-primary)]">{packetId}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border-subtle)]/50 pb-2">
                 <span>AUTH_ID:</span>
                 <span className="text-[var(--text-primary)]">{getStoredUser()?.id}</span>
              </div>
              <div className="flex justify-between">
                 <span>ORG_CONTEXT:</span>
                 <span className="text-[var(--text-primary)]">{getStoredUser()?.organizationId || 'DEFAULT'}</span>
              </div>
           </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => fetchPacket()}
            className="w-full h-14 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-all"
          >
            Force Re-Sync Attempt
          </button>
          <button 
            onClick={() => window.location.href = '/performance'}
            className="w-full h-14 border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--bg-elevated)] transition-all"
          >
            Return to Terminal
          </button>
        </div>
      </div>
    </div>
  );

  if (!packet) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-20 h-20 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
        <ClipboardCheck size={40} />
      </div>
      <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Docket not found or access denied.</p>
    </div>
  );

  const currentStageIndex = stages.findIndex(s => s.key === packet.currentStage);
  const isMyTurn = (
    (packet.currentStage === 'SELF_REVIEW' && packet.employeeId === user.id) ||
    (packet.currentStage === 'MANAGER_REVIEW' && (packet.supervisorId === user.id || packet.managerId === user.id)) ||
    (packet.currentStage === 'FINAL_REVIEW' && (packet.finalReviewerId === user.id || packet.hrReviewerId === user.id || rank >= 85))
  );
  const isCompleted = packet.currentStage === 'COMPLETED';
  const needsFinalSignoff = packet.currentStage === 'FINAL_REVIEW' && (rank >= 80);

  return (
    <div className="space-y-8 page-enter pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader
          title={`${t('appraisals.packet.title')}: ${packet.employee?.fullName}`}
          description={`${packet.cycle?.title} · ${t('appraisals.stage')}: ${packet.currentStage === 'SELF_REVIEW' ? t('appraisals.packet.self_evaluation') : packet.currentStage === 'MANAGER_REVIEW' ? t('appraisals.packet.manager_assessment') : t('appraisals.packet.executive_signoff')}`}
          icon={ClipboardCheck}
          variant="indigo"
        />
        {isCompleted && (
          <button 
            onClick={handlePrint}
            disabled={exporting}
            className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs flex-shrink-0"
          >
            {exporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Award size={18} /> {t('common.export_pdf')}</>}
          </button>
        )}
      </div>

      {/* Stage Progress */}
      <div className="nx-card p-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-10 right-10 h-0.5 bg-white/5 -z-0" />
          {stages.map((stage, idx) => {
            const done = idx < currentStageIndex;
            const active = idx === currentStageIndex && !isCompleted;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-2 relative z-10">
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500',
                  done ? 'bg-emerald-500 border-emerald-400 text-white' :
                  active ? 'bg-primary border-primary/50 text-white shadow-lg shadow-primary/40 ring-4 ring-primary/10' :
                  'bg-slate-800 border-white/10 text-slate-600'
                )}>
                  {done ? <CheckCircle size={18} /> : <stage.icon size={18} />}
                </div>
                <p className={cn('text-[9px] font-black uppercase tracking-widest hidden md:block', active ? 'text-primary-light' : done ? 'text-emerald-400' : 'text-slate-600')}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {needsFinalSignoff && (
        <div className="nx-card p-8 border-primary/20 bg-primary/5 flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-light">
               <ShieldCheck size={24} />
            </div>
            <div>
              <p className="font-black text-primary-light text-[11px] uppercase tracking-[0.2em] mb-1">{t('appraisals.packet.institutional_signoff')}</p>
              <p className="text-sm font-bold text-[var(--text-primary)] max-w-lg leading-relaxed">
                {t('appraisals.packet.institutional_desc')}
              </p>
            </div>
          </div>
          <button 
            onClick={() => handleResolveDispute()} 
            className="btn-primary px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30"
          >
            {t('appraisals.packet.finalize_docket')}
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="nx-card p-8 border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><CheckCircle size={24} /></div>
          <div>
            <p className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-widest">Appraisal Completed</p>
            <p className="text-[11px] text-emerald-600/60 uppercase tracking-widest font-semibold">All review stages finalised.</p>
          </div>
        </div>
      )}

      {packet.gapDetected && !packet.isDisputed && (
        <div className="nx-card p-8 border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
               <AlertCircle size={24} />
            </div>
            <div>
              <p className="font-black text-amber-500 text-[11px] uppercase tracking-[0.2em] mb-1">{t('appraisals.packet.gap_detected')}</p>
              <p className="text-sm font-bold text-[var(--text-primary)] max-w-lg leading-relaxed">
                {t('appraisals.packet.gap_desc')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
             <button onClick={handleAcceptGaps} className="px-6 py-4 rounded-xl border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                {t('appraisals.packet.accept_reviews')}
             </button>
             <button onClick={handleRaiseDispute} className="btn-primary bg-rose-500 hover:bg-rose-600 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20">
                {t('appraisals.packet.raise_dispute')}
             </button>
          </div>
        </div>
      )}

      {packet.isDisputed && (
        <div className="nx-card p-8 border-rose-500/20 bg-rose-500/5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
               <AlertCircle size={24} />
            </div>
            <div>
              <p className="font-black text-rose-500 text-[11px] uppercase tracking-[0.2em] mb-1">{t('appraisals.packet.dispute_raised')}</p>
              <p className="text-sm font-bold text-[var(--text-primary)] max-w-lg leading-relaxed">"{packet.disputeReason}"</p>
            </div>
          </div>
          {rank >= 80 && (
             <button onClick={handleResolveDispute} className="btn-primary bg-rose-500 hover:bg-rose-600 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 relative z-10">
                {t('appraisals.packet.resolve_dispute')}
             </button>
          )}
        </div>
      )}

      {packet.disputeResolution && (
        <div className="nx-card p-8 border-emerald-500/20 bg-emerald-500/5 flex flex-col md:flex-row items-start gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full -ml-16 -mt-16 blur-3xl" />
          <div className="flex items-start gap-4 flex-1 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
               <ShieldCheck size={20} />
            </div>
            <div>
              <p className="font-black text-emerald-500 text-[9px] uppercase tracking-[0.2em] mb-1">{t('appraisals.packet.arbitration_verdict')}</p>
              <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed">{packet.disputeResolution}</p>
              {packet.finalVerdict && <p className="text-xs text-[var(--text-secondary)] mt-1 italic">"{packet.finalVerdict}"</p>}
              <p className="text-[9px] text-[var(--text-muted)] mt-2 font-bold uppercase tracking-widest">{t('appraisals.packet.arbitrated_by')}: {packet.resolvedBy?.fullName || 'HR/MD'} {t('appraisals.packet.on')} {format(new Date(packet.disputeResolvedAt), 'PPp')}</p>
            </div>
          </div>
          {packet.finalScore != null && (
            <div className="text-right flex flex-col items-end relative z-10">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Arbitrated Score</p>
              <p className="text-4xl font-extrabold text-[var(--text-primary)]">{packet.finalScore}<span className="text-xl text-[var(--text-muted)] ml-1">%</span></p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1">
          <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] w-fit">
            {(['REVIEW', 'HISTORY', 'MANAGEMENT'] as const).filter(t_tab => t_tab !== 'MANAGEMENT' || canManage).map(t_tab => (
              <button key={t_tab} onClick={() => setActiveTab(t_tab)}
                className={cn('px-6 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all', activeTab === t_tab ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
              >{t_tab === 'REVIEW' ? t('dashboard.active_reviews') : t_tab === 'HISTORY' ? t('settings.audit_logs') : t('common.management')}</button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'REVIEW' ? (
              <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="nx-card p-8">
                {isMyTurn && !isCompleted ? (
                  <AppraisalReviewForm stage={packet.currentStage} packet={packet} onSubmit={handleSubmitReview} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                      {isCompleted ? <CheckCircle size={32} className="text-emerald-400" /> : <Clock size={32} />}
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
                      {isCompleted ? t('performance.all_finalized') : t('common.awaiting_approval')}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs">
                      {isCompleted ? t('appraisals.packet.institutional_desc') : t('appraisals.no_active_desc')}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'MANAGEMENT' ? (
              <motion.div key="management" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="nx-card p-8">
                {activeTab === 'MANAGEMENT' && canManage && (
                  <AppraisalManagementForm 
                    packet={packet} 
                    onUpdate={handleUpdatePacket} 
                    onDelete={() => setShowDeleteConfirm(true)}
                    isDeleting={deleting}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {packet.reviews?.length > 0 ? packet.reviews.map((rev: any) => {
                  let parsed: any = null;
                  try { parsed = JSON.parse(rev.responses || '{}'); } catch {}
                  return (
                    <div key={rev.id} className="nx-card p-6 hover:border-[var(--primary)]/20 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary-light">
                            {rev.reviewer?.fullName?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest">
                              {rev.reviewStage === 'SELF_REVIEW' ? t('appraisals.packet.self_evaluation') : t('appraisals.packet.manager_assessment')}
                            </p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{rev.reviewer?.fullName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {rev.overallRating != null && (
                            <span className="text-2xl font-bold text-[var(--text-primary)]">{rev.overallRating}<span className="text-sm text-[var(--text-muted)]">%</span></span>
                          )}
                           <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            {rev.submittedAt ? format(new Date(rev.submittedAt), 'dd MMM yyyy') : 'Pending'}
                          </p>
                        </div>
                      </div>

                      {rev.summary && (
                        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-subtle)] mb-4">
                           <p className="text-xs text-[var(--text-secondary)] leading-relaxed">"{rev.summary}"</p>
                        </div>
                      )}

                      {parsed?.competencyScores && (
                        <div className="space-y-4 mt-6">
                          {parsed.competencyScores.map((cat: any) => (
                            <div key={cat.category} className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">{cat.category}</p>
                                  <p className="text-[10px] font-bold text-[var(--text-muted)]">Avg: {Number(cat.categoryAverage * 20).toFixed(0)}%</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {cat.competencies.map((comp: any) => (
                                    <div key={comp.id} className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-subtle)] space-y-1">
                                       <div className="flex justify-between items-center">
                                          <p className="text-[11px] font-bold text-[var(--text-primary)]">{comp.name}</p>
                                          <div className={cn("px-2 py-0.5 rounded text-[9px] font-black", RATING_LABELS[comp.rating]?.bg, RATING_LABELS[comp.rating]?.color)}>
                                            {comp.rating}
                                          </div>
                                       </div>
                                       {comp.comment && <p className="text-[10px] italic text-[var(--text-muted)]">"{comp.comment}"</p>}
                                    </div>
                                  ))}
                                </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(rev.strengths || rev.weaknesses) && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {rev.strengths && <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10"><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">{t('appraisals.packet.strengths_label')}</p><p className="text-[11px] text-[var(--text-secondary)]">{rev.strengths}</p></div>}
                          {rev.weaknesses && <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10"><p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">{t('appraisals.packet.improvements_label')}</p><p className="text-[11px] text-[var(--text-secondary)]">{rev.weaknesses}</p></div>}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-20 text-[var(--text-muted)] uppercase tracking-[0.2em] font-black text-[10px]">{t('common.no_data')}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="w-full xl:w-80 space-y-6">
          <div className="nx-card p-6 space-y-5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Participant Chain</p>
            {[
              { label: 'Employee', id: packet.employeeId, name: packet.employee?.fullName },
              { label: 'Supervisor', id: packet.supervisorId },
              { label: 'Matrix Review', id: packet.matrixSupervisorId },
              { label: 'Manager', id: packet.managerId },
              { label: 'HR Review', id: packet.hrReviewerId },
              { label: 'Final Review', id: packet.finalReviewerId },
            ].filter(p => p.id).map(p => (
              <div key={p.label} className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{p.label}</p>
                 <p className="text-[11px] font-bold text-[var(--text-primary)]">{p.name || p.id?.slice(0, 8) + '…'}</p>
              </div>
            ))}
          </div>

          <div className="nx-card p-6 border-amber-500/10 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="text-amber-500" size={16} />
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Notice</p>
            </div>
            <p className="text-[10px] text-amber-600/80 leading-relaxed">
              Reviews are immutable once submitted. All ratings and comments are stored permanently.
            </p>
            {!packet.isDisputed && packet.employeeId === user.id && packet.reviews.some((r: any) => r.reviewStage === 'SUPERVISOR_REVIEW') && (
               <button 
                  onClick={handleRaiseDispute}
                  className="mt-4 w-full py-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2"
               >
                 <AlertCircle size={14} /> Raise Contest/Dispute
               </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        itemName={packet.user?.fullName}
        loading={deleting}
      />
    </div>
  );
};

export default AppraisalPacketView;
