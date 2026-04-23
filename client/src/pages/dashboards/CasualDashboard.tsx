import React from 'react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, FileText, ChevronRight, User, ArrowRight, Zap } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import ActionInbox from '../../components/common/ActionInbox';
import { useTranslation } from 'react-i18next';

const CasualDashboard: React.FC = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s safety timeout

    api.get('/analytics/personal', { signal: controller.signal })
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => { setLoading(false); clearTimeout(timeout); });

    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter">
      {/* Identity Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} className="animate-pulse" /> {t('employees.roles.CASUAL', 'Casual')} {t('dashboard.console', 'Console')}
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{greeting}</span>
          </div>
          <h1 className="font-black text-5xl text-[var(--text-primary)] tracking-tight leading-none">
            {user.name?.split(' ')[0] || 'Team'} <span className="text-[var(--text-muted)] font-thin">/ {t('employee_dashboard.title', 'My Dashboard')}</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            {user.jobTitle || t('employees.roles.CASUAL', 'Casual Worker')} &nbsp;·&nbsp; {t('casual_dashboard.ess', 'Employee Self-Service')}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 h-full">
          <ActionInbox isInline />
        </div>
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-8 h-full rounded-2xl bg-[var(--success)]/5 border border-[var(--success)]/10 flex items-center gap-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center border border-[var(--success)]/20">
              <User size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em] mb-1">{t('casual_dashboard.employment_type', 'Employment Status')}</p>
              <p className="text-xs font-medium text-[var(--success)]/80 uppercase tracking-widest leading-relaxed">
                {t('employees.roles.CASUAL', 'Casual Worker')} · {t('casual_dashboard.access_level', 'Access Level')}: {t('casual_dashboard.staff_portal', 'Staff Portal')}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: t('employee_dashboard.attendance_rate', 'Attendance Rate'), value: loading ? '…' : `${stats?.attendanceRate ?? 0}%`, icon: Clock, color: 'var(--success)' },
          { title: t('employee_dashboard.leave_balance', 'Leave Balance'), value: loading ? '…' : `${stats?.leaveBalance ?? 0} ${t('employee_dashboard.days', 'Days')}`, icon: Calendar, color: 'var(--warning)' },
          { title: t('employee_dashboard.my_performance', 'My Performance'), value: loading ? '…' : `${stats?.overallPerformance ?? 0}%`, icon: Zap, color: 'var(--primary)' },
          { title: t('employee_dashboard.training_status', 'Training Status'), value: loading ? '…' : `${stats?.trainingStatus ?? 100}%`, icon: FileText, color: 'var(--accent)' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="nx-card p-10 group hover:border-[var(--primary)]/30 transition-all">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/30 transition-colors mb-8">
              <stat.icon size={22} style={{ color: stat.color }} className="opacity-80" />
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] tracking-tight mb-2">{stat.value}</div>
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{stat.title}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="nx-card p-10">
          <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)]">
                <Clock size={20} />
             </div>
             <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('common.attendance', 'Attendance')}</h3>
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed opacity-70 mb-8">
            {t('casual_dashboard.attendance_tip', 'Clock in and out to track your daily attendance and maintain your work record.')}
          </p>
          <Link to="/attendance" className="block w-full py-4 text-center font-black text-[11px] uppercase tracking-widest text-[var(--text-inverse)] rounded-2xl bg-[var(--primary)] hover:scale-[1.02] active:scale-95 shadow-xl shadow-[var(--primary)]/20 transition-all no-underline">
            {t('casual_dashboard.clock_in_out', 'Clock In / Clock Out')}
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="nx-card p-10">
          <div className="flex items-center gap-4 mb-10">
             <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--primary)]">
                <Zap size={20} />
             </div>
             <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('employee_dashboard.quick_actions', 'Quick Actions')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: t('employee_dashboard.request_leave', 'Request Leave'), href: '/leave', icon: Calendar },
              { label: t('employee_dashboard.view_payslips', 'View Payslips'), href: '/finance', icon: FileText },
              { label: t('common.profile', 'My Profile'), href: '/profile', icon: User },
              { label: t('employee_dashboard.training_portal', 'Training'), href: '/training', icon: FileText },
            ].map((item, i) => (
              <Link key={i} to={item.href}
                className="flex flex-col gap-4 p-8 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all group no-underline text-inherit">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] group-hover:scale-110 transition-transform`}>
                    <item.icon size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
                </div>
                <span className="text-[11px] font-black text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest">{item.label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default CasualDashboard;
