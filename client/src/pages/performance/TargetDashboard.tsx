import React, { useEffect, useState, useCallback } from 'react';
import {
  Target, Plus, ChevronRight, Flag, Users, Building2,
  TrendingUp, Clock, CheckCircle, AlertCircle, Layers,
  BarChart2, X, Calendar, Percent, DollarSign, Hash,
  List, Award
} from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import TargetCard from '../../components/performance/TargetCard';
import { AnimatePresence, motion } from 'framer-motion';
import { getStoredUser, getRankFromRole } from '../../utils/session';
import EmptyState from '../../components/common/EmptyState';
import TargetCascadeModal from '../../components/performance/TargetCascadeModal';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';

const METRIC_TYPES = [
  { value: 'NUMERICAL', label: 'Numerical', icon: Hash, desc: 'e.g. number of calls, units sold' },
  { value: 'PERCENTAGE', label: 'Percentage', icon: Percent, desc: 'e.g. completion rate, attendance %' },
  { value: 'FINANCIAL', label: 'Financial', icon: DollarSign, desc: 'e.g. revenue, cost savings (GHS)' },
  { value: 'QUALITATIVE', label: 'Qualitative', icon: List, desc: 'Text/milestone-based assessment' },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'Draft', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  ASSIGNED: { label: 'Assigned', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ACKNOWLEDGED: { label: 'Acknowledged', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  UNDER_REVIEW: { label: 'Under Review', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  COMPLETED: { label: 'Completed', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  OVERDUE: { label: 'Overdue', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

// Empty metric template
const newMetric = () => ({
  _id: Math.random().toString(36).slice(2),
  title: '',
  metricType: 'NUMERICAL',
  targetValue: '',
  unit: '',
  weight: 1.0,
  qualitativePrompt: '',
});

// ── CREATE TARGET MODAL ───────────────────────────────────────────────────────
const CreateTargetModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    level: 'INDIVIDUAL' as 'INDIVIDUAL' | 'DEPARTMENT',
    type: 'SINGLE',
    dueDate: '',
    assigneeId: '',
    departmentId: '',
    weight: '1.0',
  });
  const [metrics, setMetrics] = useState([newMetric()]);

  useEffect(() => {
    Promise.all([
      api.get('/users').catch(() => ({ data: [] })),
      api.get('/departments').catch(() => ({ data: [] })),
    ]).then(([uRes, dRes]) => {
      setEmployees(Array.isArray(uRes.data) ? uRes.data : []);
      setDepartments(Array.isArray(dRes.data) ? dRes.data : []);
    });
  }, []);

  const addMetric = () => setMetrics(m => [...m, newMetric()]);
  const removeMetric = (id: string) => setMetrics(m => m.filter(x => x._id !== id));
  const updateMetric = (id: string, field: string, value: any) =>
    setMetrics(m => m.map(x => x._id === id ? { ...x, [field]: value } : x));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (metrics.some(m => !m.title.trim())) { toast.error('All metrics need a title'); return; }
    if (form.level === 'INDIVIDUAL' && !form.assigneeId) { toast.error('Select an employee to assign to'); return; }
    if (form.level === 'DEPARTMENT' && !form.departmentId && rank < 80) { toast.error('Select a department'); return; }

    setSaving(true);
    try {
      await api.post('/targets', {
        ...form,
        weight: parseFloat(form.weight) || 1.0,
        departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
        metrics: metrics.map(m => ({
          title: m.title,
          metricType: m.metricType,
          targetValue: m.metricType !== 'QUALITATIVE' ? parseFloat(String(m.targetValue)) || null : null,
          unit: m.unit || null,
          weight: parseFloat(String(m.weight)) || 1.0,
          qualitativePrompt: m.qualitativePrompt || null,
        })),
      });
      toast.success('Target created and assigned successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create target');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass w-full max-w-3xl bg-[#080c16]/95 border-white/[0.07] max-h-[90vh] overflow-y-auto relative z-10"
      >
        <div className="sticky top-0 bg-[#080c16]/95 border-b border-white/5 px-8 py-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Assign Target</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Define goal metrics and assign to employee or department</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Title *</label>
              <input className="glass-input w-full p-4 text-white font-bold" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Increase Q2 Sales Revenue by 20%" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <textarea className="glass-input w-full p-4 text-white min-h-[80px]" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Context, background, or strategic rationale..." />
            </div>
          </div>

          {/* Level & Assignment */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Level</label>
            <div className="grid grid-cols-2 gap-4">
              {([['INDIVIDUAL', 'Individual', Users], ['DEPARTMENT', 'Department', Building2]] as const).map(([val, label, Icon]) => (
                <button key={val} type="button" onClick={() => setForm({ ...form, level: val })}
                  className={cn('p-4 rounded-2xl border flex items-center gap-3 transition-all', form.level === val ? 'bg-primary/10 border-primary/30 text-primary-light' : 'border-white/10 text-slate-500 hover:border-white/20')}>
                  <Icon size={18} />
                  <span className="font-bold text-sm">{label}</span>
                </button>
              ))}
            </div>

            {form.level === 'INDIVIDUAL' ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assign To *</label>
                <select className="glass-input w-full p-4 text-white" value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })} required>
                  <option value="">-- Select Employee --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</label>
                <select className="glass-input w-full p-4 text-white" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">-- All Departments --</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</label>
              <input type="date" className="glass-input w-full p-4 text-white" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weight</label>
              <input type="number" min="0" max="10" step="0.1" className="glass-input w-full p-4 text-white"
                value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Success Metrics *</label>
              <button type="button" onClick={addMetric} className="text-[10px] font-black text-primary-light hover:text-white flex items-center gap-1 transition-all">
                <Plus size={14} /> Add Metric
              </button>
            </div>

            {metrics.map((metric, idx) => (
              <div key={metric._id} className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Metric {idx + 1}</span>
                  {metrics.length > 1 && (
                    <button type="button" onClick={() => removeMetric(metric._id)} className="text-rose-500 hover:text-rose-400 transition-all">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <input className="glass-input w-full p-3 text-white text-sm" placeholder="Metric title *"
                  value={metric.title} onChange={e => updateMetric(metric._id, 'title', e.target.value)} required />

                <div className="grid grid-cols-2 gap-3">
                  {METRIC_TYPES.map(mt => (
                    <button key={mt.value} type="button"
                      onClick={() => updateMetric(metric._id, 'metricType', mt.value)}
                      className={cn('p-3 rounded-xl border text-left transition-all', metric.metricType === mt.value ? 'bg-primary/10 border-primary/30' : 'border-white/10 hover:border-white/20')}>
                      <div className="flex items-center gap-2 mb-1">
                        <mt.icon size={13} className={metric.metricType === mt.value ? 'text-primary-light' : 'text-slate-500'} />
                        <span className={cn('text-[11px] font-bold', metric.metricType === mt.value ? 'text-white' : 'text-slate-400')}>{mt.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-600">{mt.desc}</p>
                    </button>
                  ))}
                </div>

                {metric.metricType !== 'QUALITATIVE' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <input className="glass-input p-3 text-white text-sm" placeholder="Target value (e.g. 100)"
                      type="number" value={metric.targetValue}
                      onChange={e => updateMetric(metric._id, 'targetValue', e.target.value)} />
                    <input className="glass-input p-3 text-white text-sm" placeholder="Unit (e.g. GHS, %, units)"
                      value={metric.unit} onChange={e => updateMetric(metric._id, 'unit', e.target.value)} />
                  </div>
                ) : (
                  <input className="glass-input w-full p-3 text-white text-sm"
                    placeholder="Assessment prompt (e.g. 'Describe team collaboration improvements')"
                    value={metric.qualitativePrompt}
                    onChange={e => updateMetric(metric._id, 'qualitativePrompt', e.target.value)} />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:border-white/20 transition-all">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-[2] py-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Target size={16} /> Create Target</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
const TargetDashboard: React.FC = () => {
  const [myTargets, setMyTargets] = useState<any[]>([]);
  const [teamTargets, setTeamTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MY' | 'TEAM'>('MY');
  const [filter, setFilter] = useState<string>('ALL');
  const [cascadeTarget, setCascadeTarget] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [api.get('/targets')];
      if (rank >= 60) promises.push(api.get('/targets/team'));

      const [myRes, teamRes] = await Promise.all(promises);
      setMyTargets(Array.isArray(myRes.data) ? myRes.data : []);
      if (teamRes) setTeamTargets(Array.isArray(teamRes.data) ? teamRes.data : []);
    } catch {
      toast.error('Failed to sync targets.');
    } finally {
      setLoading(false);
    }
  }, [rank]);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  const handleAcknowledge = async (targetId: string, status: string, message?: string) => {
    try {
      await api.post(`/targets/${targetId}/acknowledge`, { status, message });
      toast.success(status === 'ACKNOWLEDGED' ? 'Target acknowledged' : 'Clarification requested');
      fetchTargets();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Action failed'); }
  };

  const handleUpdateProgress = async (targetId: string, updates: any[], submit: boolean) => {
    try {
      await api.post(`/targets/${targetId}/progress`, { metricUpdates: updates, submit });
      toast.success(submit ? 'Submitted for review' : 'Progress saved');
      fetchTargets();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Update failed'); }
  };

  const handleReview = async (targetId: string, approved: boolean, feedback?: string) => {
    try {
      await api.post(`/targets/${targetId}/review`, { approved, feedback });
      toast.success(approved ? 'Target approved' : 'Target returned');
      fetchTargets();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Review failed'); }
  };

  const displayTargets = (activeTab === 'TEAM' && rank >= 60 ? teamTargets : myTargets)
    .filter(t => filter === 'ALL' || t.status === filter || t.level === filter);

  const statusCounts = (activeTab === 'TEAM' && rank >= 60 ? teamTargets : myTargets).reduce((acc: any, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8 page-enter pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader title="Targets & Goals" description="Manage individual and departmental goals across all levels." icon={Flag} variant="indigo" />
        {rank >= 60 && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs flex-shrink-0">
            <Plus size={18} /> Assign Target
          </motion.button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: (activeTab === 'TEAM' ? teamTargets : myTargets).length, icon: Target, color: '#6366f1' },
          { label: 'In Progress', value: statusCounts['IN_PROGRESS'] || 0, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Under Review', value: statusCounts['UNDER_REVIEW'] || 0, icon: Clock, color: '#a855f7' },
          { label: 'Completed', value: statusCounts['COMPLETED'] || 0, icon: CheckCircle, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="glass p-5 group hover:border-primary/30 transition-all">
            <div className="p-2.5 rounded-xl w-fit mb-3" style={{ background: `${s.color}15` }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex p-1 bg-slate-900/40 rounded-2xl border border-white/5 gap-1">
          <button onClick={() => setActiveTab('MY')} className={cn('px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', activeTab === 'MY' ? 'bg-primary text-white' : 'text-slate-500 hover:text-white')}>My Targets</button>
          {rank >= 60 && (
            <button onClick={() => setActiveTab('TEAM')} className={cn('px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative', activeTab === 'TEAM' ? 'bg-primary text-white' : 'text-slate-500 hover:text-white')}>
              Team Targets
              {teamTargets.filter(t => t.status === 'UNDER_REVIEW').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[8px] text-black font-black flex items-center justify-center">
                  {teamTargets.filter(t => t.status === 'UNDER_REVIEW').length}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'OVERDUE'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all',
                filter === s ? 'bg-primary/20 border-primary/40 text-primary-light' : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-white'
              )}>
              {s === 'ALL' ? `All (${(activeTab === 'TEAM' ? teamTargets : myTargets).length})` : `${s.replace(/_/g, ' ')} (${statusCounts[s] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Target List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : displayTargets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {displayTargets.map(target => (
              <TargetCard
                key={target.id}
                target={target}
                onAcknowledge={(status, msg) => handleAcknowledge(target.id, status, msg)}
                onUpdateProgress={(updates, submit) => handleUpdateProgress(target.id, updates, submit)}
                onReview={(approved, feedback) => handleReview(target.id, approved, feedback)}
                isReviewer={activeTab === 'TEAM' || target.reviewerId === user.id}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState
          title={activeTab === 'TEAM' ? 'No Team Targets' : 'No Targets Assigned'}
          description={activeTab === 'TEAM' ? 'You haven\'t assigned any targets to your team yet.' : 'No targets have been assigned to you yet.'}
          icon={Flag}
        />
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && <CreateTargetModal onClose={() => setShowCreate(false)} onSuccess={fetchTargets} />}
        {cascadeTarget && (
          <TargetCascadeModal
            target={cascadeTarget}
            onClose={() => setCascadeTarget(null)}
            onSuccess={() => { fetchTargets(); setCascadeTarget(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TargetDashboard;
