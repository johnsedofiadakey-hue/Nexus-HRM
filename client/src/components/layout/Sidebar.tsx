import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck,
  Settings, Building2, ChevronRight, LogOut, ShieldCheck,
  DollarSign, Target, Package, Zap, Shield,
  RefreshCw, CreditCard, ShieldAlert, BarChart3, PieChart,
  Layers, Activity, Clock, Wallet, Megaphone, GraduationCap,
  Globe, ClipboardList, FileText, BarChart2, PanelLeftClose, PanelLeftOpen,
  Menu, X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import { useState, useEffect } from 'react';
import { getStoredUser, getRankFromRole } from '../../utils/session';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  isCollapsed?: boolean;
  variant?: 'primary' | 'accent';
}

const NavGroup = ({ label, children, isCollapsed }: { label: string; children: React.ReactNode; isCollapsed?: boolean }) => (
  <div className="mb-6 px-4">
    {!isCollapsed && (
      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] opacity-60">
        {label}
      </p>
    )}
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const NavItem = ({ to, icon: Icon, label, badge, isCollapsed, variant = 'primary' }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) => cn(
      "flex items-center rounded-[var(--radius-button)] transition-all duration-200 group relative",
      isCollapsed ? "justify-center p-3 mx-auto w-10 h-10" : "px-3 py-2.5 mx-0 h-11",
      isActive
        ? "bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)]"
        : "text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-active)] hover:text-[var(--text-sidebar-active)]"
    )}
  >
    {({ isActive }) => (
      <>
        {isActive && !isCollapsed && (
          <motion.div
            layoutId="active-indicator"
            className="absolute left-0 w-1 h-5 bg-[var(--primary)] rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <Icon size={20} className={cn(
          "flex-shrink-0 transition-transform",
          isActive ? "scale-110" : "group-hover:scale-110",
          !isCollapsed && "mr-3"
        )} />
        {!isCollapsed && (
          <span className="flex-1 font-semibold text-[13px] tracking-tight truncate">{label}</span>
        )}
        {badge !== undefined && !isCollapsed && (
          <span className="ml-2 text-[10px] font-bold bg-[var(--primary)] text-[var(--text-inverse)] px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        
        {/* Collapsed Tooltip */}
        {isCollapsed && (
          <div className="absolute left-14 px-3 py-2 bg-[var(--bg-sidebar)] border border-[var(--sidebar-border)] text-[var(--text-sidebar-active)] text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl">
            {label}
          </div>
        )}
      </>
    )}
  </NavLink>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
}

const Sidebar = ({ isOpen, onClose, isCollapsed, setIsCollapsed }: SidebarProps) => {
  const navigate = useNavigate();
  const { settings } = useTheme();
  const { t } = useTranslation();
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);
  const isDEV = rank === 100;
  
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingAppraisals, setPendingAppraisals] = useState(0);

  useEffect(() => {
    if (isDEV || rank < 60) return;
    api.get('/leave/pending').then(r => setPendingLeave(Array.isArray(r.data) ? r.data.length : 0)).catch(() => {});
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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className={cn(
          "fixed left-0 top-0 h-full flex flex-col z-[70] transition-transform duration-300 lg:translate-x-0 border-r overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ 
          background: 'var(--bg-sidebar)',
          borderColor: 'var(--sidebar-border)'
        }}
      >
        {/* Toggle / Header */}
        <div className="flex items-center justify-between h-20 px-6 flex-shrink-0 border-b border-[var(--sidebar-border)]">
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden ml-1">
              <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
                <Shield size={20} className="text-[var(--text-inverse)]" />
              </div>
              <div className="truncate">
                <h1 className="text-xs font-black tracking-widest text-[var(--text-sidebar-active)] uppercase leading-none">
                  {settings?.companyName || 'NEXUS'}
                </h1>
                <p className="text-[9px] font-bold text-[var(--text-sidebar)] uppercase mt-1 opacity-50">
                  {settings?.subtitle || 'SYSTEM OS'}
                </p>
              </div>
            </div>
          )}
          {isCollapsed && (
             <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center mx-auto">
             <Shield size={20} className="text-[var(--text-inverse)]" />
           </div>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 rounded-lg text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-active)] transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          
          <button onClick={onClose} className="lg:hidden p-2 text-[var(--text-sidebar)] hover:bg-[var(--bg-sidebar-active)] rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {!isDEV && (
            <>
              <NavGroup label={t('common.personal')} isCollapsed={isCollapsed}>
                <NavItem to="/dashboard" icon={LayoutDashboard} label={t('common.dashboard')} isCollapsed={isCollapsed} />
                <NavItem to="/profile" icon={Users} label={t('common.profile')} isCollapsed={isCollapsed} />
                <NavItem to="/attendance" icon={Clock} label={t('common.attendance')} isCollapsed={isCollapsed} />
                <NavItem to="/leave" icon={Calendar} label={t('common.leave')} isCollapsed={isCollapsed} />
                <NavItem to="/finance" icon={Wallet} label={t('common.finance')} isCollapsed={isCollapsed} />
              </NavGroup>

              <NavGroup label={t('common.performance')} isCollapsed={isCollapsed}>
                <NavItem to="/kpi/my-targets" icon={Target} label={t('common.my_targets')} isCollapsed={isCollapsed} />
                <NavItem to="/reviews/my" icon={BarChart3} label={t('common.my_appraisals')} variant="accent" isCollapsed={isCollapsed} />
                {rank >= 70 && (
                  <NavItem to="/reviews/team" icon={ClipboardCheck} label={t('common.team_appraisals')} variant="accent" badge={pendingAppraisals || undefined} isCollapsed={isCollapsed} />
                )}
              </NavGroup>

              <NavGroup label={t('common.operations')} isCollapsed={isCollapsed}>
                <NavItem to="/assets" icon={Package} label={t('common.assets')} isCollapsed={isCollapsed} />
                <NavItem to="/training" icon={GraduationCap} label={t('common.training')} isCollapsed={isCollapsed} />
                <NavItem to="/holidays" icon={Calendar} label={t('common.holidays')} isCollapsed={isCollapsed} />
                <NavItem to="/onboarding" icon={ClipboardList} label={t('common.onboarding')} isCollapsed={isCollapsed} />
              </NavGroup>

              {rank >= 80 && (
                <NavGroup label={t('common.administration')} isCollapsed={isCollapsed}>
                  <NavItem to="/payroll" icon={DollarSign} label={t('common.payroll')} isCollapsed={isCollapsed} />
                  <NavItem to="/settings" icon={Settings} label={t('common.admin_settings')} isCollapsed={isCollapsed} />
                  <NavItem to="/enterprise" icon={Zap} label={t('common.enterprise_suite')} isCollapsed={isCollapsed} />
                </NavGroup>
              )}
            </>
          )}

          {isDEV && (
            <NavGroup label="System" isCollapsed={isCollapsed}>
              <NavItem to="/dev/dashboard" icon={ShieldAlert} label="Dev Dashboard" isCollapsed={isCollapsed} />
              <NavItem to="/dev/tenants" icon={Building2} label="Tenant Control" isCollapsed={isCollapsed} />
            </NavGroup>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--sidebar-border)]">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center rounded-xl text-[var(--text-sidebar)] hover:text-rose-400 hover:bg-rose-500/10 transition-all group",
              isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3"
            )}
          >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="font-bold text-[13px]">{t('common.logout')}</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
