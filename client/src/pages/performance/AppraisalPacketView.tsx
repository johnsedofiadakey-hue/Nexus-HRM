import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ClipboardCheck, ShieldCheck, UserCheck, CheckCircle,
  Clock, AlertCircle, Star, Target, BookOpen,
  ThumbsUp, Zap, BarChart2, ChevronDown, ChevronUp, Award, Users
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { getStoredUser } from '../../utils/session';
import { format } from 'date-fns';

// ── COMPETENCY FRAMEWORK (world-class SaaS pattern) ───────────────────────────
// Modelled after BambooHR / Lattice / Culture Amp appraisal frameworks
const COMPETENCY_FRAMEWORK = [
  {
    id: 'delivery',
    category: 'Results & Delivery',
    icon: Target,
    color: '#6366f1',
    competencies: [
      { id: 'goal_achievement', name: 'Goal Achievement', desc: 'Consistently meets or exceeds assigned targets and KPIs within the given timeframe.' },
      { id: 'quality_of_work', name: 'Quality of Work', desc: 'Produces accurate, thorough work that meets or exceeds quality standards.' },
      { id: 'productivity', name: 'Productivity & Efficiency', desc: 'Manages time and resources effectively; achieves high output without sacrificing quality.' },
    ],
  },
  {
    id: 'skills',
    category: 'Technical & Professional Skills',
    icon: BookOpen,
    color: '#10b981',
    competencies: [
      { id: 'job_knowledge', name: 'Job Knowledge', desc: 'Demonstrates deep understanding of job requirements and applies relevant expertise.' },
      { id: 'problem_solving', name: 'Problem Solving', desc: 'Identifies issues, analyses root causes, and implements practical solutions.' },
      { id: 'innovation', name: 'Innovation & Initiative', desc: 'Proactively seeks improvements and brings new ideas that add value to the team.' },
    ],
  },
  {
    id: 'people',
    category: 'People & Collaboration',
    icon: ThumbsUp,
    color: '#f59e0b',
    competencies: [
      { id: 'teamwork', name: 'Teamwork & Collaboration', desc: 'Works effectively with others, shares knowledge, and contributes to a positive team environment.' },
      { id: 'communication', name: 'Communication', desc: 'Communicates clearly and professionally, both verbally and in writing.' },
      { id: 'customer_focus', name: 'Customer / Stakeholder Focus', desc: 'Understands and prioritises the needs of internal or external customers.' },
    ],
  },
  {
    id: 'leadership',
    category: 'Leadership & Growth',
    icon: Zap,
    color: '#a855f7',
    competencies: [
      { id: 'ownership', name: 'Ownership & Accountability', desc: 'Takes full responsibility for work and outcomes; does not deflect blame.' },
      { id: 'adaptability', name: 'Adaptability', desc: 'Adjusts effectively to changing priorities, conditions, or requirements.' },
      { id: 'development', name: 'Learning & Development', desc: 'Actively seeks opportunities to grow skills and knowledge relevant to the role.' },
    ],
  },
];

const RATING_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Below Expectations', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  2: { label: 'Needs Improvement', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  3: { label: 'Meets Expectations', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  4: { label: 'Exceeds Expectations', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  5: { label: 'Outstanding', color: 'text-primary-light', bg: 'bg-primary/10 border-primary/20' },
};

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
  const isSelf = stage === 'SELF_REVIEW';
  const [ratings, setRatings] = useState<Record<string, number>>({});
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
        id: c.id, name: c.name, rating: ratings[c.id] || 0
      })),
      categoryAverage: cat.competencies.reduce((sum, c) => sum + (ratings[c.id] || 0), 0) / cat.competencies.length,
    }));

    await onSubmit({
      overallRating: overallScore,
      summary,
      strengths,
      weaknesses: improvements,
      developmentNeeds: devPlan,
      responses: JSON.stringify({ competencyScores, ratings }),
    });
    setSubmitting(false);
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-1">
          {isSelf ? 'Self Assessment' : `${stage.replace(/_/g, ' ')} Review`}
        </h2>
        <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-widest">
          {isSelf
            ? 'Reflect honestly on your performance over the review period.'
            : `Evaluate ${packet.employee?.fullName}'s performance objectively.`}
        </p>
      </div>

      {/* Overall Score Preview */}
      <div className="nx-card p-6 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Overall Score</p>
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
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Progress</p>
          <p className="text-sm font-bold text-[var(--text-primary)]">{totalRated}/{totalCompetencies} rated</p>
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
                  {cat.competencies.filter(c => ratings[c.id] > 0).length}/{cat.competencies.length} rated
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
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Overall Summary <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={4}
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder={isSelf
              ? "Summarise your performance this period. What did you accomplish and where did you fall short?"
              : `Provide an objective summary of ${packet.employee?.fullName}'s performance.`}
            className="nx-input text-sm leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Key Strengths</label>
            <textarea
              rows={3}
              value={strengths}
              onChange={e => setStrengths(e.target.value)}
              placeholder="What did they do particularly well this period?"
              className="nx-input text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-amber-400">Areas for Improvement</label>
            <textarea
              rows={3}
              value={improvements}
              onChange={e => setImprovements(e.target.value)}
              placeholder="Where should they focus to improve?"
              className="nx-input text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-primary-light">Development Plan & Goals</label>
          <textarea
            rows={3}
            value={devPlan}
            onChange={e => setDevPlan(e.target.value)}
            placeholder="Recommended actions, training, or goals for the next review period."
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
            : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/10'
        )}
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><CheckCircle size={18} /> Submit {stage.replace(/_/g, ' ')}</>
        )}
      </button>

      {totalRated < totalCompetencies && (
        <p className="text-center text-[10px] text-amber-400 font-bold uppercase tracking-widest">
          {totalCompetencies - totalRated} competencies still need ratings
        </p>
      )}
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const AppraisalPacketView: React.FC = () => {
  const { packetId } = useParams<{ packetId: string }>();
  const [packet, setPacket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'REVIEW' | 'HISTORY'>('REVIEW');
  const user = getStoredUser();

  const stages = [
    { key: 'SELF_REVIEW', label: 'Self Review', icon: UserCheck },
    { key: 'SUPERVISOR_REVIEW', label: 'Supervisor', icon: ShieldCheck },
    { key: 'MATRIX_REVIEW', label: 'Matrix Review', icon: Users },
    { key: 'MANAGER_REVIEW', label: 'Manager', icon: BarChart2 },
    { key: 'HR_REVIEW', label: 'HR Review', icon: ShieldCheck },
    { key: 'FINAL_REVIEW', label: 'Final Verdict', icon: Award },
  ];

  useEffect(() => { fetchPacket(); }, [packetId]);

  const fetchPacket = async () => {
    try {
      const res = await api.get(`/appraisals/packet/${packetId}`);
      setPacket(res.data);
    } catch {
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
  if (!packet) return <div className="p-20 text-center text-slate-400">Packet not found.</div>;

  const currentStageIndex = stages.findIndex(s => s.key === packet.currentStage);
  const isMyTurn = (
    (packet.currentStage === 'SELF_REVIEW' && packet.employeeId === user.id) ||
    (packet.currentStage === 'SUPERVISOR_REVIEW' && packet.supervisorId === user.id) ||
    (packet.currentStage === 'MATRIX_REVIEW' && packet.matrixSupervisorId === user.id) ||
    (packet.currentStage === 'MANAGER_REVIEW' && packet.managerId === user.id) ||
    (packet.currentStage === 'HR_REVIEW' && packet.hrReviewerId === user.id) ||
    (packet.currentStage === 'FINAL_REVIEW' && packet.finalReviewerId === user.id)
  );
  const isCompleted = packet.currentStage === 'COMPLETED';

  return (
    <div className="space-y-8 page-enter pb-20">
      <PageHeader
        title={`Appraisal: ${packet.employee?.fullName}`}
        description={`${packet.cycle?.title} · Stage: ${packet.currentStage.replace(/_/g, ' ')}`}
        icon={ClipboardCheck}
        variant="indigo"
      />

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

      {isCompleted && (
        <div className="nx-card p-8 border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><CheckCircle size={24} /></div>
          <div>
            <p className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-widest">Appraisal Completed</p>
            <p className="text-[11px] text-emerald-600/60 uppercase tracking-widest font-semibold">All review stages finalised.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1">
          <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] w-fit">
            {(['REVIEW', 'HISTORY'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={cn('px-6 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all', activeTab === t ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}
              >{t === 'REVIEW' ? 'Active Review' : 'Audit Trail'}</button>
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
                      {isCompleted ? 'All stages complete' : 'Awaiting next reviewer'}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs">
                      {isCompleted ? 'This appraisal has been fully signed off.' : 'This appraisal is awaiting action from the assigned reviewer for this stage.'}
                    </p>
                  </div>
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
                            <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest">{rev.reviewStage.replace(/_/g, ' ')}</p>
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
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {parsed.competencyScores.map((cat: any) => (
                            <div key={cat.category} className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]">
                                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">{cat.category}</p>
                                <p className="text-sm font-bold text-[var(--text-primary)]">{(cat.categoryAverage * 20).toFixed(0)}<span className="text-xs text-[var(--text-muted)]">%</span></p>
                            </div>
                          ))}
                        </div>
                      )}

                      {(rev.strengths || rev.weaknesses) && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {rev.strengths && <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10"><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Strengths</p><p className="text-[11px] text-[var(--text-secondary)]">{rev.strengths}</p></div>}
                          {rev.weaknesses && <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10"><p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Improvements</p><p className="text-[11px] text-[var(--text-secondary)]">{rev.weaknesses}</p></div>}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-20 text-[var(--text-muted)] uppercase tracking-[0.2em] font-black text-[10px]">No reviews submitted yet.</div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppraisalPacketView;
