import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, Plus, Download, CheckCircle, FileText,
  Loader2, X, Edit2, Save, Ban, BarChart3, Globe,
  TrendingUp, CreditCard, ShieldCheck, Wallet, ArrowRight,
  TrendingDown, PieChart, Activity
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'GNF'];

const statusColors: Record<string, { badge: string; dot: string }> = {
  DRAFT:     { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: '#f59e0b' },
  APPROVED:  { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: '#10b981' },
  PAID:      { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     dot: '#6366f1' },
  CANCELLED: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',   dot: '#f43f5e' },
};

const currencyTheme: Record<string, string> = {
  GHS: 'text-primary-light border-primary/30 bg-primary/5',
  USD: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
  EUR: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  GBP: 'text-rose-400 border-rose-500/30 bg-rose-500/5',
  GNF: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
};

const fmt = (n: number | string, currency = '') =>
  `${currency ? currency + ' ' : ''}${Number(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface EditingItem { id: string; overtime: string; bonus: string; allowances: string; otherDeductions: string; notes: string; }

const Payroll = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [yearlySummary, setYearlySummary] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [activeView, setActiveView] = useState<'runs' | 'payslips' | 'summary'>('runs');

  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({ month: String(new Date().getMonth() + 1), year: String(currentYear) });

  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const isAdmin = ['MD', 'HR_ADMIN'].includes(user.role);
  const isMD = user.role === 'MD';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [slipRes] = await Promise.all([api.get('/payroll/my-payslips')]);
      setMyPayslips(slipRes.data);

      if (isAdmin) {
        const [runRes, summaryRes] = await Promise.all([
          api.get('/payroll'),
          api.get(`/payroll/summary?year=${currentYear}`)
        ]);
        setRuns(runRes.data.runs || []);
        setYearlySummary(summaryRes.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isAdmin, currentYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadRunDetail = async (runId: string) => {
    const res = await api.get(`/payroll/${runId}`);
    setSelectedRun(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/payroll/run', form);
      setShowCreate(false); fetchData();
    } catch (err: any) { setError(err?.response?.data?.error || 'Protocol Error: Sync failed'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (runId: string) => {
    try {
      await api.post(`/payroll/${runId}/approve`);
      fetchData(); if (selectedRun?.id === runId) loadRunDetail(runId);
    } catch (err: any) { alert(err?.response?.data?.error || 'Authorization protocol failure'); }
  };

  const handleVoid = async (runId: string) => {
    try {
      await api.post(`/payroll/${runId}/void`);
      fetchData(); setSelectedRun(null);
    } catch (err: any) { alert(err?.response?.data?.error || 'Authorization protocol failure'); }
  };

  const startEditItem = (item: any) => {
    setEditingItem({
      id: item.id,
      overtime: String(item.overtime || 0),
      bonus: String(item.bonus || 0),
      allowances: String(item.allowances || 0),
      otherDeductions: String(item.otherDeductions || 0),
      notes: item.notes || ''
    });
  };

  const saveItem = async () => {
    if (!editingItem) return;
    setSavingItem(true);
    try {
      await api.patch(`/payroll/items/${editingItem.id}`, {
        overtime: parseFloat(editingItem.overtime) || 0,
        bonus: parseFloat(editingItem.bonus) || 0,
        allowances: parseFloat(editingItem.allowances) || 0,
        otherDeductions: parseFloat(editingItem.otherDeductions) || 0,
        notes: editingItem.notes
      });
      setEditingItem(null);
      if (selectedRun) loadRunDetail(selectedRun.id);
    } catch (err: any) { alert(err?.response?.data?.error || 'Data integrity failure'); }
    finally { setSavingItem(false); }
  };

  const downloadCSV = (runId: string) => window.open(`/api/payroll/${runId}/export/csv`, '_blank');
  const downloadPayslip = (runId: string, empId: string) => window.open(`/api/payroll/payslip/${runId}/${empId}/pdf`, '_blank');

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Payroll</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <CreditCard size={14} className="text-primary-light" />
            Manage company payroll and compensation
          </p>
        </div>
        {isAdmin && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs" 
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} /> Run Payroll
          </motion.button>
        )}
      </div>

      {isAdmin && (
        <div className="flex gap-2 p-1.5 rounded-2xl w-fit glass border-white/[0.05]">
          {([['runs', 'Payroll Runs'], ['payslips', 'My Payslips'], ['summary', 'Payroll Summary']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setActiveView(v)}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeView === v ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"
              )}>
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
           <Loader2 size={32} className="animate-spin text-primary-light" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading payroll data...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* ── Personal Archive ──────────────────────────────────────────────────── */}
            {(!isAdmin || activeView === 'payslips') && (
              <div className="glass overflow-hidden border-white/[0.05]">
                <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02] flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">My Payslips History</h2>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-light shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                </div>
                {myPayslips.length === 0 ? (
                  <div className="py-24 text-center">
                     <Wallet size={48} className="mx-auto mb-4 opacity-10 text-slate-300" />
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No payslips found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="nx-table">
                      <thead>
                        <tr className="bg-white/[0.01]">
                          <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Month</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Gross Pay</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Tax</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">SSNIT</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Net Pay</th>
                          <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Download</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {myPayslips.map((slip: any) => (
                          <tr key={slip.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-8 py-5">
                               <div className="flex items-center gap-3">
                                 <Calendar size={14} className="text-primary-light" />
                                 <span className="text-xs font-black uppercase tracking-widest text-white">{slip.run?.period}</span>
                               </div>
                            </td>
                            <td className="px-6 py-5 text-xs font-medium text-slate-300">{fmt(slip.grossPay, slip.currency)}</td>
                            <td className="px-6 py-5 text-xs font-black text-rose-500">-{fmt(slip.tax, slip.currency)}</td>
                            <td className="px-6 py-5 text-xs font-black text-amber-500">-{fmt(slip.ssnit, slip.currency)}</td>
                            <td className="px-6 py-5 pt-6">
                               <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-sm w-fit shadow-lg shadow-emerald-500/5">
                                  {fmt(slip.netPay, slip.currency)}
                               </div>
                            </td>
                            <td className="px-6 py-5">
                              <motion.button 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => downloadPayslip(slip.runId, user.id)}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary-light hover:bg-primary/20 transition-all shadow-lg"
                              >
                                <FileText size={18} />
                              </motion.button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Financial Intelligence ─────────────────────────────────────────────────── */}
            {isAdmin && activeView === 'summary' && (
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                   <BarChart3 size={20} className="text-primary-light" />
                   <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Year-to-Date Payroll Summary ({currentYear})</h2>
                </div>
                {Object.keys(yearlySummary).length === 0 ? (
                  <div className="glass p-24 text-center border-white/[0.05]">
                    <PieChart size={48} className="mx-auto mb-4 opacity-10 text-slate-300" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No payroll data available for summary</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Object.entries(yearlySummary).map(([currency, s]: any) => (
                      <motion.div 
                        key={currency} 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass p-8 relative overflow-hidden group"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                          <Globe size={80} className="text-white" />
                        </div>
                        <div className="flex items-center gap-4 mb-10">
                          <div className={cn("px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] border", currencyTheme[currency] || 'text-slate-400 border-white/10')}>
                            {currency} Payroll
                          </div>
                        </div>
                        <div className="space-y-6 relative">
                          {[
                            { label: 'Gross Pay', value: s.gross, icon: TrendingUp, color: 'text-slate-300' },
                            { label: 'Total Tax', value: s.tax, icon: TrendingDown, color: 'text-rose-500' },
                            { label: 'Total SSNIT', value: s.ssnit, icon: ShieldCheck, color: 'text-amber-500' },
                            { label: 'Total Net Pay', value: s.net, icon: DollarSign, color: 'text-emerald-400' },
                          ].map(row => (
                            <div key={row.label} className="flex items-center justify-between group/row">
                              <div className="flex items-center gap-3">
                                 <row.icon size={14} className="text-slate-500 group-hover/row:text-primary transition-colors" />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{row.label}</span>
                              </div>
                              <span className={cn("font-bold text-sm tracking-tight", row.color)}>
                                {fmt(row.value, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                           <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700">Payslips Count: {s.count}</span>
                           <div className="flex gap-1">
                              {Array.from({length: 3}).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-primary/20" />)}
                           </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Payroll Cycles ─────────────────────────────────────────────────── */}
            {isAdmin && activeView === 'runs' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Cycle Registry */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="flex items-center gap-3 ml-2">
                    <Activity size={18} className="text-primary-light" />
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Payroll Runs History</h2>
                  </div>
                  <div className="space-y-4">
                    {runs.map((run: any) => (
                      <motion.div 
                        key={run.id}
                        whileHover={{ x: 5 }}
                        onClick={() => loadRunDetail(run.id)}
                        className={cn(
                          "p-6 rounded-[1.5rem] cursor-pointer transition-all border relative overflow-hidden",
                          selectedRun?.id === run.id 
                            ? "bg-primary/10 border-primary/30 shadow-2xl shadow-primary/10" 
                            : "glass border-white/[0.05] hover:border-white/10"
                        )}>
                        {selectedRun?.id === run.id && (
                          <motion.div layoutId="run-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                        )}
                        <div className="flex items-center justify-between mb-4">
                          <p className="font-black text-lg text-white font-display tracking-tight">{run.period}</p>
                          <span className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border", statusColors[run.status]?.badge)}>
                             {run.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <span>Created: {new Date(run.createdAt).toLocaleDateString()}</span>
                          <span className="text-primary-light">Total Net: {Number(run.totalNet).toLocaleString()}</span>
                        </div>
                      </motion.div>
                    ))}
                    {runs.length === 0 && (
                      <div className="glass p-12 text-center rounded-[2rem] border-white/[0.05]">
                         <DollarSign size={32} className="mx-auto mb-3 opacity-10" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No payroll runs found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail Orchestrator */}
                <div className="lg:col-span-8">
                  {selectedRun ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass overflow-hidden border-white/[0.05] bg-[#0a0f1e]/40 p-10 space-y-10"
                    >
                      <div className="flex flex-col md:flex-row items-start justify-between gap-6 pb-10 border-b border-white/5">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h2 className="text-4xl font-black text-white font-display tracking-tighter uppercase">{selectedRun.period}</h2>
                          </div>
                          <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border shadow-sm", statusColors[selectedRun.status]?.badge)}>
                            Operational State: {statusColors[selectedRun.status]?.badge.includes('success') ? 'Finalized' : selectedRun.status}
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            onClick={() => downloadCSV(selectedRun.id)} 
                            className="glass px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white border-white/[0.05] flex items-center gap-2"
                          >
                            <Download size={14} /> Export CSV
                          </motion.button>
                          {isMD && selectedRun.status === 'DRAFT' && (
                            <div className="flex gap-3">
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                onClick={() => handleApprove(selectedRun.id)} 
                                className="btn-primary px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center gap-2"
                              >
                                <CheckCircle size={14} /> Authorize Cycle
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                onClick={() => handleVoid(selectedRun.id)} 
                                className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all flex items-center gap-2"
                              >
                                <Ban size={14} /> Void Run
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Summary Telemetry */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                          { label: 'Personnel Assigned', value: selectedRun.items?.length || 0, icon: Users, color: 'text-primary-light' },
                          { label: 'Baseline Σ (Gross)', value: Number(selectedRun.totalGross).toLocaleString(), icon: TrendingUp, color: 'text-white' },
                          { label: 'Net Disbursal Σ', value: Number(selectedRun.totalNet).toLocaleString(), icon: DollarSign, color: 'text-emerald-400' },
                        ].map(s => (
                          <div key={s.label} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.03] space-y-3">
                            <div className="flex items-center gap-2 text-slate-600">
                               <s.icon size={12} />
                               <p className="text-[9px] font-black uppercase tracking-widest">{s.label}</p>
                            </div>
                            <p className={cn("text-2xl font-black font-display tracking-tight", s.color)}>{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Detail Ledger */}
                      <div className="space-y-6">
                         <div className="flex items-center justify-between px-2">
                           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Personnel Ledger Entries</h3>
                         </div>
                         <div className="overflow-x-auto custom-scrollbar">
                           <table className="nx-table">
                             <thead>
                                <tr className="bg-white/[0.01]">
                                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Personnel</th>
                                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Baseline</th>
                                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Adjustments</th>
                                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Tax/SS</th>
                                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Net Allocation</th>
                                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600 text-right">Ledger</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-white/[0.02]">
                               {selectedRun.items?.map((item: any) => {
                                 const isEditing = editingItem?.id === item.id;
                                 const extras = Number(item.overtime) + Number(item.bonus) + Number(item.allowances);
                                 return (
                                   <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                                     <td className="px-6 py-5">
                                       <p className="font-bold text-xs text-white group-hover:text-primary-light transition-colors">{item.employee.fullName}</p>
                                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{item.employee.jobTitle}</p>
                                     </td>
                                     <td className="px-4 py-5 text-xs font-medium text-slate-400">{fmt(item.baseSalary, item.currency)}</td>
                                     <td className="px-4 py-5">
                                       {extras > 0 ? (
                                         <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">+{fmt(extras)}</span>
                                       ) : <span className="text-[10px] font-bold text-slate-700">BASELINE</span>}
                                     </td>
                                     <td className="px-4 py-5 text-[10px] font-bold text-rose-500">-{fmt(Number(item.tax) + Number(item.ssnit))}</td>
                                     <td className="px-4 py-5 font-black text-xs text-white">{fmt(item.netPay, item.currency)}</td>
                                     <td className="px-6 py-5 text-right">
                                       <div className="flex justify-end gap-2">
                                          {selectedRun.status === 'DRAFT' && isMD && (
                                            !isEditing ? (
                                              <button onClick={() => startEditItem(item)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-slate-500 hover:text-primary-light"><Edit2 size={12} /></button>
                                            ) : (
                                              <div className="flex gap-1">
                                                <button onClick={saveItem} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><Save size={12} /></button>
                                                <button onClick={() => setEditingItem(null)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20"><X size={12} /></button>
                                              </div>
                                            )
                                          )}
                                          <button onClick={() => downloadPayslip(selectedRun.id, item.employeeId)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-slate-500 hover:text-white"><FileText size={12} /></button>
                                       </div>
                                     </td>
                                   </tr>
                                 );
                               })}
                             </tbody>
                           </table>
                         </div>
                      </div>

                      {/* High-fidelity edit panel */}
                      <AnimatePresence>
                        {editingItem && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 relative group"
                          >
                            <div className="flex items-center gap-3 mb-8">
                               <ShieldCheck size={18} className="text-primary-light" />
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Advanced Adjustment Protocol: {selectedRun.items?.find((i:any)=>i.id === editingItem.id)?.employee.fullName}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                              {(['overtime', 'bonus', 'allowances', 'otherDeductions'] as const).map(field => (
                                <div key={field} className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                                    {field === 'otherDeductions' ? 'Deductions Σ' : field + ' Σ'}
                                  </label>
                                  <input type="number" className="nx-input p-3 text-sm font-black text-primary-light" step="0.01" min="0"
                                    value={editingItem[field]}
                                    onChange={e => setEditingItem(prev => prev ? { ...prev, [field]: e.target.value } : null)}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Ledger Notes</label>
                               <input className="nx-input p-3 text-xs font-medium" placeholder="Operational rationale for adjustments..." value={editingItem.notes}
                                 onChange={e => setEditingItem(prev => prev ? { ...prev, notes: e.target.value } : null)} />
                            </div>
                            <div className="mt-8 flex justify-end">
                               <motion.button 
                                 whileHover={{ scale: 1.02 }}
                                 whileTap={{ scale: 0.98 }}
                                 onClick={saveItem} disabled={savingItem}
                                 className="btn-primary px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                               >
                                 {savingItem ? 'Processing LEDGER...' : 'Commit Baseline Adjustments'}
                               </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <div className="glass h-full min-h-[500px] flex flex-col items-center justify-center p-20 text-center border-white/[0.05]">
                      <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center mb-6">
                         <Activity size={40} className="text-slate-800" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-400 mb-2">Registry Awaiting Selection</h3>
                      <p className="text-xs text-slate-600 max-w-xs leading-relaxed uppercase tracking-widest font-black">Please designate a fiscal cycle to initiate full ledger visualization and orchestration.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Initialize Run Modal Architecture */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="glass w-full max-w-lg bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-primary/20"
            >
              <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg">
                    <Rocket className="text-primary-light" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white font-display tracking-tight">Cycle Ignition</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Initialize Fiscal Disbursement</p>
                  </div>
                </div>
                <button onClick={() => setShowCreate(false)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-8">
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    <AlertCircle size={18} /> {error}
                  </div>
                )}
                <form onSubmit={handleCreate} className="space-y-8">
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Temporal Month (Period)</label>
                      <select className="nx-input p-4 appearance-none font-bold" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(2000, i, 1).toLocaleString('default', { month: 'long' }).toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Fiscal Year Cycle</label>
                      <input type="number" className="nx-input p-4 font-bold" value={form.year}
                        onChange={e => setForm({ ...form, year: e.target.value })} min="2020" max="2099" />
                    </div>
                  </div>

                  <div className="p-6 rounded-[1.5rem] bg-primary/5 border border-primary/10 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                       <ShieldCheck size={14} className="text-primary-light" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-white">Operational Protocol Safeguards:</p>
                    </div>
                    {[
                      'Auto-Calculated PAYE & SSNIT (GHS)',
                      'Auto-Calculated CNSS (GNF)',
                      'Fixed 20% Fiscal Withholding (FX Currencies)',
                      'Draft Mode: MD-Only Final Authorization',
                    ].map((s, i) => (
                      <p key={i} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                         <div className="w-1 h-1 rounded-full bg-primary-light" /> {s}
                      </p>
                    ))}
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t border-white/[0.05]">
                    <button type="button" onClick={() => setShowCreate(false)} className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Abort</button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      className="btn-primary px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/30" 
                      disabled={saving}
                    >
                      {saving ? 'Igniting Disbursal Cycle...' : 'Execute Fiscal Run'}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mock missing icon
const Rocket = (props: any) => <TrendingUp {...props} />;

export default Payroll;
