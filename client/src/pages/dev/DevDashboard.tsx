import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Styles injected into head ────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap');
  .dev-wrap * { box-sizing: border-box; }
  .dev-wrap { background: #020817; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; min-height: 100vh; }
  .dev-card { background: #0d1526; border: 1px solid rgba(59,130,246,0.12); border-radius: 14px; }
  .dev-card-inner { padding: 24px; }
  .dev-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px; color: #e2e8f0; padding: 10px 14px; font-family: inherit; font-size: 13px; outline: none; width: 100%; transition: border-color 0.15s; }
  .dev-input:focus { border-color: #3b82f6; }
  .dev-btn { border: none; border-radius: 8px; padding: 10px 18px; font-family: inherit; font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 7px; letter-spacing: 0.04em; }
  .dev-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .dev-btn-blue { background: #1d4ed8; color: white; } .dev-btn-blue:hover:not(:disabled) { background: #1e40af; }
  .dev-btn-red { background: #be123c; color: white; } .dev-btn-red:hover:not(:disabled) { background: #9f1239; }
  .dev-btn-green { background: #047857; color: white; } .dev-btn-green:hover:not(:disabled) { background: #065f46; }
  .dev-btn-amber { background: #92400e; color: white; } .dev-btn-amber:hover:not(:disabled) { background: #78350f; }
  .dev-btn-ghost { background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08); } .dev-btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  .dev-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .dev-table th { background: rgba(0,0,0,0.4); color: #475569; padding: 9px 14px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(59,130,246,0.08); }
  .dev-table td { padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; vertical-align: middle; }
  .dev-table tr:hover td { background: rgba(59,130,246,0.03); }
  .b-red { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.25); padding: 2px 9px; border-radius: 999px; font-size: 11px; white-space: nowrap; display: inline-block; }
  .b-green { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.25); padding: 2px 9px; border-radius: 999px; font-size: 11px; white-space: nowrap; display: inline-block; }
  .b-amber { background: rgba(245,158,11,0.12); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25); padding: 2px 9px; border-radius: 999px; font-size: 11px; white-space: nowrap; display: inline-block; }
  .b-blue { background: rgba(59,130,246,0.12); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); padding: 2px 9px; border-radius: 999px; font-size: 11px; white-space: nowrap; display: inline-block; }
  .stat-box { background: #0d1526; border: 1px solid rgba(59,130,246,0.1); border-radius: 12px; padding: 20px 24px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 9px; cursor: pointer; transition: all 0.15s; font-size: 13px; color: #64748b; font-weight: 600; letter-spacing: 0.02em; border: 1px solid transparent; }
  .nav-item:hover { background: rgba(255,255,255,0.04); color: #94a3b8; }
  .nav-item.active { background: rgba(59,130,246,0.12); color: #60a5fa; border-color: rgba(59,130,246,0.2); }
  .nav-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #334155; font-weight: 700; padding: 10px 16px 6px; }
  .alert-high { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 14px 18px; }
  .alert-med { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 10px; padding: 14px 18px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
`;

const devHeaders = (k: string) => ({ 'x-dev-master-key': k, 'Content-Type': 'application/json' });
type Tab = 'overview' | 'security' | 'payment' | 'subscriptions' | 'backups' | 'audit' | 'employees' | 'config';

const fmtDate = (d: string) => d ? new Date(d).toLocaleString() : '—';
const fmtBytes = (mb: number) => `${mb}MB`;

const DevDashboard = () => {
  const navigate = useNavigate();
  const devKey = localStorage.getItem('nexus_dev_key') || '';
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payConfig, setPayConfig] = useState<any>({});
  const [payForm, setPayForm] = useState({ paystackPublicKey: '', paystackSecretKey: '', monthlyPriceGHS: '299', annualPriceGHS: '2990', trialDays: '14' });
  const [subForm, setSubForm] = useState({ orgName: '', contactEmail: '', plan: 'TRIAL', priceGHS: '0' });
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [refreshInt, setRefreshInt] = useState(0);

  const devFetch = async (path: string, opts: any = {}) => {
    const res = await fetch(`/api/dev${path}`, {
      headers: devHeaders(devKey),
      ...opts
    });
    if (res.status === 403 || res.status === 401) { navigate('/nexus-dev-portal'); return null; }
    return res;
  };

  const showToast = (msg: string, ok = true) => {
    setToast(msg); setToastType(ok ? 'ok' : 'err');
    setTimeout(() => setToast(''), 4000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, backRes, auditRes, subsRes, payRes] = await Promise.all([
        devFetch('/stats'),
        devFetch('/security-alerts'),
        devFetch('/backups'),
        devFetch('/audit-log?limit=100'),
        devFetch('/subscriptions'),
        devFetch('/payment-config'),
      ]);
      if (statsRes?.ok) setStats(await statsRes.json());
      if (alertsRes?.ok) setAlerts(await alertsRes.json());
      if (backRes?.ok) setBackups(await backRes.json());
      if (auditRes?.ok) { const d = await auditRes.json(); setAuditLogs(d.logs || []); }
      if (subsRes?.ok) setSubs(await subsRes.json());
      if (payRes?.ok) {
        const pc = await payRes.json();
        setPayConfig(pc);
        setPayForm(f => ({ ...f, paystackPublicKey: pc.paystackPublicKey || '', monthlyPriceGHS: String(pc.monthlyPriceGHS || 299), annualPriceGHS: String(pc.annualPriceGHS || 2990), trialDays: String(pc.trialDays || 14) }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [devKey]);

  const loadEmployees = useCallback(async () => {
    const res = await devFetch('/users').catch(() => null);
    if (res?.ok) setEmployees(await res.json());
  }, [devKey]);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshInt]);

  useEffect(() => {
    if (tab === 'employees') loadEmployees();
  }, [tab, loadEmployees]);

  // ── Actions ────────────────────────────────────────────────────────────
  const triggerBackup = async () => {
    setBusy('backup');
    const res = await devFetch('/backup', { method: 'POST' });
    if (res?.ok) { showToast('Backup triggered ✓'); loadAll(); }
    else showToast('Backup failed', false);
    setBusy('');
  };

  const toggleKill = async (active: boolean) => {
    const msg = active ? 'Enable maintenance mode? Users will be locked out immediately.' : 'Disable maintenance mode?';
    if (!confirm(msg)) return;
    setBusy('kill');
    const res = await devFetch('/kill-switch', { method: 'POST', body: JSON.stringify({ active }) });
    if (res?.ok) { showToast(active ? 'Kill switch ACTIVATED — system locked' : 'System restored', !active); loadAll(); }
    setBusy('');
  };

  const toggleLockdown = async () => {
    if (!confirm('Toggle security lockdown? This will restrict all non-admin actions.')) return;
    setBusy('lockdown');
    const current = stats?.settings?.securityLockdown;
    const res = await devFetch('/security-lockdown', { method: 'POST', body: JSON.stringify({ active: !current }) });
    if (res?.ok) { showToast(`Security lockdown ${!current ? 'ENABLED' : 'disabled'}`); loadAll(); }
    setBusy('');
  };

  const forceLogout = async () => {
    if (!confirm('Force logout ALL users? They will need to re-login. Maintenance mode activates for 30 seconds.')) return;
    setBusy('logout');
    const res = await devFetch('/force-logout-all', { method: 'POST' });
    if (res?.ok) { showToast('All sessions invalidated'); loadAll(); }
    setBusy('');
  };

  const savePayment = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy('pay');
    const res = await devFetch('/payment-config', { method: 'POST', body: JSON.stringify(payForm) });
    if (res?.ok) { showToast('Payment config saved ✓'); loadAll(); }
    else showToast('Save failed', false);
    setBusy('');
  };

  const createSub = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy('sub');
    const res = await devFetch('/subscriptions', { method: 'POST', body: JSON.stringify(subForm) });
    if (res?.ok) { showToast('Subscription created'); setSubForm({ orgName: '', contactEmail: '', plan: 'TRIAL', priceGHS: '0' }); loadAll(); }
    else showToast('Failed', false);
    setBusy('');
  };

  const updateSub = async (id: string, data: any) => {
    const res = await devFetch(`/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    if (res?.ok) { showToast('Updated'); loadAll(); }
  };

  const logout = () => { localStorage.removeItem('nexus_dev_key'); navigate('/nexus-dev-portal'); };

  // ── Render helpers ─────────────────────────────────────────────────────
  const sys = stats?.system;
  const cnt = stats?.counts;
  const isLocked = stats?.settings?.isMaintenanceMode;
  const isLockdown = stats?.settings?.securityLockdown;

  const TABS: Array<{ id: Tab; label: string; dot?: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'security', label: 'Security', dot: (alerts?.alerts?.length > 0) ? '#ef4444' : undefined },
    { id: 'payment', label: 'Payment Config' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'employees', label: 'Employees' },
    { id: 'backups', label: 'Backups' },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="dev-wrap">
      <style>{STYLE}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toastType === 'ok' ? '#064e3b' : '#7f1d1d', border: `1px solid ${toastType === 'ok' ? '#065f46' : '#991b1b'}`, borderRadius: 10, padding: '12px 20px', fontSize: 13, color: 'white', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxWidth: 340 }}>
          <span>{toastType === 'ok' ? '✓' : '✗'}</span> {toast}
        </div>
      )}

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div style={{ width: 220, background: '#060e1c', borderRight: '1px solid rgba(59,130,246,0.08)', padding: '0 12px 24px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 8px 20px', borderBottom: '1px solid rgba(59,130,246,0.08)', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.01em' }}>NEXUS DEV</div>
                <div style={{ fontSize: 10, color: '#334155' }}>System Portal</div>
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div style={{ padding: '8px 8px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLocked ? '#ef4444' : '#10b981', animation: isLocked ? 'pulse 1s infinite' : 'none' }} />
              <span style={{ fontSize: 11, color: isLocked ? '#f87171' : '#34d399' }}>{isLocked ? 'MAINTENANCE MODE' : 'System Online'}</span>
            </div>
            {isLockdown && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: 11, color: '#fbbf24' }}>SECURITY LOCKDOWN</span>
              </div>
            )}
          </div>

          <div className="section-title">Navigation</div>
          {TABS.map(t => (
            <div key={t.id} className={`nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <div className="nav-dot" />
              {t.label}
              {t.dot && <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: t.dot }} />}
            </div>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <div className="section-title">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
              <button className="dev-btn dev-btn-amber" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
                onClick={() => toggleKill(!isLocked)} disabled={busy === 'kill'}>
                {isLocked ? '◉ Restore System' : '⊘ Kill Switch'}
              </button>
              <button className="dev-btn dev-btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
                onClick={() => { setRefreshInt(x => x + 1); }}>⟳ Refresh</button>
            </div>
            <button className="dev-btn dev-btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 11 }} onClick={logout}>← Logout Portal</button>
          </div>
        </div>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
              <div style={{ width: 32, height: 32, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* ── OVERVIEW ─────────────────────────────────────────── */}
              {tab === 'overview' && (
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 6, letterSpacing: '-0.02em' }}>System Overview</h1>
                  <p style={{ color: '#475569', fontSize: 12, marginBottom: 28 }}>
                    Node {sys?.nodeVersion} · {sys?.platform}/{sys?.arch} · Uptime: {Math.floor((sys?.uptimeSeconds || 0) / 3600)}h {Math.floor(((sys?.uptimeSeconds || 0) % 3600) / 60)}m
                  </p>

                  {/* Alerts */}
                  {alerts?.alerts?.map((a: any) => (
                    <div key={a.msg} className={a.level === 'HIGH' ? 'alert-high' : 'alert-med'} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 16 }}>{a.level === 'HIGH' ? '🚨' : '⚠️'}</span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 12, color: a.level === 'HIGH' ? '#f87171' : '#fbbf24' }}>[{a.level}] </span>
                        <span style={{ fontSize: 12, color: '#e2e8f0' }}>{a.msg}</span>
                      </div>
                    </div>
                  ))}

                  {/* Stats grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
                    {[
                      { label: 'Total Users', value: cnt?.totalUsers, color: '#60a5fa' },
                      { label: 'Active Users', value: cnt?.activeUsers, color: '#34d399' },
                      { label: 'KPI Sheets', value: cnt?.kpiSheets, color: '#a78bfa' },
                      { label: 'Leave Requests', value: cnt?.leaveRequests, color: '#fbbf24' },
                      { label: 'Payroll Runs', value: cnt?.payrollRuns, color: '#fb923c' },
                      { label: 'Audit Logs', value: cnt?.auditLogs, color: '#94a3b8' },
                    ].map(s => (
                      <div key={s.label} className="stat-box">
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-0.03em', marginBottom: 4 }}>{s.value ?? '—'}</div>
                        <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* System resources */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                    <div className="dev-card dev-card-inner">
                      <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Memory Usage</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{sys?.memoryPct}%</div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ height: '100%', width: `${sys?.memoryPct}%`, background: sys?.memoryPct > 80 ? '#ef4444' : '#3b82f6', borderRadius: 9999, transition: 'width 1s ease' }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{fmtBytes(sys?.memoryUsedMB)} / {fmtBytes(sys?.memoryTotalMB)} · Heap: {fmtBytes(sys?.processMemMB)}</div>
                    </div>
                    <div className="dev-card dev-card-inner">
                      <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>CPU Load Average</div>
                      {[1, 5, 15].map((min, i) => (
                        <div key={min} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: '#475569' }}>{min}m avg</span>
                          <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>{sys?.cpuLoad?.[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent audit */}
                  <div className="dev-card">
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(59,130,246,0.08)', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Activity</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="dev-table">
                        <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
                        <tbody>
                          {(stats?.recentAudit || []).slice(0, 10).map((log: any) => (
                            <tr key={log.id}>
                              <td style={{ color: '#475569' }}>{fmtDate(log.createdAt)}</td>
                              <td style={{ color: '#e2e8f0' }}>{log.actor?.fullName || 'System'}</td>
                              <td><span className="b-blue">{log.action}</span></td>
                              <td style={{ color: '#64748b' }}>{log.resourceType}</td>
                              <td style={{ color: '#334155' }}>{log.ipAddress || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECURITY ─────────────────────────────────────────── */}
              {tab === 'security' && (
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 24, letterSpacing: '-0.02em' }}>Security Control</h1>

                  {/* Threat alerts */}
                  {alerts?.alerts?.length > 0 ? (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Active Alerts</div>
                      {alerts.alerts.map((a: any) => (
                        <div key={a.msg} className={a.level === 'HIGH' ? 'alert-high' : 'alert-med'} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: a.level === 'HIGH' ? '#f87171' : '#fbbf24' }}>{a.msg}</span>
                          <span className={a.level === 'HIGH' ? 'b-red' : 'b-amber'}>{a.level}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#34d399' }}>
                      ✓ No active security alerts detected
                    </div>
                  )}

                  {/* Active sessions */}
                  <div className="dev-card" style={{ marginBottom: 24 }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(59,130,246,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Sessions (last 8h)</span>
                      <span style={{ fontSize: 11, color: '#60a5fa' }}>{alerts?.activeSessions ?? 0} users</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="dev-table">
                        <thead><tr><th>User</th><th>Role</th><th>Last Action</th><th>Time</th></tr></thead>
                        <tbody>
                          {(alerts?.recentActivity || []).slice(0, 15).map((u: any) => (
                            <tr key={u.id}>
                              <td style={{ color: '#e2e8f0' }}>{u.actor?.fullName || '—'}</td>
                              <td><span className="b-blue">{u.actor?.role}</span></td>
                              <td><span className="b-blue">{u.action}</span></td>
                              <td style={{ color: '#475569' }}>{fmtDate(u.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Security controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[
                      { label: 'Kill Switch', desc: isLocked ? 'System is in maintenance mode — users locked out' : 'Immediately locks out all users. Use in emergencies.', btnLabel: isLocked ? '◉ Restore System' : '⊘ Activate Kill Switch', danger: !isLocked, action: () => toggleKill(!isLocked), busy: busy === 'kill' },
                      { label: 'Security Lockdown', desc: isLockdown ? 'Lockdown active — non-admin actions restricted' : 'Restricts all write operations for non-admin users.', btnLabel: isLockdown ? '⊘ Disable Lockdown' : '⊘ Activate Lockdown', danger: !isLockdown, action: () => toggleLockdown(), busy: busy === 'lockdown' },
                      { label: 'Force Logout All', desc: 'Invalidates all active JWTs immediately. Users must re-login.', btnLabel: '⊘ Force Logout', danger: true, action: forceLogout, busy: busy === 'logout' },
                    ].map(ctrl => (
                      <div key={ctrl.label} className="dev-card dev-card-inner">
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{ctrl.label}</div>
                        <p style={{ fontSize: 12, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>{ctrl.desc}</p>
                        <button className={`dev-btn ${ctrl.danger ? 'dev-btn-red' : 'dev-btn-green'}`}
                          onClick={ctrl.action} disabled={ctrl.busy}>
                          {ctrl.busy ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> : null}
                          {ctrl.btnLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PAYMENT CONFIG ───────────────────────────────────── */}
              {tab === 'payment' && (
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8, letterSpacing: '-0.02em' }}>Payment Configuration</h1>
                  <p style={{ color: '#475569', fontSize: 12, marginBottom: 28 }}>Configure Paystack keys and subscription pricing. Secret keys are write-only and never returned.</p>

                  {payConfig.paystackSecretKeySet ? (
                    <div className="b-green" style={{ marginBottom: 20, padding: '8px 16px', borderRadius: 8 }}>
                      ✓ Paystack secret key set — {payConfig.paystackSecretKeyMasked}
                    </div>
                  ) : (
                    <div className="b-amber" style={{ marginBottom: 20, padding: '8px 16px', borderRadius: 8 }}>
                      ⚠ Paystack secret key not configured — payments will not process
                    </div>
                  )}

                  <form onSubmit={savePayment}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                      <div className="dev-card dev-card-inner">
                        <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Paystack Keys</div>
                        {[
                          { key: 'paystackPublicKey', label: 'Public Key (pk_live_...)', placeholder: 'pk_live_...' },
                          { key: 'paystackSecretKey', label: 'Secret Key (sk_live_...) — leave blank to keep existing', placeholder: 'sk_live_... (write-only)' },
                        ].map(f => (
                          <div key={f.key} style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6 }}>{f.label}</label>
                            <input type={f.key.includes('Secret') ? 'password' : 'text'} className="dev-input"
                              placeholder={f.placeholder}
                              value={(payForm as any)[f.key]}
                              onChange={e => setPayForm(p => ({ ...p, [f.key]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                      <div className="dev-card dev-card-inner">
                        <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Pricing (GHS)</div>
                        {[
                          { key: 'monthlyPriceGHS', label: 'Monthly Subscription Price (GHS)' },
                          { key: 'annualPriceGHS', label: 'Annual Subscription Price (GHS)' },
                          { key: 'trialDays', label: 'Free Trial Duration (days)' },
                        ].map(f => (
                          <div key={f.key} style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6 }}>{f.label}</label>
                            <input type="number" className="dev-input"
                              value={(payForm as any)[f.key]}
                              onChange={e => setPayForm(p => ({ ...p, [f.key]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="dev-btn dev-btn-green" disabled={busy === 'pay'}>
                      {busy === 'pay' && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
                      Save Payment Config
                    </button>
                  </form>

                  {/* Paystack integration guide */}
                  <div className="dev-card dev-card-inner" style={{ marginTop: 28 }}>
                    <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Integration Notes</div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
                      <p style={{ marginBottom: 8 }}>• Get keys from: <span style={{ color: '#60a5fa' }}>https://dashboard.paystack.com/#/settings/keys</span></p>
                      <p style={{ marginBottom: 8 }}>• Webhook URL to configure: <span style={{ color: '#60a5fa' }}>https://your-api.com/api/payment/webhook</span></p>
                      <p style={{ marginBottom: 8 }}>• Use <span style={{ color: '#34d399' }}>pk_test_</span> / <span style={{ color: '#34d399' }}>sk_test_</span> for development, <span style={{ color: '#fbbf24' }}>pk_live_</span> / <span style={{ color: '#fbbf24' }}>sk_live_</span> for production</p>
                      <p>• For card payments, the MD settings page shows the payment button using the public key — no secret key is exposed client-side</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUBSCRIPTIONS ────────────────────────────────────── */}
              {tab === 'subscriptions' && (
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 24, letterSpacing: '-0.02em' }}>Subscriptions</h1>

                  {/* Create form */}
                  <div className="dev-card dev-card-inner" style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>New Subscription</div>
                    <form onSubmit={createSub}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                        {[
                          { key: 'orgName', label: 'Organisation Name', placeholder: 'Acme Corp' },
                          { key: 'contactEmail', label: 'Contact Email', placeholder: 'admin@acme.com' },
                        ].map(f => (
                          <div key={f.key}>
                            <label style={{ display: 'block', fontSize: 10, color: '#475569', marginBottom: 5 }}>{f.label}</label>
                            <input className="dev-input" placeholder={f.placeholder}
                              value={(subForm as any)[f.key]}
                              onChange={e => setSubForm(s => ({ ...s, [f.key]: e.target.value }))} />
                          </div>
                        ))}
                        <div>
                          <label style={{ display: 'block', fontSize: 10, color: '#475569', marginBottom: 5 }}>Plan</label>
                          <select className="dev-input" value={subForm.plan} onChange={e => setSubForm(s => ({ ...s, plan: e.target.value }))}>
                            {['TRIAL', 'MONTHLY', 'ANNUALLY'].map(p => <option key={p}>{p}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 10, color: '#475569', marginBottom: 5 }}>Price (GHS)</label>
                          <input type="number" className="dev-input" value={subForm.priceGHS}
                            onChange={e => setSubForm(s => ({ ...s, priceGHS: e.target.value }))} />
                        </div>
                      </div>
                      <button type="submit" className="dev-btn dev-btn-blue" disabled={busy === 'sub'}>+ Create Subscription</button>
                    </form>
                  </div>

                  {/* Subs table */}
                  <div className="dev-card">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="dev-table">
                        <thead><tr><th>Org / Client</th><th>Plan</th><th>Price</th><th>Status</th><th>Period End</th><th>Actions</th></tr></thead>
                        <tbody>
                          {subs.map(s => (
                            <tr key={s.id}>
                              <td>
                                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{s.orgName || '—'}</div>
                                <div style={{ color: '#475569', fontSize: 11 }}>{s.contactEmail}</div>
                              </td>
                              <td><span className="b-blue">{s.plan}</span></td>
                              <td style={{ color: '#34d399' }}>GHS {s.priceGHS}</td>
                              <td><span className={s.status === 'ACTIVE' ? 'b-green' : s.status === 'TRIAL' ? 'b-amber' : s.status === 'EXPIRED' ? 'b-red' : 'b-blue'}>{s.status}</span></td>
                              <td style={{ color: '#475569', fontSize: 11 }}>{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="dev-btn dev-btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => updateSub(s.id, { status: 'ACTIVE' })}>Activate</button>
                                  <button className="dev-btn dev-btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => updateSub(s.id, { status: 'EXPIRED' })}>Expire</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {subs.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#334155', padding: '32px' }}>No subscriptions yet</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── EMPLOYEES ────────────────────────────────────────── */}
              {tab === 'employees' && (
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8, letterSpacing: '-0.02em' }}>All Employees</h1>
                  <p style={{ color: '#475569', fontSize: 12, marginBottom: 24 }}>Read-only employee overview from dev perspective</p>
                  <div className="dev-card">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="dev-table">
                        <thead><tr><th>Code</th><th>Name</th><th>Role</th><th>Department</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead>
                        <tbody>
                          {employees.map((e: any) => (
                            <tr key={e.id}>
                              <td style={{ color: '#475569' }}>{e.employeeCode || '—'}</td>
                              <td style={{ color: '#e2e8f0', fontWeight: 600 }}>{e.fullName}</td>
                              <td><span className="b-blue">{e.role}</span></td>
                              <td style={{ color: '#64748b' }}>{e.department || '—'}</td>
                              <td style={{ color: '#475569' }}>{e.email}</td>
                              <td><span className={e.status === 'ACTIVE' ? 'b-green' : 'b-amber'}>{e.status}</span></td>
                              <td style={{ color: '#334155', fontSize: 11 }}>{e.joinDate ? new Date(e.joinDate).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── BACKUPS ──────────────────────────────────────────── */}
              {tab === 'backups' && (
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8, letterSpacing: '-0.02em' }}>Backup Management</h1>
                  <p style={{ color: '#475569', fontSize: 12, marginBottom: 24 }}>Automated 12h backups via cron. Stored in /public/backups/. Download to keep off-server copies.</p>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <button className="dev-btn dev-btn-green" onClick={triggerBackup} disabled={busy === 'backup'}>
                      {busy === 'backup' && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
                      ▶ Trigger Backup Now
                    </button>
                    <button className="dev-btn dev-btn-ghost" onClick={loadAll}>⟳ Refresh</button>
                  </div>
                  <div className="dev-card">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="dev-table">
                        <thead><tr><th>Filename</th><th>Size</th><th>Date</th><th>Download</th></tr></thead>
                        <tbody>
                          {(Array.isArray(backups) ? backups : []).map((b: any) => (
                            <tr key={b.name || b}>
                              <td style={{ color: '#e2e8f0' }}>{b.name || b}</td>
                              <td style={{ color: '#475569' }}>{b.size ? `${(b.size / 1024).toFixed(1)} KB` : '—'}</td>
                              <td style={{ color: '#475569', fontSize: 11 }}>{b.created ? fmtDate(b.created) : '—'}</td>
                              <td>
                                <a href={`/api/dev/backups/${b.name || b}`}
                                  onClick={e => { e.preventDefault(); window.open(`/api/dev/backups/${b.name || b}?key=${encodeURIComponent(devKey)}`); }}
                                  className="dev-btn dev-btn-ghost" style={{ fontSize: 11, padding: '5px 10px', textDecoration: 'none' }}>
                                  ↓ Download
                                </a>
                              </td>
                            </tr>
                          ))}
                          {(!backups || backups.length === 0) && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#334155', padding: '32px' }}>No backups found. Trigger one above.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── AUDIT LOG ────────────────────────────────────────── */}
              {tab === 'audit' && (
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8, letterSpacing: '-0.02em' }}>Full Audit Log</h1>
                  <p style={{ color: '#475569', fontSize: 12, marginBottom: 24 }}>Every write action in the system is logged here with actor, IP, and resource.</p>
                  <div className="dev-card">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="dev-table">
                        <thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
                        <tbody>
                          {auditLogs.map((log: any) => (
                            <tr key={log.id}>
                              <td style={{ color: '#334155', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</td>
                              <td style={{ color: '#94a3b8' }}>{log.actor?.fullName || 'System'}</td>
                              <td><span className="b-blue">{log.actor?.role || '—'}</span></td>
                              <td><span className={log.action.includes('DELETE') || log.action.includes('VOID') ? 'b-red' : log.action.includes('APPROVED') || log.action.includes('LOGIN') ? 'b-green' : 'b-blue'}>{log.action}</span></td>
                              <td style={{ color: '#64748b' }}>{log.resourceType} {log.resourceId?.slice(0, 8)}</td>
                              <td style={{ color: '#334155' }}>{log.ipAddress || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default DevDashboard;
