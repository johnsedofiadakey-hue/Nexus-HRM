import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, Target, Calendar, Building2, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ActionInbox from '../../components/dashboard/ActionInbox';
import { useTranslation } from 'react-i18next';

const COLORS = ['var(--primary)', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

const DirectorDashboard = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');
  const [data, setData] = useState({ distribution: [] as any[], performance: [] as any[] });

  const fallbackDist = [
    { name: 'Operations', value: 38 }, { name: 'Sales', value: 28 },
    { name: 'Admin', value: 18 }, { name: 'IT', value: 16 }
  ];
  const fallbackPerf = [
    { name: 'Operations', value: 88 }, { name: 'Sales', value: 74 },
    { name: 'Admin', value: 91 }, { name: 'IT', value: 82 }
  ];

  useEffect(() => {
    api.get('/analytics/dept-growth')
      .then(res => setData({
        distribution: fallbackDist,
        performance: Array.isArray(res.data) && res.data.length ? res.data : fallbackPerf
      }))
      .catch(() => setData({ distribution: fallbackDist, performance: fallbackPerf }));
  }, []);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter">
      {/* Identity Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} className="animate-pulse" /> {t('common.admin')} {t('dashboard.console')}
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{greeting}</span>
          </div>
          <h1 className="font-black text-5xl text-[var(--text-primary)] tracking-tight leading-none">
            {user.name?.split(' ')[0] || 'Director'} <span className="text-[var(--text-muted)] font-thin">/ {t('dashboard.overview')}</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            {user.jobTitle || t('employees.roles.DIRECTOR')} &nbsp;·&nbsp; {t('dashboard.org_health')}
          </p>
        </motion.div>
      </div>

      {/* Action Inbox & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 h-full">
          <ActionInbox />
        </div>
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { label: t('common.departments'), value: '5', icon: Building2, color: 'var(--primary)' },
            { label: t('dashboard.active_reviews'), value: '12', icon: BarChart3, color: '#a855f7' },
            { label: t('dashboard.open_targets'), value: '24', icon: Target, color: '#f59e0b' },
            { label: t('dashboard.pending_leave'), value: '3', icon: Calendar, color: '#10b981' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="nx-card p-8 group hover:border-[var(--primary)]/30 transition-all">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-colors group-hover:border-[var(--primary)]/30 mb-6">
                <s.icon size={22} style={{ color: s.color }} className="opacity-80" />
              </div>
              <div className="text-4xl font-black text-[var(--text-primary)] tracking-tight mb-2">{s.value}</div>
              <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Department Distribution Pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="nx-card p-10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('dashboard.headcount_dist')}</h3>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('dashboard.by_dept')}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)]">
               <Users size={20} />
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.distribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                {data.distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-lg)'
                }}
                itemStyle={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 'bold' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {data.distribution.map((d, i) => (
              <div key={i} className="flex flex-col p-4 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter truncate">{d.name}</span>
                </div>
                <span className="text-lg font-black text-[var(--text-primary)]">{d.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dept Performance Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="nx-card p-10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('dashboard.dept_perf')}</h3>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('dashboard.efficiency_metrics')}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)]">
               <TrendingUp size={20} />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={data.performance} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} domain={[0, 100]} />
              <Tooltip 
                cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                contentStyle={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-lg)'
                }}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: t('dashboard.institutional_verdict'), href: '/reviews/final', color: 'var(--primary)' },
          { label: t('dashboard.team_targets'), href: '/kpi/team', color: '#a855f7' },
          { label: t('dashboard.dept_config'), href: '/departments', color: '#06b6d4' },
        ].map((item, i) => (
          <Link key={i} to={item.href} className="nx-card p-8 flex items-center justify-between group hover:border-[var(--primary)]/30 transition-all no-underline">
            <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">{item.label}</span>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/30 transition-all">
              <ArrowRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DirectorDashboard;

