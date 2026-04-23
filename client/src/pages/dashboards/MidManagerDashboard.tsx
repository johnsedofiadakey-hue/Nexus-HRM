import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Target, Activity, Clock, ChevronRight, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import ActionInbox from '../../components/common/ActionInbox';

const MidManagerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [execRes, personalRes] = await Promise.all([
          api.get('/analytics/executive'),
          api.get('/analytics/personal')
        ]);
        setStats({
          ...execRes.data,
          personalGoals: personalRes.data?.activeGoals || []
        });
      } catch (error) {
        console.error('Failed to fetch supervisor dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: t('common.team_targets'), value: stats?.pendingKpis || '0', icon: Target, color: 'var(--primary)' },
    { label: t('dashboard.active_reviews'), value: stats?.pendingAppraisals || stats?.pendingTasks || '0', icon: Activity, color: 'var(--success)' },
    { label: t('dashboard.attendance_rate'), value: stats?.attendanceRate ? `${stats.attendanceRate}%` : '—', icon: Clock, color: 'var(--warning)' },
    { label: t('dashboard.headcount'), value: stats?.totalEmployees || '0', icon: Users, color: 'var(--accent)' },
  ];

  return (
    <div className="space-y-8 pb-20 page-transition">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--primary)] mb-1">{greeting}</p>
        <h1 className="font-black text-4xl text-[var(--text-primary)] tracking-tight leading-none">
          {user.name?.split(' ')[0] || 'Lead'} <span className="text-[var(--text-muted)] font-thin">/ {t('dashboard.overview')}</span>
        </h1>
        <p className="text-[var(--text-secondary)] mt-2 text-sm font-medium">
          {user.jobTitle || t('employees.roles.SUPERVISOR')} &nbsp;·&nbsp; {t('common.management')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-4 h-full">
          <ActionInbox isInline />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 h-fit">
          {statCards.map((s, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
              className="nx-card p-6 group hover:border-[var(--primary)]/30 transition-all">
              <div className="w-10 h-10 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: `${s.color}15`, color: s.color }}>
                <s.icon size={18} />
              </div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{s.label}</p>
              <h4 className="text-2xl font-black text-[var(--text-primary)] mt-1">
                {loading ? <span className="animate-pulse">···</span> : s.value}
              </h4>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="nx-card p-8">
          <h3 className="font-black text-xl text-[var(--text-primary)] mb-6 uppercase tracking-tight">{t('common.my_targets')}</h3>
          <div className="space-y-6">
            {loading ? (
              <div className="py-10 text-center animate-pulse text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                {t('dashboard.loading')}
              </div>
            ) : (!stats?.personalGoals || stats.personalGoals.length === 0) ? (
              <div className="py-10 text-center text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                {t('dashboard.no_data')}
              </div>
            ) : (
              stats.personalGoals.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2 text-sm font-bold">
                    <span className="text-[var(--text-muted)] uppercase tracking-widest text-[11px] truncate mr-4">{item.name}</span>
                    <span className="text-[var(--primary)]">{item.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border-subtle)]">
                    <motion.div className="h-full rounded-full bg-[var(--primary)]"
                      initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ delay: 0.5 + idx * 0.1, duration: 0.8 }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="nx-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
               <Zap size={18} />
            </div>
            <h3 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight">{t('dashboard.overview')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[
               { label: t('dashboard.actions.post_job'), href: '/recruitment', color: 'var(--primary)' },
               { label: t('dashboard.actions.file_expense'), href: '/finance', color: 'var(--accent)' },
               { label: t('dashboard.actions.get_support'), href: '/support', color: 'var(--error)' },
               { label: t('dashboard.actions.employee_exit'), href: '/offboarding', color: 'var(--text-muted)' },
             ].map((action, i) => (
               <Link key={i} to={action.href} className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all no-underline group flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">{action.label}</span>
                  <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-transform group-hover:translate-x-1" />
               </Link>
             ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default MidManagerDashboard;
