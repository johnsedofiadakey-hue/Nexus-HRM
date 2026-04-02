import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight,
  Calendar, Download, Target, Clock, CheckCircle, Activity, Globe, Zap, ShieldCheck,
  Briefcase, Wallet, LifeBuoy, UserX, Rocket
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
      <p className="text-[12px] font-medium text-[var(--text-muted)]">{t('dashboard.loading')}</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6 pb-2">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1"
        >
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} className="animate-pulse" /> {t('common.admin')} {t('dashboard.console')}
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{timeGreeting}</span>
          </div>
          <h1 className="font-black text-3xl sm:text-4xl md:text-5xl text-[var(--text-primary)] tracking-tight leading-none mt-4 lg:mt-0">
            {user.name?.split(' ')[0] || 'User'} <span className="text-[var(--text-muted)] font-thin">/ {t('dashboard.overview')}</span>
          </h1>
          <p className="text-[12px] sm:text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            {t('dashboard.welcome_back')} <span className="text-[var(--text-primary)] font-bold">{now.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>. {t('common.status')}: <span className="text-emerald-500 font-bold">{t('dashboard.stable')}</span>.
          </p>
        </motion.div>

        {getRankFromRole(user.role) >= 60 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <button className="px-6 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[11px] font-black uppercase tracking-widest hover:border-[var(--primary)]/50 transition-all flex items-center gap-2">
              <Download size={14} />
              <span>{t('dashboard.export_report')}</span>
            </button>
            <button className="px-6 py-3 rounded-2xl bg-[var(--primary)] text-[var(--text-inverse)] shadow-xl shadow-[var(--primary)]/20 text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <Calendar size={14} />
              <span>{t('dashboard.launch_review')}</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {getRankFromRole(user.role) >= 60 ? (
          <>
            <StatCard
              index={0}
              title={t('dashboard.company_performance')} value={stats?.avgPerformance ? `${stats.avgPerformance}%` : '--'}
              change={stats?.performanceChange} icon={TrendingUp} color="var(--primary)"
              sub={t('dashboard.overall_efficiency')}
            />
            <StatCard
              index={1}
              title={t('dashboard.team_morale')} value={stats?.teamMorale != null ? Number(stats.teamMorale).toFixed(1) : '--'}
              change={stats?.moraleChange} icon={Users} color="#06b6d4"
              sub={t('dashboard.current_score')}
            />
            <StatCard
              index={2}
              title="Open Positions" value="12"
              icon={Briefcase} color="#a855f7"
              sub="Hiring Pipeline"
            />
            <StatCard
              index={3}
              title="Pending Expenses" value="GHS 850"
              change="+5%"
              icon={Wallet} color="#f59e0b"
               sub="Awaiting Approval"
            />
          </>
        ) : (
          <>
            <StatCard index={0} title={t('common.performance')} value="85%" icon={Target} color="var(--primary)" sub={t('dashboard.ytd')} />
            <StatCard index={1} title={t('common.attendance')} value="98%" icon={Clock} color="#10b981" sub={t('dashboard.last_30_days')} />
            <StatCard index={2} title="My Tickets" value="2" icon={LifeBuoy} color="#f43f5e" sub="Open Support" />
            <StatCard index={3} title="My Claims" value="0" icon={Wallet} color="#f59e0b" sub="This Month" />
          </>
        )}
      </div>

      {/* Pulse Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="nx-card p-4 bg-gradient-to-r from-[var(--primary)]/5 via-transparent to-[var(--primary)]/5 border-dashed"
      >
        <div className="flex flex-wrap items-center justify-center gap-4">
           {[
             { label: 'Post Job', icon: Briefcase, to: '/recruitment', color: 'bg-purple-500' },
             { label: 'File Expense', icon: Wallet, to: '/expenses', color: 'bg-amber-500' },
             { label: 'Get Support', icon: LifeBuoy, to: '/support', color: 'bg-red-500' },
             { label: 'Employee Exit', icon: UserX, to: '/offboarding', color: 'bg-slate-500' },
             { label: 'System Boost', icon: Rocket, to: '#', color: 'bg-blue-500' },
           ].map((action, i) => (
             <motion.button
               key={i}
               whileHover={{ y: -4, scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/50 transition-all shadow-lg group"
             >
               <div className={cn("p-2 rounded-xl text-white group-hover:rotate-12 transition-transform", action.color)}>
                 <action.icon size={16} />
               </div>
               <span className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">{action.label}</span>
             </motion.button>
           ))}
        </div>
      </motion.div>

      {/* Main Command Center Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Action Hub */}
        <div className="xl:col-span-4 space-y-8">
          <ActionInbox />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="nx-card p-8 bg-gradient-to-br from-[var(--primary)]/10 to-transparent border-[var(--primary)]/10"
          >
             <h4 className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] mb-4">{t('dashboard.pulse_advisor')}</h4>
             <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                   <Target size={24} className="text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{t('dashboard.strategic_gap')}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {t('dashboard.gap_description')}
                  </p>
                </div>
             </div>
             <button className="w-full mt-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
                {t('dashboard.generate_report')}
             </button>
          </motion.div>
        </div>

        {/* Right Column: Analytics & Stats */}
        <div className="xl:col-span-8 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="nx-card p-6 sm:p-10"
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('dashboard.performance_trends')}</h3>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">{t('dashboard.over_time')}</p>
              </div>
              <div className="flex gap-1 p-1.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                {['30D', '90D', 'YTD'].map((r) => (
                  <button key={r} className={cn(
                    "px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest",
                    r === '90D' ? "bg-[var(--primary)] text-[var(--text-inverse)] shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Metric"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#scoreGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="nx-card p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-lg text-[var(--text-primary)] tracking-tight">{t('dashboard.org_health')}</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('dashboard.by_dept')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <Activity size={18} />
                </div>
              </div>
              <div className="space-y-6">
                {departments.slice(0, 4).map((d: any) => {
                  const score = Math.round(d.score || 0);
                  const color = score >= 75 ? 'var(--primary)' : score >= 50 ? '#f59e0b' : '#f43f5e';
                  return (
                    <div key={d.id} className="group cursor-default">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{d.name}</span>
                        <span className="text-[11px] font-black" style={{ color }}>{score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1.2, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
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
              className="nx-card p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-lg text-[var(--text-primary)] tracking-tight">{t('dashboard.access_control')}</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('dashboard.identity_status')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                   <ShieldCheck size={18} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: t('dashboard.network'), value: t('dashboard.secure'), icon: Globe, color: 'var(--primary)' },
                  { label: t('dashboard.protocols'), value: t('dashboard.high'), icon: Zap, color: '#f59e0b' },
                  { label: t('dashboard.uptime'), value: '99.9%', icon: Activity, color: '#10b981' },
                  { label: t('dashboard.threats'), value: t('dashboard.none'), icon: AlertCircle, color: '#6366f1' },
                ].map((item: any) => (
                  <div key={item.label} className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all group">
                    <item.icon size={16} className="mb-3 transition-transform group-hover:scale-110" style={{ color: item.color }} />
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{item.label}</div>
                    <div className="text-xs font-black text-[var(--text-primary)]">{item.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="nx-card p-6 sm:p-10"
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)] shadow-inner">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('dashboard.interaction_stream')}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{t('dashboard.real_time_telemetry')}</p>
              </div>
            </div>
          </div>
          <button className="text-[11px] font-black text-[var(--primary)] uppercase tracking-widest border-b-2 border-transparent hover:border-[var(--primary)] transition-all">
            {t('inbox.view_all')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {activity.length > 0 ? activity.slice(0, 8).map((item: any, idx: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + (idx * 0.05) }}
              className="group p-5 rounded-[2rem] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)] hover:border-[var(--primary)]/30 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-[var(--text-inverse)] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-lg shadow-[var(--primary)]/20">
                  {(item.user?.[0] || '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-[var(--text-primary)] truncate">{item.user}</p>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{item.time}</p>
                </div>
              </div>
              <div className="space-y-2">
                 <p className="text-[11px] font-bold text-[var(--text-secondary)] leading-snug group-hover:text-[var(--text-primary)] transition-colors">
                   {item.action} <span className="text-[var(--primary)]">@{item.target}</span>
                 </p>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center bg-[var(--bg-elevated)] rounded-[3rem] border border-dashed border-[var(--border-subtle)]">
              <CheckCircle size={40} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
              <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">{t('inbox.all_clear')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
