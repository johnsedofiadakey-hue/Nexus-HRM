import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Target, Clock, ChevronRight, CheckCircle2, 
  TrendingUp, ClipboardCheck, AlertCircle, Award, Zap, ArrowRight, Shield, Activity
} from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import ActionInbox from '../../components/dashboard/ActionInbox';
import { useTranslation } from 'react-i18next';

const ManagerDashboard = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [stats, setStats] = useState({ teamSize: 0, pendingReviews: 0, teamPerf: 88, openLeaves: 0 });
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  useEffect(() => {
    api.get('/analytics/executive')
      .then(res => setStats({
        teamSize: Number(res.data?.totalEmployees) || 0,
        pendingReviews: Number(res.data?.pendingTasks) || 0,
        teamPerf: Number(res.data?.teamPerf) || 0,
        openLeaves: Number(res.data?.activeLeaves) || 0,
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter">
      {/* Identity Header */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-3">
             <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} className="animate-pulse" /> {t('common.management')} {t('dashboard.console')}
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{greeting}</span>
          </div>
          <h1 className="font-black text-5xl text-[var(--text-primary)] tracking-tight leading-none">
            {user.name?.split(' ')[0] || 'Manager'} <span className="text-[var(--text-muted)] font-thin">/ {t('manager_dashboard.title')}</span>
          </h1>
          <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70 max-w-2xl leading-relaxed">
            {user.jobTitle || t('employees.roles.MANAGER')} &nbsp;·&nbsp; {t('manager_dashboard.subtitle')}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="nx-card p-10 border-[var(--primary)]/20 bg-[var(--primary)]/5">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] mb-10 text-center flex items-center justify-center gap-3">
            <Target size={14} />
            {t('manager_dashboard.team_strategy')}
          </h3>
          <div className="flex items-center justify-center">
             <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
               {[
                 { label: t('manager_dashboard.dept'), icon: Zap },
                 { label: t('manager_dashboard.team'), icon: Activity },
                 { label: t('manager_dashboard.focus'), icon: Target },
               ].map((step, idx) => (
                 <div key={idx} className="flex flex-col items-center gap-3 relative">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${idx === 1 ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20' : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                      <step.icon size={20} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${idx === 1 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{step.label}</span>
                    {idx < 2 && (
                      <div className="absolute top-7 -right-2 w-4 h-0.5 bg-[var(--border-subtle)]" />
                    )}
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="nx-card p-10 border-purple-500/20 bg-purple-500/5">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-purple-400 mb-10 text-center flex items-center justify-center gap-3">
            <Award size={14} />
            {t('manager_dashboard.team_growth')}
          </h3>
          <div className="flex items-center justify-center">
             <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
               {[
                 { label: t('md_dashboard.self_review'), icon: Users },
                 { label: t('md_dashboard.alignment'), icon: Shield },
                 { label: t('md_dashboard.growth'), icon: Award },
               ].map((step, idx) => (
                 <div key={idx} className="flex flex-col items-center gap-3 relative">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${idx === 1 ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-purple-500/20 border-purple-500/30 text-purple-400'}`}>
                      <step.icon size={20} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${idx === 1 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{step.label}</span>
                    {idx < 2 && (
                      <div className="absolute top-7 -right-2 w-4 h-0.5 bg-purple-500/30" />
                    )}
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 h-full">
          <ActionInbox />
        </div>
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-8 h-full rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-1">{t('manager_dashboard.active_guidance')}</p>
              <p className="text-xs font-medium text-amber-500/80 uppercase tracking-widest leading-relaxed">
                {t('manager_dashboard.guidance_desc', { pendingReviews: stats.pendingReviews, openLeaves: stats.openLeaves })}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t('manager_dashboard.team_members'), value: stats.teamSize || '0', icon: Users, color: 'var(--primary)' },
          { label: t('manager_dashboard.pending_reviews'), value: stats.pendingReviews || '0', icon: ClipboardCheck, color: '#f59e0b' },
          { label: t('manager_dashboard.team_performance'), value: `${Number(stats.teamPerf || 0).toFixed(1)}%`, icon: CheckCircle2, color: '#10b981' },

          { label: t('manager_dashboard.open_leave_req'), value: stats.openLeaves || '0', icon: Clock, color: '#ec4899' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="nx-card p-8 group hover:border-[var(--primary)]/30 transition-all">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-colors group-hover:border-[var(--primary)]/30 mb-6">
              <s.icon size={22} style={{ color: s.color }} className="opacity-80" />
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] tracking-tight mb-2">
              {loading ? <span className="text-[var(--text-muted)] animate-pulse">···</span> : s.value}
            </div>
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* PENDING REVIEWS (Purple Track) */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="nx-card p-10 border-purple-500/20">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <ClipboardCheck size={24} />
               </div>
               <div>
                  <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('manager_dashboard.pending_reviews')}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">{t('manager_dashboard.growth_calibration')}</p>
               </div>
            </div>
            <Link to="/reviews/team" className="text-[11px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 no-underline">
               {t('manager_dashboard.view_all')} <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-4">
             {stats.pendingReviews > 0 ? (
                <div className="p-8 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:bg-purple-500/10 transition-all">
                   <div className="text-center sm:text-left">
                      <p className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">{stats.pendingReviews} {t('common.my_appraisals')} {t('common.active')}</p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{t('md_dashboard.alignment')} & {t('md_dashboard.growth')}</p>
                   </div>
                   <Link to="/reviews/team" className="px-8 py-3 rounded-xl bg-purple-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 hover:bg-purple-500 transition-all no-underline">{t('manager_dashboard.review_now')}</Link>
                </div>
             ) : (
                <div className="p-16 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-3xl">
                   <CheckCircle2 size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                   <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t('manager_dashboard.all_finalized')}</p>
                </div>
             )}
          </div>
        </motion.div>

        {/* TEAM TARGETS (Indigo Track) */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="nx-card p-10 border-[var(--primary)]/20">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20">
                  <Target size={24} />
               </div>
               <div>
                  <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('common.team_targets')}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">{t('manager_dashboard.strategic_mission')}</p>
               </div>
            </div>
            <Link to="/kpi/team" className="text-[11px] font-black uppercase tracking-widest text-[var(--primary)] hover:text-indigo-300 transition-colors flex items-center gap-2 no-underline">
               {t('manager_dashboard.assign')} <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="p-8 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:border-[var(--primary)]/30 transition-all">
                <p className="text-4xl font-black text-[var(--text-primary)] mb-2">8</p>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('manager_dashboard.active_kpi')}</p>
             </div>
             <div className="p-8 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:border-[var(--primary)]/30 transition-all">
                <p className="text-4xl font-black text-[var(--text-primary)] mb-2">2</p>
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('manager_dashboard.draft_missions')}</p>
             </div>
          </div>
        </motion.div>

        {/* TEAM PERFORMANCE (Indigo Track) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="xl:col-span-2 nx-card p-10 border-[var(--primary)]/20 bg-[var(--primary)]/[0.02]">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="font-black text-2xl text-[var(--text-primary)] tracking-tight">{t('manager_dashboard.performance_analytics')}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-1">{t('manager_dashboard.execution_scores')}</p>
            </div>
            <div className="flex items-center gap-3 text-3xl font-black text-emerald-500">
               {Number(stats.teamPerf || 0).toFixed(1)}%

               <TrendingUp size={24} />
            </div>
          </div>

          <div className="h-3 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden mb-12">
             <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: `${stats.teamPerf}%` }} 
               className="h-full bg-gradient-to-r from-[var(--primary)] to-[#8b5cf6] shadow-[0_0_20px_rgba(99,102,241,0.3)]"
             />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('manager_dashboard.execution_velocity')}</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{t('manager_dashboard.high')}</p>
             </div>
             <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('manager_dashboard.target_alignment')}</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">92%</p>
             </div>
             <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('manager_dashboard.resource_drain')}</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{t('manager_dashboard.optimal')}</p>
             </div>
             <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('manager_dashboard.risk_profile')}</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{t('manager_dashboard.low')}</p>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
