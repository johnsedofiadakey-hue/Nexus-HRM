import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Clock, Calendar, FileText, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getStoredUser } from '../../utils/session';
import ActionInbox from '../../components/dashboard/ActionInbox';

const CasualDashboard: React.FC = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [stats, setStats] = React.useState({ attendanceRate: 0, leaveBalance: 0 });
  const [loading, setLoading] = React.useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  React.useEffect(() => {
    api.get('/analytics/personal')
      .then(res => setStats({
        attendanceRate: res.data?.attendanceRate || 0,
        leaveBalance: res.data?.leaveBalance || 0,
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selfServiceActions = [
    { label: t('employee_dashboard.request_leave'), href: '/leave', icon: Calendar, desc: t('casual_dashboard.leave_desc') },
    { label: t('employee_dashboard.view_payslips'), href: '/finance', icon: FileText, desc: t('casual_dashboard.docs_desc') },
    { label: t('employee_dashboard.training_portal'), href: '/training', icon: Clock, desc: t('casual_dashboard.training_desc') },
    { label: t('common.profile'), href: '/profile', icon: User, desc: t('casual_dashboard.profile_desc') },
  ];

  return (
    <div className="space-y-10 page-transition pb-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--primary)] mb-1">{greeting}</p>
        <h1 className="font-black text-4xl text-[var(--text-primary)] tracking-tight leading-none">
          {user.name?.split(' ')[0] || t('common.employee')} <span className="text-[var(--text-muted)] font-thin">/ {t('employee_dashboard.title')}</span>
        </h1>
        <p className="text-[var(--text-secondary)] mt-2 text-sm font-medium">
          {user.jobTitle || t('employees.roles.CASUAL')} &nbsp;·&nbsp; {t('casual_dashboard.ess')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ActionInbox />
        </div>
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="nx-card p-8 h-full flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                <User size={20} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[var(--text-primary)]">{user.name || t('common.employee')}</h3>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-black">{user.jobTitle || t('employees.roles.CASUAL')}</p>
              </div>
            </div>
            <div className="space-y-3">
               <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)] font-bold uppercase tracking-tighter">{t('casual_dashboard.employment_type')}</span>
                  <span className="text-[var(--text-primary)] font-black text-[10px] uppercase tracking-widest">{t('employees.roles.CASUAL')}</span>
               </div>
               <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)] font-bold uppercase tracking-tighter">{t('leave.balance')}</span>
                  <span className="text-[var(--primary)] font-black text-[10px] uppercase tracking-widest">{loading ? '…' : Number(stats.leaveBalance).toFixed(1)} {t('leave.days')}</span>
               </div>
               <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)] font-bold uppercase tracking-tighter">{t('casual_dashboard.access_level')}</span>
                  <span className="text-[var(--primary)] font-black text-[10px] uppercase tracking-widest">{t('casual_dashboard.staff_portal')}</span>
               </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Attendance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="nx-card p-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-[var(--success)]/10 border border-[var(--success)]/20">
              <Clock size={24} className="text-[var(--success)]" />
            </div>
            <div>
              <h3 className="font-black text-xl text-[var(--text-primary)] tracking-tight">{t('common.attendance')}</h3>
              <p className="text-[10px] text-[var(--success)] uppercase tracking-[0.2em] font-black">{loading ? '…' : `${stats.attendanceRate}%`}</p>
            </div>
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed opacity-70">
            {t('casual_dashboard.attendance_tip')}
          </p>
          <Link to="/attendance" className="block w-full py-4 text-center font-black text-[11px] uppercase tracking-widest text-[var(--text-inverse)] rounded-2xl bg-[var(--primary)] hover:scale-[1.02] active:scale-95 shadow-xl shadow-[var(--primary)]/20 transition-all no-underline">
            {t('casual_dashboard.clock_in_out')}
          </Link>
        </motion.div>

        {/* Self-service Links */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="nx-card p-10">
          <h3 className="font-black text-xl text-[var(--text-primary)] mb-8 uppercase tracking-tight">{t('employee_dashboard.quick_actions')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selfServiceActions.map((item, i) => (
              <Link key={i} to={item.href}
                className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/20 transition-all group no-underline">
                <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] group-hover:scale-110 transition-transform">
                  <item.icon size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors uppercase tracking-widest truncate">{item.label}</p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter truncate opacity-60">{item.desc}</p>
                </div>
                <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default CasualDashboard;
