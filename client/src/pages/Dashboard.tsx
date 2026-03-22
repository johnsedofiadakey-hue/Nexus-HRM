import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, Users, AlertCircle, Award, ArrowUpRight, ArrowDownRight,
  Calendar, Download, Target, Clock, CheckCircle, Activity, Globe, Zap
} from 'lucide-react';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';
import ActionInbox from '../components/dashboard/ActionInbox';
import { useTranslation } from 'react-i18next';

interface DashboardStats {
  avgPerformance?: number; performanceChange?: string;
  teamMorale?: number; moraleChange?: string;
  criticalIssues?: number; topPerformers?: number;
}


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
        setStats(s.data || {});
        setPerformance(Array.isArray(p.data) ? p.data : []);
        setDepartments(Array.isArray(d.data) ? d.data : []);
        const activityRows = Array.isArray(a.data?.logs) ? a.data.logs : Array.isArray(a.data) ? a.data : [];
        setActivity(activityRows);
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
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.23, 1, 0.32, 1] }}
      className="nx-card p-8 group cursor-default relative overflow-hidden transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.03)]"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-[0.03]" style={{ backgroundColor: color }} />
      
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
          <Icon size={24} style={{ color }} className="opacity-80" />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest",
            isPositive ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
          )}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {change}
          </div>
        )}
      </div>
      
      <div className="font-black text-4xl text-[var(--text-primary)] tracking-tighter mb-2 group-hover:text-[var(--primary)] transition-colors duration-500 relative z-10">
        {value ?? '--'}
      </div>
      <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)] opacity-60 relative z-10">{title}</div>
      {sub && <div className="text-[12px] mt-2 font-medium text-[var(--text-secondary)] opacity-80 relative z-10">{sub}</div>}
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !Array.isArray(payload) || !payload.length) return null;
  return (
    <div className="nx-card p-5 border-[var(--border-subtle)] shadow-xl bg-[var(--bg-card)]/90 backdrop-blur-md">
      <p className="font-black text-[var(--text-primary)] mb-3 text-sm tracking-tight">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
            {p.name}: <span className="text-[var(--text-primary)] font-black">{p.value}%</span>
          </p>
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const user = getStoredUser();
  const { stats, performance, departments, activity, loading } = useDashboardData();

  const now = new Date();
  const hours = now.getHours();
  const timeGreeting = hours < 12 ? t('dashboard.greeting_morning') : hours < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">Syncing Intel Feed</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="w-10 h-1 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] opacity-80">{timeGreeting}</p>
          </div>
          <h1 className="font-black text-5xl text-[var(--text-primary)] tracking-tighter">
            {user.name?.split(' ')[0] || 'Member'} <span className="text-[var(--primary)]/40 font-medium">/ Intelligence</span>
          </h1>
          <p className="text-[15px] font-medium mt-4 text-[var(--text-secondary)] max-w-xl leading-relaxed">
            Global operational overview for {now.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
          </p>
        </motion.div>

        {getRankFromRole(user.role) >= 60 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-4 bg-[var(--bg-elevated)]/50 p-2 rounded-[2rem] border border-[var(--border-subtle)]"
          >
            <button className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all flex items-center gap-2">
              <Download size={14} />
              <span>{t('dashboard.export_report')}</span>
            </button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/20"
            >
              <Calendar size={14} className="mr-2" />
              <span>Cycle Review</span>
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* KPI Cards (Managers & Above) */}
      {getRankFromRole(user.role) >= 60 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            index={0}
            title={t('dashboard.company_performance')} value={stats?.avgPerformance ? `${stats.avgPerformance}%` : '--'}
            change={stats?.performanceChange} icon={TrendingUp} color="#6366f1"
            sub={t('dashboard.overall_efficiency')}
          />
          <StatCard
            index={1}
            title={t('dashboard.team_morale')} value={stats?.teamMorale?.toFixed(1) ?? '--'}
            change={stats?.moraleChange} icon={Users} color="#06b6d4"
            sub={t('dashboard.current_score')}
          />
          <StatCard
            index={2}
            title={t('dashboard.critical_issues')} value={stats?.criticalIssues ?? 0}
            icon={AlertCircle} color={stats?.criticalIssues ? '#f43f5e' : '#10b981'}
            sub={stats?.criticalIssues ? t('dashboard.action_required') : t('dashboard.looking_good')}
          />
          <StatCard
            index={3}
            title={t('dashboard.top_performers')} value={stats?.topPerformers ?? 0}
            change={stats?.topPerformers ? '+12%' : undefined}
            icon={Award} color="#f59e0b"
            sub={t('dashboard.top_15_percent')}
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
      {getRankFromRole(user.role) >= 60 ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Action Inbox - Prominent Placement */}
            <div className="xl:col-span-1 h-full">
              <ActionInbox />
            </div>

            {/* Performance Architecture */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="xl:col-span-2 nx-card p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-display font-bold text-xl text-white">{t('dashboard.performance_trends')}</h3>
                  <p className="text-xs font-medium mt-1 text-slate-500 uppercase tracking-wider">{t('dashboard.over_time')}</p>
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
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="nx-card p-6"
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
              className="nx-card p-6"
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

            <div className="xl:col-span-1">
               {/* Activity Sidebar Integration */}
               <div className="nx-card p-6 h-full">
                  <h3 className="font-display font-bold text-lg text-white mb-4">Meta Awareness</h3>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">System integrity is optimal.</p>
                  <div className="w-full h-32 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                     <Activity size={32} className="text-primary-light/20" />
                  </div>
               </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
           <div className="xl:col-span-1">
             <ActionInbox />
           </div>
           <div className="xl:col-span-2 space-y-8">
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="nx-card p-8 h-full min-h-[400px]">
                 <h3 className="font-display font-bold text-xl text-white mb-6">Execution Trajectory</h3>
                 <div className="flex flex-col items-center justify-center h-[300px] text-slate-700">
                    <TrendingUp size={64} className="mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Analytics Engine Synchronizing</p>
                 </div>
               </motion.div>
           </div>
        </div>
      )}

      {/* Activity Intelligence */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="nx-card p-8"
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
    </div>
  );
};

export default Dashboard;
