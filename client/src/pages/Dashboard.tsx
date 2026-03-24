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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
      className="nx-card p-6 group cursor-default"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-colors group-hover:border-[var(--primary)]/30">
          <Icon size={20} style={{ color }} className="opacity-70" />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full",
            isPositive ? "text-emerald-500 bg-emerald-500/5" : "text-rose-500 bg-rose-500/5"
          )}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}
          </div>
        )}
      </div>
      
      <div className="font-bold text-3xl text-[var(--text-primary)] tracking-tight mb-1">
        {value ?? '--'}
      </div>
      <div className="text-[12px] font-medium text-[var(--text-muted)]">{title}</div>
      {sub && <div className="text-[12px] mt-2 font-medium text-[var(--text-secondary)] opacity-70">{sub}</div>}
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !Array.isArray(payload) || !payload.length) return null;
  return (
    <div className="nx-card p-4 border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg">
      <p className="font-bold text-[var(--text-primary)] mb-2 text-sm">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            {p.name}: <span className="text-[var(--text-primary)] font-bold">{p.value}%</span>
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
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
      <p className="text-[12px] font-medium text-[var(--text-muted)]">Loading dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[12px] font-semibold text-[var(--primary)]">{timeGreeting}</p>
          </div>
          <h1 className="font-bold text-4xl text-[var(--text-primary)] tracking-tight">
            {user.name?.split(' ')[0] || 'User'} <span className="text-[var(--text-muted)] font-normal">/ Overview</span>
          </h1>
          <p className="text-[14px] font-medium mt-2 text-[var(--text-secondary)]">
            Welcome back to your operational dashboard for {now.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
          </p>
        </motion.div>

        {getRankFromRole(user.role) >= 60 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <button className="btn-secondary flex items-center gap-2">
              <Download size={14} />
              <span>Export</span>
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Calendar size={14} />
              <span>Review Cycle</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* KPI Cards */}
      {getRankFromRole(user.role) >= 60 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            index={0}
            title={t('dashboard.company_performance')} value={stats?.avgPerformance ? `${stats.avgPerformance}%` : '--'}
            change={stats?.performanceChange} icon={TrendingUp} color="var(--primary)"
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
            sub={stats?.criticalIssues ? t('dashboard.action_required') : t('dashboard.status_ok')}
          />
          <StatCard
            index={3}
            title={t('dashboard.top_performers')} value={stats?.topPerformers ?? 0}
            change={stats?.topPerformers ? '+12%' : undefined}
            icon={Award} color="#f59e0b"
            sub={t('dashboard.high_performance')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <StatCard index={0} title="My Performance" value="85%" icon={Target} color="var(--primary)" sub="Year to date" />
          <StatCard index={1} title="Attendance" value="98%" icon={Clock} color="#10b981" sub="Last 30 days" />
          <StatCard index={2} title="Completed Tasks" value="42" icon={CheckCircle} color="#06b6d4" sub="This quarter" />
        </div>
      )}

      {/* Analytics & Feed */}
      {getRankFromRole(user.role) >= 60 ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1 h-full">
              <ActionInbox />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="xl:col-span-2 nx-card p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-primary)]">{t('dashboard.performance_trends')}</h3>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{t('dashboard.over_time')}</p>
                </div>
                <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  {['30D', '90D', 'YTD'].map((r) => (
                    <button key={r} className={cn(
                      "px-3 py-1 text-[11px] font-bold rounded transition-all",
                      r === '90D' ? "bg-[var(--primary)] text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name="Metric"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#scoreGrad)"
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
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Department Health</h3>
                <Target size={16} className="text-[var(--text-muted)]" />
              </div>
              <div className="space-y-5">
                {departments.slice(0, 4).map((d: any) => {
                  const score = Math.round(d.score || 0);
                  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
                  return (
                    <div key={d.id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{d.name}</span>
                        <span className="text-[11px] font-bold" style={{ color }}>{score}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: color }}
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
              <h3 className="font-bold text-lg text-[var(--text-primary)] mb-4">System Status</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Status', value: 'Active', icon: Globe, color: 'var(--primary)' },
                  { label: 'Cloud', value: 'Optimal', icon: Zap, color: '#f59e0b' },
                ].map((item: any) => (
                  <div key={item.label} className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors">
                    <item.icon size={18} className="mb-2" style={{ color: item.color }} />
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{item.label}</div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">{item.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="xl:col-span-1">
               <div className="nx-card p-6 h-full flex flex-col justify-center items-center text-center">
                  <Activity size={32} className="text-[var(--text-muted)] opacity-20 mb-4" />
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">System health remains optimal across all regions.</p>
               </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
           <div className="xl:col-span-1">
             <ActionInbox />
           </div>
           <div className="xl:col-span-2">
               <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="nx-card p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
                  <TrendingUp size={48} className="mb-4 text-[var(--text-muted)] opacity-20" />
                  <h3 className="font-bold text-xl text-[var(--text-primary)] mb-2">Personal Metrics</h3>
                  <p className="text-[14px] text-[var(--text-secondary)]">Syncing latest performance data...</p>
               </motion.div>
           </div>
        </div>
      )}

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="nx-card p-6"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <Activity size={20} className="text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Recent Activity</h3>
              <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-widest">Live Updates</p>
            </div>
          </div>
          <button className="text-[12px] font-bold text-[var(--primary)] hover:underline">View All</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activity.length > 0 ? activity.map((item: any, idx: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + (idx * 0.05) }}
              className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-[var(--primary)]">
                {(item.user?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                  {item.user} <span className="font-normal text-[var(--text-secondary)]">{item.action}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-medium text-[var(--text-muted)] uppercase">
                  <span>{item.target}</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                  <span>{item.time}</span>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-10 text-center">
              <Target size={32} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
              <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No Recent Activity</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
;

export default Dashboard;
