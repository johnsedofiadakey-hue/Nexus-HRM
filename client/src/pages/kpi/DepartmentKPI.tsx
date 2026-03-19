import { useEffect, useState } from 'react';
import { Target, TrendingUp, Plus, Search, ShieldCheck, Activity } from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const badge = (value: string) =>
  `inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
    value === 'ACTIVE' || value === 'PUBLISHED'
    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : value === 'IN_PROGRESS' || value === 'OPEN'
      ? 'bg-primary/10 text-primary-light border border-primary/20'
      : 'bg-white/[0.06] text-slate-400 border border-white/10'
  }`;

const DepartmentKPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deptKpis, setDeptKpis] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const [newKpi, setNewKpi] = useState({ 
    departmentId: '', 
    title: '', 
    metricType: 'PERCENT', 
    targetValue: 90, 
    measurementPeriod: 'Q1-2026' 
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [kpiRes, deptRes] = await Promise.all([
        api.get('/kpi/department'), 
        api.get('/departments')
      ]);
      
      setDeptKpis(Array.isArray(kpiRes.data?.data) ? kpiRes.data.data : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
    } catch (e: any) {
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddKpi = async () => {
    if (!newKpi.departmentId || !newKpi.title) {
      setError('Please select a department and enter a title');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/kpi/department', {
        ...newKpi,
        targetValue: Number(newKpi.targetValue),
        departmentId: Number(newKpi.departmentId),
      });
      setIsAdding(false);
      setNewKpi({ departmentId: '', title: '', metricType: 'PERCENT', targetValue: 90, measurementPeriod: 'Q1-2026' });
      fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create KPI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 page-transition">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Department KPIs</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary-light" />
            Executive Oversight & High-Level Goal Setting
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn-primary"
        >
          {isAdding ? 'Cancel' : <><Plus size={18} /> Define New KPI</>}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-8 border-primary/20 bg-primary/5"
          >
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Target size={20} className="text-primary-light" /> 
              Department Goal Definition
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Department</label>
                <select 
                  className="nx-input w-full" 
                  value={newKpi.departmentId} 
                  onChange={(e) => setNewKpi(p => ({ ...p, departmentId: e.target.value }))}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">KPI Description / Title</label>
                <input 
                  className="nx-input w-full" 
                  placeholder="e.g. Q1 Revenue Retention Target" 
                  value={newKpi.title} 
                  onChange={(e) => setNewKpi(p => ({ ...p, title: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Metric Type</label>
                <input 
                  className="nx-input w-full" 
                  placeholder="PERCENT, COUNT, CURRENCY" 
                  value={newKpi.metricType} 
                  onChange={(e) => setNewKpi(p => ({ ...p, metricType: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Value</label>
                <input 
                  type="number"
                  className="nx-input w-full" 
                  value={newKpi.targetValue} 
                  onChange={(e) => setNewKpi(p => ({ ...p, targetValue: Number(e.target.value) }))} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Measurement Period</label>
                <input 
                  className="nx-input w-full" 
                  placeholder="Q1-2026, MARCH-2026" 
                  value={newKpi.measurementPeriod} 
                  onChange={(e) => setNewKpi(p => ({ ...p, measurementPeriod: e.target.value }))} 
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button onClick={() => setIsAdding(false)} className="px-6 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">Discard</button>
              <button 
                onClick={handleAddKpi}
                disabled={loading}
                className="btn-primary px-10"
              >
                {loading ? 'Processing...' : 'Deploy KPI'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="glass p-4 border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-bold flex items-center gap-3">
          <Activity size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
              <TrendingUp size={24} className="text-primary-light" />
              Active Department Benchmarks
            </h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                className="pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs focus:border-primary/40 outline-none transition-all w-64"
                placeholder="Filter benchmarks..."
              />
            </div>
          </div>

          <div className="grid gap-4">
            {loading && deptKpis.length === 0 ? (
              <div className="glass p-20 text-center text-slate-500 animate-pulse uppercase tracking-[0.2em] text-[10px] font-black">
                Synchronizing KPI data...
              </div>
            ) : deptKpis.length === 0 ? (
              <div className="glass p-20 text-center border-dashed border-white/5">
                <Target size={48} className="mx-auto mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No department KPIs defined for current period</p>
              </div>
            ) : (
              deptKpis.map((kpi, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={kpi.id} 
                  className="glass p-6 hover:bg-white/[0.02] group transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Target size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-white truncate">{kpi.title}</h4>
                          <span className={badge(kpi.status || 'ACTIVE')}>{kpi.status || 'ACTIVE'}</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {kpi.department?.name || 'Global'} • {kpi.measurementPeriod}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="text-2xl font-black text-white font-display">
                        {kpi.targetValue}<span className="text-[10px] text-slate-500 font-bold ml-1">{kpi.metricType}</span>
                      </div>
                      <p className="text-[9px] font-black text-primary-light uppercase tracking-widest">Benchmark Target</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 border-white/5 bg-white/[0.01]">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" /> Platform Insights
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Avg Achievement', val: '74.2%', color: 'text-emerald-400' },
                { label: 'Pending Reviews', val: '12', color: 'text-amber-400' },
                { label: 'Dept Coverage', val: '100%', color: 'text-blue-400' }
              ].map((stat, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{stat.label}</span>
                  <span className={cn("font-black", stat.color)}>{stat.val}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.06] transition-all">
              Generate PDF Report
            </button>
          </div>

          <div className="glass p-6 border-white/5 bg-amber-500/5">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Compliance Note</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
              KPIs defined here are automatically propagated to Department Heads for team-level decomposition. Final changes require executive signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentKPI;
