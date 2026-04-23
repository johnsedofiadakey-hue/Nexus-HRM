import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Target, Award, Zap, Shield, Send } from 'lucide-react';
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
    // Hardened fetching with AbortController and timeout safety
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s safety

    api.get('/analytics/personal', { signal: controller.signal })
      .then(r => setStats(r.data))
      .catch((err) => {
        if (err.name === 'AbortError') console.warn('[CasualDashboard] Analytics fetch timed out');
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter">
      {/* Identity Header */}
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
        <div className="flex items-center gap-3 mb-3">
           <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
              <Zap size={12} className="animate-pulse" /> {t('common.casual_worker')} {t('dashboard.console')}
           </div>
           <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
           <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{greeting}</span>
        </div>
        <h1 className="font-black text-5xl text-[var(--text-primary)] tracking-tight leading-none">
          {user.name?.split(' ')[0] || 'Team'} <span className="text-[var(--text-muted)] font-thin">/ Overview</span>
        </h1>
        <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70">
          {user.jobTitle || 'Production Agent'} &nbsp;·&nbsp; {t('employee_dashboard.subtitle')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-white/100">
        <div className="lg:col-span-4">
           <ActionInbox isInline />
        </div>
        <div className="lg:col-span-8">
           <motion.div 
             initial={{ opacity: 0, y: 12 }} 
             animate={{ opacity: 1, y: 0 }}
             className="nx-card p-10 h-full bg-[var(--primary)]/5 border-[var(--primary)]/10 flex flex-col justify-center gap-6"
           >
             <div className="flex items-center gap-6 text-white/100">
                <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20">
                    <Shield size={32} />
                </div>
                <div>
                    <h3 className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.3em] mb-2">{t('employee_dashboard.personnel_status')}</h3>
                    <p className="text-xl font-bold text-[var(--text-primary)]">Verified Account</p>
                    <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Your production metrics are currently being synchronized with the master ledger.</p>
                </div>
             </div>
           </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Efficiency', value: loading ? '…' : `${stats?.overallPerformance ?? 100}%`, icon: Target, color: 'var(--primary)' },
          { title: 'Availability', value: loading ? '…' : `${stats?.attendanceRate ?? 100}%`, icon: Clock, color: 'var(--success)' },
          { title: 'Shift Bonus', value: 'Active', icon: Calendar, color: 'var(--warning)' },
          { title: 'Certified', value: 'Yes', icon: Award, color: 'var(--accent)' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="nx-card p-10 group hover:border-[var(--primary)]/30 transition-all">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/30 transition-colors mb-8">
              <stat.icon size={22} style={{ color: stat.color }} className="opacity-80" />
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] tracking-tight mb-2">{stat.value}</div>
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{stat.title}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CasualDashboard;
