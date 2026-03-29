import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, Clock, CheckCircle, X, Flag,
  Percent, DollarSign, Hash,
  List, Target, Plus, Building2, Users
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
  DRAFT: { label: 'Draft', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
  ASSIGNED: { label: 'Assigned', badge: 'bg-blue-500/10 text-blue-800 dark:text-blue-400 border-blue-500/20' },
  ACKNOWLEDGED: { label: 'Acknowledged', badge: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 border-indigo-500/20' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-amber-500/10 text-amber-900 dark:text-amber-400 border-amber-500/20' },
  UNDER_REVIEW: { label: 'Under Review', badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-400 border-purple-500/20' },
  COMPLETED: { label: 'Completed', badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20' },
  OVERDUE: { label: 'Overdue', badge: 'bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-500/20' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
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

// ── CREATE/EDIT TARGET MODAL ───────────────────────────────────────────────────────
const CreateTargetModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}> = ({ onClose, onSuccess, initialData }) => {
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    level: (initialData?.level || 'INDIVIDUAL') as 'INDIVIDUAL' | 'DEPARTMENT',
    dueDate: initialData?.dueDate ? format(new Date(initialData.dueDate), 'yyyy-MM-dd') : '',
    assigneeId: initialData?.assigneeId || '',
    departmentId: initialData?.departmentId?.toString() || '',
    weight: initialData?.weight?.toString() || '1.0',
    status: initialData?.status || 'ASSIGNED',
  });
  
  const [metrics, setMetrics] = useState(
    initialData?.metrics?.length 
      ? initialData.metrics.map((m: any) => ({
          id: m.id,
          _id: m.id || Math.random().toString(36).slice(2),
          title: m.title,
          metricType: m.metricType,
          targetValue: m.targetValue?.toString() || '',
          unit: m.unit || '',
          weight: m.weight?.toString() || '1.0',
          qualitativePrompt: m.qualitativePrompt || '',
        }))
      : [newMetric()]
  );

  useEffect(() => {
    Promise.all([
      api.get('/users').catch(() => ({ data: [] })),
      api.get('/departments').catch(() => ({ data: [] })),
    ]).then(([uRes, dRes]) => {
      setEmployees(Array.isArray(uRes.data) ? uRes.data : []);
      setDepartments(Array.isArray(dRes.data) ? dRes.data : []);
    });
  }, []);

  const addMetric = () => setMetrics((m: any[]) => [...m, newMetric()]);
  const removeMetric = (id: string) => setMetrics((prev: any[]) => prev.filter((x: any) => x._id !== id));
  const updateMetric = (id: string, field: string, value: any) =>
    setMetrics((prev: any[]) => prev.map((x: any) => x._id === id ? { ...x, [field]: value } : x));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (metrics.some((m: any) => !m.title.trim())) { toast.error('All metrics need a title'); return; }
    if (form.level === 'INDIVIDUAL' && !form.assigneeId) { toast.error('Select an employee to assign to'); return; }
    
    setSaving(true);
    try {
      const payload = {
        ...form,
        weight: parseFloat(form.weight) || 1.0,
        departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
        metrics: metrics.map((m: any) => ({
          id: m.id, // Pass ID back to backend for syncing
          title: m.title,
          metricType: m.metricType,
          targetValue: m.metricType !== 'QUALITATIVE' ? parseFloat(String(m.targetValue)) || null : null,
          unit: m.unit || null,
          weight: parseFloat(String(m.weight)) || 1.0,
          qualitativePrompt: m.qualitativePrompt || null,
        })),
      };

      if (initialData?.id) {
        await api.patch(`/targets/${initialData.id}`, payload);
        toast.success('Target updated successfully.');
      } else {
        await api.post('/targets', payload);
        toast.success('Target created and assigned successfully.');
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="nx-card w-full max-w-3xl max-h-[90vh] flex flex-col relative z-10 shadow-2xl overflow-hidden"
        >
          {/* Header - Sticky */}
          <div className="flex-shrink-0 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-8 py-6 flex justify-between items-center z-20">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {initialData ? 'Edit Target' : 'Assign Target'}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-widest mt-1">
                {initialData ? 'Update goal parameters and metrics' : 'Define goal metrics and assign to employee or department'}
              </p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={16} /></button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-0">
            <form id="target-form" onSubmit={handleSubmit} className="space-y-8 pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Target Title *</label>
                <input className="nx-input" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Increase Q2 Sales Revenue by 20%" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Description</label>
                <textarea className="nx-input" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Context, background, or strategic rationale..." />
              </div>

              {initialData && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Status</label>
                  <select className="nx-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <option key={val} value={val}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Target Level</label>
              <div className="grid grid-cols-2 gap-4">
                {([['INDIVIDUAL', 'Individual', Users], ['DEPARTMENT', 'Department', Building2]] as const).map(([val, label, Icon]) => (
                  <button key={val} type="button" onClick={() => setForm({ ...form, level: val })}
                    className={cn('p-4 rounded-xl border flex items-center gap-3 transition-all', form.level === val ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]')}>
                    <Icon size={18} />
                    <span className="font-bold text-sm">{label}</span>
                  </button>
                ))}
              </div>

              {form.level === 'INDIVIDUAL' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Assign To *</label>
                  <select className="nx-input" value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })} required>
                    <option value="">-- Select Employee --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Department</label>
                  <select className="nx-input" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                    <option value="">-- All Departments --</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Due Date</label>
                <input type="date" className="nx-input" value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Weight</label>
                <input type="number" min="0" max="10" step="0.1" className="nx-input"
                  value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Success Metrics *</label>
                <button type="button" onClick={addMetric} className="text-[10px] font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1 transition-all">
                  <Plus size={14} /> Add Metric
                </button>
              </div>

              {metrics.map((metric: any, idx: number) => (
                <div key={metric._id} className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Metric {idx + 1}</span>
                    {metrics.length > 1 && (
                      <button type="button" onClick={() => removeMetric(metric._id)} className="text-rose-500 hover:text-rose-400 transition-all">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <input className="nx-input text-sm" placeholder="Metric title *"
                    value={metric.title} onChange={e => updateMetric(metric._id, 'title', e.target.value)} required />

                  <div className="grid grid-cols-2 gap-3">
                    {METRIC_TYPES.map(mt => (
                      <button key={mt.value} type="button"
                        onClick={() => updateMetric(metric._id, 'metricType', mt.value)}
                        className={cn('p-3 rounded-xl border text-left transition-all', metric.metricType === mt.value ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]')}>
                        <div className="flex items-center gap-2 mb-1">
                          <mt.icon size={13} className={metric.metricType === mt.value ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'} />
                          <span className={cn('text-[11px] font-bold', metric.metricType === mt.value ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>{mt.label}</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">{mt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {metric.metricType !== 'QUALITATIVE' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <input className="nx-input text-sm" placeholder="Target value (e.g. 100)"
                        type="number" value={metric.targetValue}
                        onChange={e => updateMetric(metric._id, 'targetValue', e.target.value)} />
                      <input className="nx-input text-sm" placeholder="Unit (e.g. GHS, %, units)"
                        value={metric.unit} onChange={e => updateMetric(metric._id, 'unit', e.target.value)} />
                    </div>
                  ) : (
                    <input className="nx-input text-sm"
                      placeholder="Assessment prompt (e.g. 'Describe team collaboration improvements')"
                      value={metric.qualitativePrompt}
                      onChange={e => updateMetric(metric._id, 'qualitativePrompt', e.target.value)} />
                  )}
                </div>
              ))}
            </div>

            </form>
          </div>

          {/* Footer - Sticky/Fixed */}
          <div className="flex-shrink-0 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] px-8 py-6 flex justify-end gap-4 z-20">
            <button type="button" onClick={onClose} 
              className="px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
              Cancel
            </button>
            <button form="target-form" type="submit" disabled={saving}
              className="px-10 py-3 rounded-xl bg-[var(--primary)] text-white text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Target size={14} /> {initialData ? 'Update Target' : 'Create & Assign'}</>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
const TargetDashboard: React.FC = () => {
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);
  const [myTargets, setMyTargets] = useState<any[]>([]);
  const [teamTargets, setTeamTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MY' | 'TEAM'>(rank >= 60 ? 'TEAM' : 'MY');
  const [filter, setFilter] = useState<string>('ALL');
  const [cascadeTarget, setCascadeTarget] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTarget, setEditingTarget] = useState<any | null>(null);

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

  const handleEdit = (target: any) => {
    setEditingTarget(target);
  };

  const handleDeleteTarget = async (id: string) => {
    try {
      await api.delete(`/targets/${id}`);
      toast.success('Target deleted for all users.');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Deletion failed');
    }
  };

  const displayTargets = (activeTab === 'TEAM' && rank >= 60 ? teamTargets : myTargets)
    .filter(t => filter === 'ALL' || t.status === filter || t.level === filter);

  const statusCounts = (activeTab === 'TEAM' && rank >= 60 ? teamTargets : myTargets).reduce((acc: any, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  // Grouping Logic
  const departmentalTargets = displayTargets.filter(t => t.level === 'DEPARTMENT');
  const individualTargets = displayTargets.filter(t => t.level === 'INDIVIDUAL');

  const groupedByDept = departmentalTargets.reduce((acc: any, t) => {
    const dept = t.department?.name || 'General';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(t);
    return acc;
  }, {});

  const groupedByAssignee = individualTargets.reduce((acc: any, t) => {
    const name = t.assignee?.fullName || 'Unassigned';
    if (!acc[name]) acc[name] = [];
    acc[name].push(t);
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
          <div key={s.label} className="nx-card p-5 group hover:border-[var(--primary)]/30 transition-all">
            <div className="p-2.5 rounded-xl w-fit mb-3" style={{ background: `${s.color}15` }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] gap-1">
          <button onClick={() => setActiveTab('MY')} className={cn('px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all', activeTab === 'MY' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>My Targets</button>
          {rank >= 60 && (
            <button onClick={() => setActiveTab('TEAM')} className={cn('px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all relative', activeTab === 'TEAM' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>
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
              className={cn('px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all',
                filter === s ? 'bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--primary)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              )}>
              {s === 'ALL' ? `All (${(activeTab === 'TEAM' ? teamTargets : myTargets).length})` : `${s.replace(/_/g, ' ')} (${statusCounts[s] || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Target Content sections */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : displayTargets.length > 0 ? (
        <div className="space-y-12">
          
          {/* Section: Departmental Goals */}
          {departmentalTargets.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--border-subtle)]" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2">
                  <Building2 size={14} className="text-indigo-500" /> Departmental Objectives
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--border-subtle)]" />
              </div>

              <div className="space-y-8">
                {Object.entries(groupedByDept).map(([dept, targets]: any) => (
                  <div key={dept} className="space-y-4">
                    <div className="flex items-center gap-3">
                       <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">{dept}</span>
                       <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{targets.length} Goals</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {targets.map((t: any) => (
                        <TargetCard key={t.id} target={t} isReviewer={activeTab === 'TEAM' || t.reviewerId === user.id}
                          onAcknowledge={(status, msg) => handleAcknowledge(t.id, status, msg)}
                          onUpdateProgress={(updates, submit) => handleUpdateProgress(t.id, updates, submit)}
                          onReview={(approved, feedback) => handleReview(t.id, approved, feedback)}
                          onCascade={() => setCascadeTarget(t)} onEdit={() => handleEdit(t)} onDelete={() => handleDeleteTarget(t.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Individual Targets */}
          {individualTargets.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--border-subtle)]" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] flex items-center gap-2">
                  <Users size={14} className="text-emerald-500" /> Individual Performance
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--border-subtle)]" />
              </div>

              <div className="space-y-10">
                {Object.entries(groupedByAssignee).map(([name, targets]: any) => (
                  <div key={name} className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20 text-[10px] font-black">{name.charAt(0)}</div>
                       <div>
                         <div className="text-sm font-bold text-[var(--text-primary)]">{name}</div>
                         <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tight">{targets.length} active assignments</div>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {targets.map((t: any) => (
                        <TargetCard key={t.id} target={t} isReviewer={activeTab === 'TEAM' || t.reviewerId === user.id}
                          onAcknowledge={(status, msg) => handleAcknowledge(t.id, status, msg)}
                          onUpdateProgress={(updates, submit) => handleUpdateProgress(t.id, updates, submit)}
                          onReview={(approved, feedback) => handleReview(t.id, approved, feedback)}
                          onCascade={() => setCascadeTarget(t)} onEdit={() => handleEdit(t)} onDelete={() => handleDeleteTarget(t.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
        {(showCreate || editingTarget) && (
          <CreateTargetModal 
            initialData={editingTarget}
            onClose={() => { setShowCreate(false); setEditingTarget(null); }} 
            onSuccess={fetchTargets} 
          />
        )}
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
