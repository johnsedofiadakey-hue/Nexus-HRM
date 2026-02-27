import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, Users, AlertCircle, Award, ArrowUpRight, ArrowDownRight,
  Calendar, Download, MoreHorizontal, Target, Clock, CheckCircle, Activity
} from 'lucide-react';
import { cn } from '../utils/cn';

interface DashboardStats {
  avgPerformance?: number; performanceChange?: string;
  teamMorale?: number; moraleChange?: string;
  criticalIssues?: number; topPerformers?: number;
}

const ROLE_RANKS: any = { DEV: 100, MD: 90, DIRECTOR: 80, MANAGER: 70, MID_MANAGER: 60, STAFF: 50, CASUAL: 10 };

const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [s, p, d, a] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/performance'),
          api.get('/departments'),
          api.get('/activity/logs?limit=8'),
        ]);
        setStats(s.data); setPerformance(p.data);
        setDepartments(d.data); setActivity(a.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);
  return { stats, performance, departments, activity, loading };
};

const StatCard = ({ title, value, change, icon: Icon, color, sub, index }: any) => {
  const isPositive = change?.startsWith('+') || (!change?.startsWith('-') && change !== '0%');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass p-6 group cursor-default"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-2xl" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
            isPositive ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
          )}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {change}
          </div>
        )}
      </div>
      <div className="font-display font-black text-4xl text-white mb-1 group-hover:gradient-text transition-all duration-500">
        {value ?? '--'}
      </div>
      <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{title}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass p-4 border-primary/20 bg-surface/90">
      <p className="font-display font-bold text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {p.name}: <span className="text-white font-bold">{p.value}%</span>
          </p>
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const userString = localStorage.getItem('nexus_user');
  const user = userString ? JSON.parse(userString) : {};
  const { stats, performance, departments, activity, loading } = useDashboardData();

  const now = new Date();
  const timeGreeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"
        />
        <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 page-transition pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[2px] bg-primary rounded-full" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary-light">{timeGreeting}</p>
          </div>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-white">
            {user.name?.split(' ')[0] || 'Welcome'} <span className="gradient-text">{ROLE_RANKS[user.role] >= 60 ? 'Overview' : 'Dashboard'}</span>
          </h1>
          <p className="text-sm font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
            Insights for {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {ROLE_RANKS[user.role] >= 60 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex gap-3"
          >
            <button className="btn-secondary group">
              <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
              <span>Export Report</span>
            </button>
            <button className="btn-primary animate-glow">
              <Calendar size={16} />
              <span>Launch Review</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* KPI Cards (Managers & Above) */}
      {ROLE_RANKS[user.role] >= 60 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            index={0}
            title="Company Performance" value={stats?.avgPerformance ? `${stats.avgPerformance}%` : '--'}
            change={stats?.performanceChange} icon={TrendingUp} color="#6366f1"
            sub="Overall efficiency"
          />
          <StatCard
            index={1}
            title="Team Morale" value={stats?.teamMorale?.toFixed(1) ?? '--'}
            change={stats?.moraleChange} icon={Users} color="#06b6d4"
            sub="Current score"
          />
          <StatCard
            index={2}
            title="Critical Issues" value={stats?.criticalIssues ?? 0}
            icon={AlertCircle} color={stats?.criticalIssues ? '#f43f5e' : '#10b981'}
            sub={stats?.criticalIssues ? 'Action required' : 'Looking good'}
          />
          <StatCard
            index={3}
            title="Top Performers" value={stats?.topPerformers ?? 0}
            change={stats?.topPerformers ? '+12%' : undefined}
            icon={Award} color="#f59e0b"
            sub="Top 15% of staff"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Staff specific KPIs */}
          <StatCard index={0} title="My Performance" value="85%" icon={Target} color="#6366f1" sub="Last Evaluation" />
          <StatCard index={1} title="Attendance Rate" value="98%" icon={Clock} color="#10b981" sub="This Month" />
          <StatCard index={2} title="Tasks Completed" value="42" icon={CheckCircle} color="#06b6d4" sub="This Quarter" />
        </div>
      )}

      {/* Analytics Core & Target Feed (Managers & Above) */}
      {ROLE_RANKS[user.role] >= 60 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Performance Architecture */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="xl:col-span-2 glass p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-display font-bold text-xl text-white">Performance Trends</h3>
                <p className="text-xs font-medium mt-1 text-slate-500 uppercase tracking-wider">Over time</p>
              </div>
              <div className="flex gap-2 p-1.5 rounded-xl bg-slate-900/50 border border-white/5">
                {['30D', '90D', 'YTD'].map((r) => (
                  <button key={r} className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                    r === '90D' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"
                  )}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={12} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.2)', strokeWidth: 2 }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Metric"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#scoreGrad)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Tactical Feed */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="glass p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-lg text-white">Department Health</h3>
                <Target size={16} className="text-primary-light" />
              </div>
              <div className="space-y-5">
                {departments.slice(0, 4).map((d: any) => {
                  const score = Math.round(d.score || 0);
                  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <div key={d.id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{d.name}</span>
                        <span className="text-xs font-black" style={{ color }}>{score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1.5, delay: 0.8, ease: "circOut" }}
                          className="h-full rounded-full"
                          style={{ background: color, boxShadow: `0 0 10px ${color}40` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="glass p-6"
            >
              <h3 className="font-display font-bold text-lg text-white mb-4">System Status</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Status', value: 'Active', icon: Globe, color: '#6366f1' },
                  { label: 'Servers', value: 'Good', icon: Zap, color: '#f59e0b' },
                ].map((item: any) => (
                  <div key={item.label} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <item.icon size={18} className="mb-2" style={{ color: item.color }} />
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</div>
                    <div className="text-sm font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Activity Intelligence (Managers & Above) */}
      {ROLE_RANKS[user.role] >= 60 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="glass p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <Activity size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-white">Recent Activity</h3>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Live updates</p>
              </div>
            </div>
            <button className="text-xs font-black uppercase tracking-widest text-primary-light hover:text-white transition-colors">View all →</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activity.length > 0 ? activity.map((item: any, idx: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + (idx * 0.05) }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all cursor-default"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                  {(item.user?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {item.user} <span className="font-medium text-slate-400">{item.action}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-500 uppercase">
                    <span>{item.target}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span>{item.time}</span>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-10 text-center">
                <Target size={32} className="mx-auto mb-4 text-slate-800" />
                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No recent activity</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Mock missing icons
const Globe = (props: any) => <Activity {...props} />;
const Zap = (props: any) => <Award {...props} />;

export default Dashboard;
