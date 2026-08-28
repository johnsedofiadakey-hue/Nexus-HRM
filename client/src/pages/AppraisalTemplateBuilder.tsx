import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { Plus, Trash2, Save, ClipboardList, Building2, MessageSquare, Users, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/common/PageHeader';
import { cn } from '../utils/cn';

interface Department {
  id: number;
  name: string;
}

interface SubIndicator {
  question: string;
  situationWeight: number;
  taskWeight: number;
  actionWeight: number;
  resultWeight: number;
}

interface Kpi {
  title: string;
  description: string;
  subIndicators: SubIndicator[];
}

interface TemplateForm {
  departmentId: number | '';
  jobTitle: string;
  welcomeMessage: string;
  requireManagerReview: boolean;
  requireDepartmentHeadReview: boolean;
  requireHrReview: boolean;
  selfManagerBlendRatio: number;
  gapAlertThreshold: number;
  kpis: Kpi[];
}

const MIN_KPIS = 2;
const MAX_KPIS = 3;
const MIN_SUB = 2;
const MAX_SUB = 4;

const blankSubIndicator = (): SubIndicator => ({
  question: '',
  situationWeight: 15,
  taskWeight: 10,
  actionWeight: 60,
  resultWeight: 15,
});

const blankKpi = (): Kpi => ({
  title: '',
  description: '',
  subIndicators: [blankSubIndicator(), blankSubIndicator()],
});

const blankForm = (): TemplateForm => ({
  departmentId: '',
  jobTitle: '',
  welcomeMessage: '',
  requireManagerReview: true,
  requireDepartmentHeadReview: false,
  requireHrReview: false,
  selfManagerBlendRatio: 0.2,
  gapAlertThreshold: 15,
  kpis: [blankKpi(), blankKpi()],
});

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

const AppraisalTemplateBuilder: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<TemplateForm>(blankForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.departmentId) {
      setForm(f => ({ ...blankForm(), departmentId: f.departmentId, jobTitle: f.jobTitle }));
      setHasExisting(false);
      return;
    }
    setLoading(true);
    api
      .get('/appraisals/templates/for-department', { params: { departmentId: form.departmentId, jobTitle: form.jobTitle || undefined } })
      .then(res => {
        const t = res.data;
        if (t) {
          setForm({
            departmentId: t.departmentId,
            jobTitle: t.jobTitle || '',
            welcomeMessage: t.welcomeMessage || '',
            requireManagerReview: t.requireManagerReview,
            requireDepartmentHeadReview: t.requireDepartmentHeadReview,
            requireHrReview: t.requireHrReview,
            selfManagerBlendRatio: Number(t.selfManagerBlendRatio),
            gapAlertThreshold: t.gapAlertThreshold,
            kpis: t.kpis.map((k: any) => ({
              title: k.title,
              description: k.description || '',
              subIndicators: k.subIndicators.map((s: any) => ({
                question: s.question,
                situationWeight: s.situationWeight,
                taskWeight: s.taskWeight,
                actionWeight: s.actionWeight,
                resultWeight: s.resultWeight,
              })),
            })),
          });
          setHasExisting(true);
        } else {
          setForm(f => ({ ...blankForm(), departmentId: f.departmentId, jobTitle: f.jobTitle }));
          setHasExisting(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.departmentId, form.jobTitle]);

  const updateKpi = (index: number, patch: Partial<Kpi>) => {
    setForm(f => ({ ...f, kpis: f.kpis.map((k, i) => (i === index ? { ...k, ...patch } : k)) }));
  };

  const updateSubIndicator = (kpiIndex: number, subIndex: number, patch: Partial<SubIndicator>) => {
    setForm(f => ({
      ...f,
      kpis: f.kpis.map((k, i) =>
        i === kpiIndex ? { ...k, subIndicators: k.subIndicators.map((s, si) => (si === subIndex ? { ...s, ...patch } : s)) } : k
      ),
    }));
  };

  const addKpi = () => {
    if (form.kpis.length >= MAX_KPIS) return;
    setForm(f => ({ ...f, kpis: [...f.kpis, blankKpi()] }));
  };

  const removeKpi = (index: number) => {
    if (form.kpis.length <= MIN_KPIS) return;
    setForm(f => ({ ...f, kpis: f.kpis.filter((_, i) => i !== index) }));
  };

  const addSubIndicator = (kpiIndex: number) => {
    setForm(f => ({
      ...f,
      kpis: f.kpis.map((k, i) => (i === kpiIndex && k.subIndicators.length < MAX_SUB ? { ...k, subIndicators: [...k.subIndicators, blankSubIndicator()] } : k)),
    }));
  };

  const removeSubIndicator = (kpiIndex: number, subIndex: number) => {
    setForm(f => ({
      ...f,
      kpis: f.kpis.map((k, i) =>
        i === kpiIndex && k.subIndicators.length > MIN_SUB ? { ...k, subIndicators: k.subIndicators.filter((_, si) => si !== subIndex) } : k
      ),
    }));
  };

  // Situation/Result are adjustable within 10-20; adjusting one auto-balances so the total stays 100
  // (Task fixed 10, Action fixed 60 → Situation + Result must always sum to 30).
  const setSituationWeight = (kpiIndex: number, subIndex: number, value: number) => {
    const clamped = Math.min(20, Math.max(10, value));
    updateSubIndicator(kpiIndex, subIndex, { situationWeight: clamped, resultWeight: 30 - clamped });
  };

  const handleSave = async () => {
    if (!form.departmentId) {
      toast.error('Select a department first');
      return;
    }
    if (form.kpis.length < MIN_KPIS || form.kpis.length > MAX_KPIS) {
      toast.error(`You must have between ${MIN_KPIS} and ${MAX_KPIS} KPIs`);
      return;
    }
    for (const k of form.kpis) {
      if (!k.title.trim()) {
        toast.error('Every KPI needs a title');
        return;
      }
      if (k.subIndicators.length < MIN_SUB || k.subIndicators.length > MAX_SUB) {
        toast.error(`Each KPI needs ${MIN_SUB}-${MAX_SUB} questions`);
        return;
      }
      for (const s of k.subIndicators) {
        if (!s.question.trim()) {
          toast.error('Every question needs text');
          return;
        }
      }
    }

    setSaving(true);
    try {
      await api.post('/appraisals/templates', {
        ...form,
        departmentId: Number(form.departmentId),
        jobTitle: form.jobTitle || null,
      });
      toast.success(hasExisting ? 'Template updated' : 'Template created');
      setHasExisting(true);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save template'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Appraisal Templates"
        description="Set up department-specific KPIs, questions, and workflow rules for performance appraisals."
        icon={ClipboardList}
      />

      {/* Department selector */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-[var(--primary)]" />
          <h3 className="font-semibold">Department</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className="nx-input"
            value={form.departmentId}
            onChange={e => setForm(f => ({ ...blankForm(), departmentId: e.target.value ? Number(e.target.value) : '' }))}
          >
            <option value="">Select a department...</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input
            className="nx-input"
            placeholder="Job title (optional — leave blank to apply to the whole department)"
            value={form.jobTitle}
            onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
          />
        </div>
        {loading && <p className="text-sm text-[var(--text-muted)] mt-2">Loading existing template...</p>}
        {!loading && form.departmentId && (
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {hasExisting ? 'Editing the existing template for this department.' : 'No template yet — this will create a new one.'}
          </p>
        )}
      </div>

      {form.departmentId && (
        <>
          {/* Welcome message */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-[var(--primary)]" />
              <h3 className="font-semibold">Welcome Message</h3>
            </div>
            <textarea
              className="nx-input min-h-[80px]"
              placeholder="An intro message employees in this department see before starting their self-review..."
              value={form.welcomeMessage}
              onChange={e => setForm(f => ({ ...f, welcomeMessage: e.target.value }))}
            />
          </div>

          {/* Reviewer chain */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-[var(--primary)]" />
              <h3 className="font-semibold">Reviewer Chain</h3>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.requireManagerReview} onChange={e => setForm(f => ({ ...f, requireManagerReview: e.target.checked }))} />
                Require manager review
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.requireDepartmentHeadReview} onChange={e => setForm(f => ({ ...f, requireDepartmentHeadReview: e.target.checked }))} />
                Require department head review
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.requireHrReview} onChange={e => setForm(f => ({ ...f, requireHrReview: e.target.checked }))} />
                Require HR review
              </label>
              <p className="text-xs text-[var(--text-muted)]">Final MD sign-off is always required and cannot be turned off.</p>
            </div>
          </div>

          {/* Scoring rules */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-[var(--primary)]" />
              <h3 className="font-semibold">Scoring Rules</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--text-muted)] block mb-1">
                  Self-review weight: {Math.round(form.selfManagerBlendRatio * 100)}% (manager: {100 - Math.round(form.selfManagerBlendRatio * 100)}%)
                </label>
                <input
                  type="range" min={0} max={100} step={5}
                  value={Math.round(form.selfManagerBlendRatio * 100)}
                  onChange={e => setForm(f => ({ ...f, selfManagerBlendRatio: Number(e.target.value) / 100 }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)] block mb-1">Gap alert threshold (points)</label>
                <input
                  type="number" min={0} max={100} className="nx-input"
                  value={form.gapAlertThreshold}
                  onChange={e => setForm(f => ({ ...f, gapAlertThreshold: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="space-y-6 mb-6">
            {form.kpis.map((kpi, kpiIndex) => (
              <div key={kpiIndex} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 space-y-2">
                    <input
                      className="nx-input font-semibold"
                      placeholder={`KPI ${kpiIndex + 1} title (e.g. "Collections & Cash Flow")`}
                      value={kpi.title}
                      onChange={e => updateKpi(kpiIndex, { title: e.target.value })}
                    />
                    <input
                      className="nx-input text-sm"
                      placeholder="Short description (optional)"
                      value={kpi.description}
                      onChange={e => updateKpi(kpiIndex, { description: e.target.value })}
                    />
                  </div>
                  {form.kpis.length > MIN_KPIS && (
                    <button onClick={() => removeKpi(kpiIndex)} className="text-red-500 hover:text-red-600 p-2">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="space-y-4 pl-4 border-l-2 border-[var(--border-subtle)]">
                  {kpi.subIndicators.map((sub, subIndex) => (
                    <div key={subIndex} className="bg-[var(--bg-elevated)] rounded-xl p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <textarea
                          className="nx-input flex-1"
                          placeholder={`Question ${subIndex + 1} (reflection question, STAR method)`}
                          value={sub.question}
                          onChange={e => updateSubIndicator(kpiIndex, subIndex, { question: e.target.value })}
                        />
                        {kpi.subIndicators.length > MIN_SUB && (
                          <button onClick={() => removeSubIndicator(kpiIndex, subIndex)} className="text-red-500 hover:text-red-600 p-2">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                        <span>Situation: {sub.situationWeight}%</span>
                        <input
                          type="range" min={10} max={20}
                          value={sub.situationWeight}
                          onChange={e => setSituationWeight(kpiIndex, subIndex, Number(e.target.value))}
                          className="flex-1"
                        />
                        <span>Result: {sub.resultWeight}%</span>
                        <span className="whitespace-nowrap">Task: 10% (fixed) · Action: 60% (fixed)</span>
                      </div>
                    </div>
                  ))}
                  {kpi.subIndicators.length < MAX_SUB && (
                    <button
                      onClick={() => addSubIndicator(kpiIndex)}
                      className="flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
                    >
                      <Plus size={14} /> Add question ({kpi.subIndicators.length}/{MAX_SUB})
                    </button>
                  )}
                </div>
              </div>
            ))}

            {form.kpis.length < MAX_KPIS && (
              <button
                onClick={addKpi}
                className={cn(
                  'w-full py-4 border-2 border-dashed border-[var(--border-subtle)] rounded-2xl',
                  'flex items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors'
                )}
              >
                <Plus size={18} /> Add KPI ({form.kpis.length}/{MAX_KPIS})
              </button>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Save size={18} /> {saving ? 'Saving...' : hasExisting ? 'Update Template' : 'Create Template'}
          </button>
        </>
      )}
    </div>
  );
};

export default AppraisalTemplateBuilder;
