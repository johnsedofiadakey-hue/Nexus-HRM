import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck,
  Settings, Package, Shield, Building2,
  ChevronRight, LogOut, TrendingUp, ShieldCheck,
  Moon, Sun, Activity, Zap, Clock, DollarSign, Megaphone, Target,
  Rocket, RefreshCw, CreditCard, ShieldAlert, X, BarChart3, PieChart
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { getStoredUser, getRankFromRole } from '../../utils/session';

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
    className="mb-8"
  >
    <p className="px-6 mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500/80">{label}</p>
    {children}
  </motion.div>
);

const NavItem = ({ to, icon: Icon, label, badge, variant = 'primary' }: NavItemProps) => (
  <NavLink to={to} className={({ isActive }) => cn(
    "flex items-center px-4 py-3.5 rounded-2xl mx-3 mb-1 text-[13.5px] font-bold transition-all duration-300 group relative",
    isActive
      ? variant === 'growth' 
        ? "bg-[var(--growth)]/10 text-[var(--growth-light)] shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]"
        : "bg-primary/10 text-primary-light shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"
      : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
  )}>
    {({ isActive }) => (
      <>
        {isActive && (
          <motion.div
            layoutId="active-nav-indicator"
            className={cn(
                "absolute left-0 w-1 h-6 rounded-r-full",
                variant === 'growth' ? "bg-[var(--growth)]" : "bg-primary"
            )}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <Icon size={18} className={cn(
          "mr-4 flex-shrink-0 transition-all duration-300",
          isActive 
            ? variant === 'growth' ? "text-[var(--growth-light)] scale-110" : "text-primary-light scale-110" 
            : "text-slate-500 group-hover:text-slate-300 group-hover:scale-110"
        )} />
        <span className="flex-1 tracking-tight">{label}</span>
        {badge ? (
          <span className={cn(
            "ml-auto text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg",
            variant === 'growth' ? "bg-[var(--growth)] text-white shadow-[var(--growth)]/20" : "bg-primary text-white shadow-primary/20"
          )}>{badge}</span>
        ) : (
          <ChevronRight size={14} className={cn(
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
  const { isDark, toggleTheme, settings } = useTheme();
  const user = getStoredUser();
  const currentRank = getRankFromRole(user.role);
  const isDEV = currentRank === 100;

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_refresh_token');
    localStorage.removeItem('nexus_user');
    navigate('/');
  };

  const initials = user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??';

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
      )} style={{ background: 'var(--sidebar-bg)' }}>

        {/* Logo Section */}
        <div className="px-8 py-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xl shadow-primary/20"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
            >
              {settings?.companyLogoUrl
                ? <img src={settings.companyLogoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                : <Shield size={22} className="text-white" />
              }
            </motion.div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[14px] font-black tracking-widest text-white uppercase font-display leading-tight truncate">
                {settings?.companyName || 'NEXUS'}
              </h1>
              <p className="text-[9px] font-black tracking-[0.3em] text-primary-light uppercase mt-1 opacity-80 decoration-primary underline decoration-2 underline-offset-4">
                {settings?.subtitle || 'HRM OS'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto px-2 custom-scrollbar">
          {/* PERSONAL ACTION */}
          {!isDEV && (
            <NavGroup label="Personal" delay={0.05}>
              <NavItem index={0} to="/dashboard" icon={LayoutDashboard} label="Overview" />
              <NavItem index={1} to="/profile" icon={Users} label="My Profile" />
              <NavItem index={3} to="/leave" icon={Calendar} label="Time Off" />
            </NavGroup>
          )}

          {/* GOALS & KPIs (Strategic Track - Indigo) */}
          {!isDEV && (
            <NavGroup label="Goals & KPIs" delay={0.1}>
              {currentRank >= 80 && (
                <NavItem index={101} to="/kpi/department" icon={PieChart} label="Strategic Planning" />
              )}
              {currentRank >= 70 && (
                <NavItem index={102} to="/kpi/team" icon={Target} label="Operational Planning" />
              )}
              <NavItem index={103} to="/kpi/my-targets" icon={ShieldCheck} label="Target Execution" />
            </NavGroup>
          )}

          {/* PERFORMANCE & REVIEWS (Growth Track - Purple) */}
          {!isDEV && (
            <NavGroup label="Performance & Reviews" delay={0.15}>
              <NavItem index={24} to="/kpi/reviews" icon={BarChart3} label="Self Evaluation" variant="growth" />
              {currentRank >= 70 && (
                <NavItem index={9} to="/manager/appraisals" icon={ClipboardCheck} label="Team Calibration" variant="growth" />
              )}
            </NavGroup>
          )}

          {/* OPERATIONS */}
          {!isDEV && (
            <NavGroup label="Operations" delay={0.2}>
              <NavItem index={4} to="/assets" icon={Package} label="Asset Engine" />
              <NavItem index={160} to="/org-chart" icon={Building2} label="Organogram" />
              <NavItem index={54} to="/training" icon={Zap} label="Growth Catalog" />
            </NavGroup>
          )}

          {/* TEAM MANAGEMENT (Rank 60+) */}
          {!isDEV && currentRank >= 60 && (
            <NavGroup label="Management" delay={0.25}>
              <NavItem index={7} to="/employees" icon={Users} label="Labor force" />
            </NavGroup>
          )}

          {/* ADMINISTRATION (Rank 80+) */}
          {!isDEV && currentRank >= 80 && (
            <NavGroup label="Administration" delay={0.3}>
              <NavItem index={11} to="/departments" icon={Building2} label="Departments" />
              <NavItem index={12} to="/payroll" icon={DollarSign} label="Payroll Engine" />
              
              {(currentRank >= 90 || (currentRank >= 80 && user?.jobTitle?.toUpperCase().includes('HR'))) && (
                <NavItem index={25} to="/cycles" icon={RefreshCw} label="Appraisal Cycles" variant="growth" />
              )}
              
              {currentRank >= 90 && (
                <>
                  <NavItem index={14} to="/company-settings" icon={Settings} label="Company Settings" />
                  <NavItem index={26} to="/saas/billing" icon={CreditCard} label="Subscription" />
                </>
              )}
            </NavGroup>
          )}

          {/* SYSTEM/DEV (Rank 100) */}
          {currentRank >= 100 && (
            <NavGroup label="System Management" delay={0.4}>
              <NavItem index={16} to="/dev/tenants" icon={Building2} label="Tenant Control" />
              <NavItem index={17} to="/dev/dashboard" icon={ShieldAlert} label="Command Center" />
            </NavGroup>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-6 mt-auto border-t border-white/[0.03]">
          <motion.div
            whileHover={{ y: -2 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-primary/20 transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-lg shadow-black/50"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
              {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-xl object-cover" /> : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate group-hover:text-primary-light transition-colors">{user.name || 'Nexus User'}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{(user as any).jobTitle || user.role?.replace('_', ' ') || 'Staff'}</p>
            </div>
          </motion.div>

          <div className="flex items-center justify-between mt-4 px-2">
            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:text-white transition-all">
              {isDark ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-rose-500 hover:text-rose-400 transition-colors"
            >
              <LogOut size={16} /> <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
