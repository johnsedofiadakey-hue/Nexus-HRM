import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Megaphone, ShieldCheck, Target, UserCheck, Users2 } from 'lucide-react';
import api from '../services/api';

type TabKey = 'dashboard' | 'performance' | 'recruitment' | 'onboarding' | 'benefits' | 'shifts' | 'announcements' | 'tax';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'dashboard', label: 'Role Dashboard' },
  { key: 'performance', label: 'Performance' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'tax', label: 'Tax Rules' },
];

const badge = (value: string) =>
  `inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${value === 'ACTIVE' || value === 'PUBLISHED'
    ? 'bg-emerald-500/10 text-emerald-400'
    : value === 'IN_PROGRESS' || value === 'OPEN'
      ? 'bg-primary/10 text-primary-light'
      : 'bg-white/[0.06] text-slate-400'
  }`;

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="glass p-4 md:p-6">
    <h3 className="font-display text-lg font-bold text-white mb-4">{title}</h3>
    {children}
  </section>
);

const EnterpriseSuite = () => {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dashboard, setDashboard] = useState<Record<string, unknown>>({});
  const [deptKpis, setDeptKpis] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [onboarding, setOnboarding] = useState<any[]>([]);
  const [benefitPlans, setBenefitPlans] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [taxRules, setTaxRules] = useState<any[]>([]);

  const [newKpi, setNewKpi] = useState({ departmentId: 1, title: '', metricType: 'PERCENT', targetValue: 90, measurementPeriod: 'Q1-2026' });
  const [newJob, setNewJob] = useState({ title: '', location: '', employmentType: 'FULL_TIME' });
  const [newCandidate, setNewCandidate] = useState({ jobPositionId: '', fullName: '', email: '' });
  const [newBenefit, setNewBenefit] = useState({ name: '', category: 'HEALTH', employerAmount: 0, employeeAmount: 0 });
  const [newShift, setNewShift] = useState({ name: '', startTime: '08:00', endTime: '16:00', gracePeriodMins: 10 });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', targetAudience: 'ALL' });
  const [newTaxRule, setNewTaxRule] = useState({ countryCode: 'GH', taxType: 'PAYE', name: '', appliesTo: 'PAYROLL' });

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/enterprise/summary');
      
      setDashboard(data.dashboard || {});
      setDeptKpis(Array.isArray(data.deptKpis?.data) ? data.deptKpis.data : []);
      setJobs(Array.isArray(data.jobs?.data) ? data.jobs.data : []);
      setCandidates(Array.isArray(data.candidates?.data) ? data.candidates.data : []);
      setOnboarding(Array.isArray(data.onboarding?.data) ? data.onboarding.data : []);
      setBenefitPlans(Array.isArray(data.benefitPlans?.data) ? data.benefitPlans.data : []);
      setShifts(Array.isArray(data.shifts?.data) ? data.shifts.data : []);
      setAnnouncements(Array.isArray(data.announcements?.data) ? data.announcements.data : []);
      setTaxRules(Array.isArray(data.taxRules?.data) ? data.taxRules.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load enterprise suite data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const quickStats = useMemo(
    () => [
      { title: 'Headcount', value: String(dashboard.headcount ?? 0), icon: Users2 },
      { title: 'Open Jobs', value: String(dashboard.recruitmentPipelineOpenings ?? 0), icon: Briefcase },
      { title: 'Pending Reviews', value: String(dashboard.pendingKpiValidations ?? 0), icon: Target },
      { title: 'Pending Leave', value: String(dashboard.pendingLeaveApprovals ?? 0), icon: UserCheck },
    ],
    [dashboard]
  );

  const submit = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Action failed');
    }
  };

  return (
    <div className="space-y-5 pb-10 page-transition">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl md:text-3xl font-black text-white">Enterprise HR Suite v4.0</h1>
        <p className="text-sm text-slate-400">Role hierarchy, ATS, onboarding/offboarding, benefits, shifts, announcements, and tax engine.</p>
      </div>

      <div className="glass p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {(tabs || []).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors ${tab === item.key ? 'bg-primary/20 text-primary-light border border-primary/40' : 'bg-white/[0.02] text-slate-400 border border-white/[0.05] hover:text-white'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="glass p-3 text-sm text-rose-300 border-rose-400/30">{error}</div> : null}
      {loading ? <div className="glass p-6 text-sm text-slate-400">Loading enterprise data...</div> : null}

      {tab === 'dashboard' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {(quickStats || []).map((item) => (
            <div key={item.title} className="glass p-4">
              <div className="flex items-center justify-between mb-2">
                <item.icon size={16} className="text-primary-light" />
                <ShieldCheck size={14} className="text-slate-500" />
              </div>
              <p className="text-2xl font-black text-white font-display">{item.value}</p>
              <p className="text-xs text-slate-400">{item.title}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'performance' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Create Department KPI">
            <div className="grid gap-3">
              <input className="nx-input" placeholder="Title" value={newKpi.title} onChange={(e) => setNewKpi((p) => ({ ...p, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="nx-input" placeholder="Metric Type" value={newKpi.metricType} onChange={(e) => setNewKpi((p) => ({ ...p, metricType: e.target.value }))} />
                <input className="nx-input" placeholder="Measurement Period" value={newKpi.measurementPeriod} onChange={(e) => setNewKpi((p) => ({ ...p, measurementPeriod: e.target.value }))} />
              </div>
              <button
                className="btn-primary justify-center"
                onClick={() =>
                  submit(() =>
                    api.post('/enterprise/performance/department-kpis', {
                      ...newKpi,
                      targetValue: Number(newKpi.targetValue),
                      departmentId: Number(newKpi.departmentId),
                    })
                  )
                }
              >
                Add KPI
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Recent KPIs">
            <div className="space-y-2">
              {(deptKpis || []).map((kpi) => (
                <div key={kpi.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{kpi.title}</p>
                    <span className={badge(kpi.status || 'ACTIVE')}>{kpi.status || 'ACTIVE'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{kpi.metricType} • Target {kpi.targetValue}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'recruitment' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Create Job Position">
            <div className="grid gap-3">
              <input className="nx-input" placeholder="Job title" value={newJob.title} onChange={(e) => setNewJob((p) => ({ ...p, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="nx-input" placeholder="Location" value={newJob.location} onChange={(e) => setNewJob((p) => ({ ...p, location: e.target.value }))} />
                <input className="nx-input" placeholder="Employment Type" value={newJob.employmentType} onChange={(e) => setNewJob((p) => ({ ...p, employmentType: e.target.value }))} />
              </div>
              <button className="btn-primary justify-center" onClick={() => submit(() => api.post('/enterprise/recruitment/jobs', newJob))}>Post Job</button>
            </div>
          </SectionCard>

          <SectionCard title="Create Candidate">
            <div className="grid gap-3">
              <select className="nx-input" value={newCandidate.jobPositionId} onChange={(e) => setNewCandidate((p) => ({ ...p, jobPositionId: e.target.value }))}>
                <option value="">Select job position</option>
                {(jobs || []).map((j) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              <input className="nx-input" placeholder="Candidate full name" value={newCandidate.fullName} onChange={(e) => setNewCandidate((p) => ({ ...p, fullName: e.target.value }))} />
              <input className="nx-input" placeholder="Email" value={newCandidate.email} onChange={(e) => setNewCandidate((p) => ({ ...p, email: e.target.value }))} />
              <button className="btn-primary justify-center" onClick={() => submit(() => api.post('/enterprise/recruitment/candidates', newCandidate))}>Add Candidate</button>
            </div>
          </SectionCard>

          <SectionCard title="Open Job Positions">
            <div className="space-y-2">
              {(jobs || []).map((j) => (
                <div key={j.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-white font-semibold">{j.title}</p>
                    <span className={badge(j.status || 'OPEN')}>{j.status || 'OPEN'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{j.location || 'Location not set'}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Candidates">
            <div className="space-y-2">
              {(candidates || []).map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-white font-semibold">{c.fullName}</p>
                    <span className={badge(c.status || 'APPLIED')}>{c.status || 'APPLIED'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{c.email || 'No email'}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'onboarding' && (
        <SectionCard title="Onboarding Checklists">
          <div className="space-y-2">
            {(onboarding || []).map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white font-semibold">Employee ID: {item.employeeId}</p>
                  <p className="text-xs text-slate-400">Started: {new Date(item.startedAt).toLocaleDateString()}</p>
                </div>
                <span className={badge(item.status || 'IN_PROGRESS')}>{item.status || 'IN_PROGRESS'}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {tab === 'benefits' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Create Benefit Plan">
            <div className="grid gap-3">
              <input className="nx-input" placeholder="Plan name" value={newBenefit.name} onChange={(e) => setNewBenefit((p) => ({ ...p, name: e.target.value }))} />
              <input className="nx-input" placeholder="Category (HEALTH, TRANSPORT)" value={newBenefit.category} onChange={(e) => setNewBenefit((p) => ({ ...p, category: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="nx-input" type="number" placeholder="Employer Amount" value={newBenefit.employerAmount} onChange={(e) => setNewBenefit((p) => ({ ...p, employerAmount: Number(e.target.value) }))} />
                <input className="nx-input" type="number" placeholder="Employee Amount" value={newBenefit.employeeAmount} onChange={(e) => setNewBenefit((p) => ({ ...p, employeeAmount: Number(e.target.value) }))} />
              </div>
              <button className="btn-primary justify-center" onClick={() => submit(() => api.post('/enterprise/benefits/plans', newBenefit))}>Add Plan</button>
            </div>
          </SectionCard>
          <SectionCard title="Benefit Plans">
            <div className="space-y-2">
              {(benefitPlans || []).map((plan) => (
                <div key={plan.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-semibold">{plan.name}</p>
                    <p className="text-xs text-slate-400">{plan.category}</p>
                  </div>
                  <span className={badge(plan.status || 'ACTIVE')}>{plan.status || 'ACTIVE'}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'shifts' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Create Shift">
            <div className="grid gap-3">
              <input className="nx-input" placeholder="Shift name" value={newShift.name} onChange={(e) => setNewShift((p) => ({ ...p, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="nx-input" placeholder="Start time" value={newShift.startTime} onChange={(e) => setNewShift((p) => ({ ...p, startTime: e.target.value }))} />
                <input className="nx-input" placeholder="End time" value={newShift.endTime} onChange={(e) => setNewShift((p) => ({ ...p, endTime: e.target.value }))} />
              </div>
              <button className="btn-primary justify-center" onClick={() => submit(() => api.post('/enterprise/shifts', newShift))}>Add Shift</button>
            </div>
          </SectionCard>
          <SectionCard title="Shift List">
            <div className="space-y-2">
              {(shifts || []).map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="text-sm text-white font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.startTime} - {s.endTime} ({s.timezone})</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'announcements' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Create Announcement">
            <div className="grid gap-3">
              <input className="nx-input" placeholder="Title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement((p) => ({ ...p, title: e.target.value }))} />
              <textarea className="nx-input min-h-[110px]" placeholder="Content" value={newAnnouncement.content} onChange={(e) => setNewAnnouncement((p) => ({ ...p, content: e.target.value }))} />
              <select className="nx-input" value={newAnnouncement.targetAudience} onChange={(e) => setNewAnnouncement((p) => ({ ...p, targetAudience: e.target.value }))}>
                <option value="ALL">All employees</option>
                <option value="DEPARTMENT">Department</option>
                <option value="MANAGERS">Managers</option>
                <option value="EXECUTIVES">Executives</option>
              </select>
              <button className="btn-primary justify-center" onClick={() => submit(() => api.post('/enterprise/announcements', newAnnouncement))}>
                <Megaphone size={16} /> Publish
              </button>
            </div>
          </SectionCard>
          <SectionCard title="Published Announcements">
            <div className="space-y-2">
              {(announcements || []).map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white font-semibold">{a.title}</p>
                    <span className={badge(a.status || 'PUBLISHED')}>{a.status || 'PUBLISHED'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === 'tax' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Create Tax Rule">
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="nx-input" placeholder="Country Code" value={newTaxRule.countryCode} onChange={(e) => setNewTaxRule((p) => ({ ...p, countryCode: e.target.value }))} />
                <input className="nx-input" placeholder="Tax Type" value={newTaxRule.taxType} onChange={(e) => setNewTaxRule((p) => ({ ...p, taxType: e.target.value }))} />
              </div>
              <input className="nx-input" placeholder="Rule Name" value={newTaxRule.name} onChange={(e) => setNewTaxRule((p) => ({ ...p, name: e.target.value }))} />
              <button className="btn-primary justify-center" onClick={() => submit(() => api.post('/enterprise/tax/rules', newTaxRule))}>Add Tax Rule</button>
            </div>
          </SectionCard>
          <SectionCard title="Tax Rules">
            <div className="space-y-2">
              {(taxRules || []).map((rule) => (
                <div key={rule.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="text-sm text-white font-semibold">{rule.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{rule.countryCode} • {rule.taxType}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export default EnterpriseSuite;
