import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        const existingTemplate = res.data;
        if (existingTemplate) {
          setForm({
            departmentId: existingTemplate.departmentId,
            jobTitle: existingTemplate.jobTitle || '',
            welcomeMessage: existingTemplate.welcomeMessage || '',
            requireManagerReview: existingTemplate.requireManagerReview,
            requireDepartmentHeadReview: existingTemplate.requireDepartmentHeadReview,
            requireHrReview: existingTemplate.requireHrReview,
            selfManagerBlendRatio: Number(existingTemplate.selfManagerBlendRatio),
            gapAlertThreshold: existingTemplate.gapAlertThreshold,
            kpis: existingTemplate.kpis.map((k: any) => ({
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
      toast.error(t('appraisals.templates.toast.select_department_first'));
      return;
    }
    if (form.kpis.length < MIN_KPIS || form.kpis.length > MAX_KPIS) {
      toast.error(t('appraisals.templates.toast.kpi_count_error', { min: MIN_KPIS, max: MAX_KPIS }));
      return;
    }
    for (const k of form.kpis) {
      if (!k.title.trim()) {
        toast.error(t('appraisals.templates.toast.kpi_title_required'));
        return;
      }
      if (k.subIndicators.length < MIN_SUB || k.subIndicators.length > MAX_SUB) {
        toast.error(t('appraisals.templates.toast.question_count_error', { min: MIN_SUB, max: MAX_SUB }));
        return;
      }
      for (const s of k.subIndicators) {
        if (!s.question.trim()) {
          toast.error(t('appraisals.templates.toast.question_text_required'));
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
      toast.success(hasExisting ? t('appraisals.templates.toast.template_updated') : t('appraisals.templates.toast.template_created'));
      setHasExisting(true);
    } catch (error) {
      toast.error(getErrorMessage(error, t('appraisals.templates.toast.save_failed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title={t('appraisals.templates.page_title')}
        description={t('appraisals.templates.page_description')}
        icon={ClipboardList}
      />

      {/* Department selector */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-[var(--primary)]" />
          <h3 className="font-semibold">{t('appraisals.templates.department_label')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className="nx-input"
            value={form.departmentId}
            onChange={e => setForm(f => ({ ...blankForm(), departmentId: e.target.value ? Number(e.target.value) : '' }))}
          >
            <option value="">{t('appraisals.templates.select_department')}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input
            className="nx-input"
            placeholder={t('appraisals.templates.job_title_placeholder')}
            value={form.jobTitle}
            onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
          />
        </div>
        {loading && <p className="text-sm text-[var(--text-muted)] mt-2">{t('appraisals.templates.loading_existing')}</p>}
        {!loading && form.departmentId && (
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {hasExisting ? t('appraisals.templates.editing_existing') : t('appraisals.templates.no_template_yet')}
          </p>
        )}
      </div>

      {form.departmentId && (
        <>
          {/* Welcome message */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-[var(--primary)]" />
              <h3 className="font-semibold">{t('appraisals.templates.welcome_message_label')}</h3>
            </div>
            <textarea
              className="nx-input min-h-[80px]"
              placeholder={t('appraisals.templates.welcome_message_placeholder')}
              value={form.welcomeMessage}
              onChange={e => setForm(f => ({ ...f, welcomeMessage: e.target.value }))}
            />
          </div>

          {/* Reviewer chain */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-[var(--primary)]" />
              <h3 className="font-semibold">{t('appraisals.templates.reviewer_chain_label')}</h3>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.requireManagerReview} onChange={e => setForm(f => ({ ...f, requireManagerReview: e.target.checked }))} />
                {t('appraisals.templates.require_manager_review')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.requireDepartmentHeadReview} onChange={e => setForm(f => ({ ...f, requireDepartmentHeadReview: e.target.checked }))} />
                {t('appraisals.templates.require_dept_head_review')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.requireHrReview} onChange={e => setForm(f => ({ ...f, requireHrReview: e.target.checked }))} />
                {t('appraisals.templates.require_hr_review')}
              </label>
              <p className="text-xs text-[var(--text-muted)]">{t('appraisals.templates.final_signoff_note')}</p>
            </div>
          </div>

          {/* Scoring rules */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-[var(--primary)]" />
              <h3 className="font-semibold">{t('appraisals.templates.scoring_rules_label')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--text-muted)] block mb-1">
                  {t('appraisals.templates.self_review_weight', { self: Math.round(form.selfManagerBlendRatio * 100), manager: 100 - Math.round(form.selfManagerBlendRatio * 100) })}
                </label>
                <input
                  type="range" min={0} max={100} step={5}
                  value={Math.round(form.selfManagerBlendRatio * 100)}
                  onChange={e => setForm(f => ({ ...f, selfManagerBlendRatio: Number(e.target.value) / 100 }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)] block mb-1">{t('appraisals.templates.gap_alert_threshold')}</label>
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
                      placeholder={t('appraisals.templates.kpi_title_placeholder', { n: kpiIndex + 1 })}
                      value={kpi.title}
                      onChange={e => updateKpi(kpiIndex, { title: e.target.value })}
                    />
                    <input
                      className="nx-input text-sm"
                      placeholder={t('appraisals.templates.kpi_description_placeholder')}
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
                          placeholder={t('appraisals.templates.question_placeholder', { n: subIndex + 1 })}
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
                        <span>{t('appraisals.templates.situation_weight', { value: sub.situationWeight })}</span>
                        <input
                          type="range" min={10} max={20}
                          value={sub.situationWeight}
                          onChange={e => setSituationWeight(kpiIndex, subIndex, Number(e.target.value))}
                          className="flex-1"
                        />
                        <span>{t('appraisals.templates.result_weight', { value: sub.resultWeight })}</span>
                        <span className="whitespace-nowrap">{t('appraisals.templates.task_action_fixed')}</span>
                      </div>
                    </div>
                  ))}
                  {kpi.subIndicators.length < MAX_SUB && (
                    <button
                      onClick={() => addSubIndicator(kpiIndex)}
                      className="flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
                    >
                      <Plus size={14} /> {t('appraisals.templates.add_question', { count: kpi.subIndicators.length, max: MAX_SUB })}
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
                <Plus size={18} /> {t('appraisals.templates.add_kpi', { count: form.kpis.length, max: MAX_KPIS })}
              </button>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[var(--primary)] text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Save size={18} /> {saving ? t('appraisals.templates.saving') : hasExisting ? t('appraisals.templates.update_template') : t('appraisals.templates.create_template')}
          </button>
        </>
      )}
    </div>
  );
};

export default AppraisalTemplateBuilder;
