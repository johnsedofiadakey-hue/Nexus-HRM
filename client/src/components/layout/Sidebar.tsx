import { NavLink, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '../common/ThemeSwitcher';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck,
  Settings, Building2, ChevronRight, LogOut, ShieldCheck,
  DollarSign, Target, Package, Zap, Shield,
  RefreshCw, CreditCard, ShieldAlert, BarChart3, PieChart,
  Layers, Activity, Clock, Wallet, Megaphone, GraduationCap,
  Globe, ClipboardList, FileText, BarChart2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { getStoredUser, getRankFromRole } from '../../utils/session';
import api from '../../services/api';
import { useState, useEffect } from 'react';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  index: number;
  variant?: 'primary' | 'growth';
}

const NavGroup = ({ label, children, delay = 0 }: { label: string; children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay }}
    className="mb-6"
  >
    <p className="px-6 mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500/70">{label}</p>
    {children}
  </motion.div>
);

const NavItem = ({ to, icon: Icon, label, badge, variant = 'primary' }: NavItemProps) => (
  <NavLink to={to} className={({ isActive }) => cn(
    "flex items-center px-4 py-3 rounded-2xl mx-3 mb-0.5 text-[13px] font-bold transition-all duration-300 group relative",
    isActive
      ? variant === 'growth'
        ? "bg-growth/10 text-growth-light shadow-[inset_0_0_20px_rgba(var(--growth-rgb),0.05)]"
        : "bg-primary/10 text-primary-light shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.05)]"
      : "text-text-secondary hover:bg-white/[0.03] hover:text-text-main"
  )}>
    {({ isActive }) => (
      <>
        {isActive && (
          <motion.div
            layoutId="active-nav-indicator"
            className={cn("absolute left-0 w-1 h-5 rounded-r-full", variant === 'growth' ? "bg-growth" : "bg-primary")}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <Icon size={17} className={cn(
          "mr-3.5 flex-shrink-0 transition-all duration-300",
          isActive
            ? variant === 'growth' ? "text-growth-light scale-110" : "text-primary-light scale-110"
            : "text-text-muted group-hover:text-text-secondary group-hover:scale-110"
        )} />
        <span className="flex-1 tracking-tight">{label}</span>
        {badge ? (
          <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary text-white">{badge}</span>
        ) : (
          <ChevronRight size={13} className={cn(
            "ml-auto transition-all duration-300",
            isActive ? "opacity-100 rotate-90" : "opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0"
          )} />
        )}
      </>
    )}
  </NavLink>
);

const Sidebar = ({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) => {
  const navigate = useNavigate();
  const { settings } = useTheme();
  const { t } = useTranslation();
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);
  const isDEV = rank === 100;
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingAppraisals, setPendingAppraisals] = useState(0);

  // Fetch pending counts for badges
  useEffect(() => {
    if (isDEV || rank < 60) return;
    api.get('/leave/pending').then(r => {
      const arr = Array.isArray(r.data) ? r.data : [];
      setPendingLeave(arr.length);
    }).catch(() => {});
    if (rank >= 70) {
      api.get('/appraisals/team-packets').then(r => {
        const arr = Array.isArray(r.data) ? r.data : [];
        setPendingAppraisals(arr.filter((p: any) => p.status === 'OPEN').length);
      }).catch(() => {});
    }
  }, [rank, isDEV]);

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_refresh_token');
    localStorage.removeItem('nexus_user');
    navigate('/');
  };

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed left-0 top-0 h-full w-72 flex flex-col z-[70] glass rounded-none border-y-0 border-l-0 border-white/[0.05] transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ background: 'var(--sidebar-bg, #080c16)' }}>

        {/* Logo */}
        <div className="px-7 py-8 flex-shrink-0 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xl shadow-primary/20"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent, #06b6d4))' }}
            >
              {settings?.companyLogoUrl
                ? <img src={settings.companyLogoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                : <Shield size={20} className="text-white" />
              }
            </motion.div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[13px] font-black tracking-widest text-text-main uppercase leading-tight truncate">
                {settings?.companyName || 'NEXUS HRM'}
              </h1>
              <p className="text-[9px] font-black tracking-[0.3em] text-primary-light uppercase mt-0.5 opacity-70">
                {settings?.subtitle || 'MANAGEMENT OS'}
              </p>
            </div>
          </div>
        </div>

        {/* User badge */}
        <div className="px-5 py-4 flex-shrink-0 border-b border-white/[0.04]">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03]">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-black text-primary-light flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
              ) : initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-text-main truncate">{user.name || 'User'}</p>
              <p className="text-[9px] font-black text-text-muted uppercase tracking-widest truncate">{user.role}</p>
            </div>
            <ThemeSwitcher />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">

          {/* ── PERSONAL (all non-DEV) */}
          {!isDEV && (
            <NavGroup label={t('common.personal')} delay={0.05}>
              <NavItem index={0} to="/dashboard" icon={LayoutDashboard} label={t('common.dashboard')} />
              <NavItem index={1} to="/profile" icon={Users} label={t('common.profile')} />
              <NavItem index={2} to="/attendance" icon={Clock} label={t('common.attendance')} />
              <NavItem index={3} to="/leave" icon={Calendar} label={t('common.leave')} />
              <NavItem index={4} to="/finance" icon={Wallet} label={t('common.finance')} />
            </NavGroup>
          )}

          {/* ── PERFORMANCE (all non-DEV) */}
          {!isDEV && (
            <NavGroup label={t('common.performance')} delay={0.1}>
              <NavItem index={10} to="/kpi/my-targets" icon={Target} label={t('common.my_targets')} />
              <NavItem index={11} to="/reviews/my" icon={BarChart3} label={t('common.my_appraisals')} variant="growth" />
              {rank >= 70 && (
                <NavItem index={12} to="/reviews/team" icon={ClipboardCheck} label={t('common.team_appraisals')} variant="growth" badge={pendingAppraisals || undefined} />
              )}
              {rank >= 80 && (
                <NavItem index={13} to="/reviews/final" icon={ShieldCheck} label={t('common.final_verdict')} variant="growth" />
              )}
              {rank >= 80 && (
                <NavItem index={14} to="/reviews/cycles" icon={RefreshCw} label={t('common.appraisal_cycles')} variant="growth" />
              )}
              {rank >= 70 && (
                <NavItem index={15} to="/performance/calibration" icon={BarChart2} label={t('common.calibration')} variant="growth" />
              )}
            </NavGroup>
          )}

          {/* ── OPERATIONS (all non-DEV) */}
          {!isDEV && (
            <NavGroup label={t('common.operations')} delay={0.15}>
              <NavItem index={20} to="/assets" icon={Package} label={t('common.assets')} />
              <NavItem index={21} to="/training" icon={GraduationCap} label={t('common.training')} />
              <NavItem index={22} to="/holidays" icon={Calendar} label={t('common.holidays')} />
              <NavItem index={23} to="/onboarding" icon={ClipboardList} label={t('common.onboarding')} />
              <NavItem index={24} to="/org-chart" icon={Globe} label={t('common.org_chart')} />
            </NavGroup>
          )}

          {/* ── MANAGEMENT (rank 60+) */}
          {!isDEV && rank >= 60 && (
            <NavGroup label={t('common.management')} delay={0.2}>
              <NavItem index={30} to="/employees" icon={Users} label={t('common.employees')} />
              <NavItem index={31} to="/kpi/team" icon={Target} label={t('common.team_targets')} />
              {rank >= 70 && (
                <NavItem index={32} to="/leave" icon={Calendar} label={t('common.leave_approvals')} badge={pendingLeave || undefined} />
              )}
              {rank >= 60 && (
                <NavItem index={33} to="/it-admin" icon={Shield} label={t('common.it_admin')} />
              )}
            </NavGroup>
          )}

          {/* ── ADMINISTRATION (rank 80+) */}
          {!isDEV && rank >= 80 && (
            <NavGroup label={t('common.administration')} delay={0.25}>
              <NavItem index={40} to="/departments" icon={Building2} label={t('common.departments')} />
              <NavItem index={41} to="/payroll" icon={DollarSign} label={t('common.payroll')} />
              <NavItem index={42} to="/announcements" icon={Megaphone} label={t('common.announcements')} />
              <NavItem index={43} to="/kpi/department" icon={PieChart} label={t('common.dept_kpis')} />
              <NavItem index={44} to="/performance/strategic" icon={Layers} label={t('common.strategic_goals')} />
              <NavItem index={45} to="/settings" icon={Settings} label={t('common.admin_settings')} />
              <NavItem index={46} to="/enterprise" icon={Zap} label={t('common.enterprise_suite')} />
              {rank >= 90 && (
                <>
                  <NavItem index={47} to="/company-settings" icon={Settings} label={t('common.company_settings')} />
                  <NavItem index={48} to="/audit" icon={FileText} label={t('common.audit_logs')} />
                  <NavItem index={49} to="/saas/billing" icon={CreditCard} label={t('common.subscription')} />
                </>
              )}
            </NavGroup>
          )}

          {/* ── DEV (rank 100) */}
          {isDEV && (
            <NavGroup label="System" delay={0.1}>
              <NavItem index={50} to="/dev/dashboard" icon={ShieldAlert} label="Dev Dashboard" />
              <NavItem index={51} to="/dev/tenants" icon={Building2} label="Tenant Control" />
            </NavGroup>
          )}
        </nav>

        {/* Logout */}
        <div className="p-5 flex-shrink-0 border-t border-white/[0.04]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-text-muted hover:text-rose-400 hover:bg-rose-500/5 transition-all group text-[13px] font-bold"
          >
            <LogOut size={17} className="group-hover:scale-110 transition-transform" />
            <span>{t('common.logout')}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
