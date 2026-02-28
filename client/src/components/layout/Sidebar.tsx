import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Target, Users, LogOut, Calendar, ClipboardCheck,
  Settings, Package, Shield, Building2, FileText,
  ChevronRight, User, DollarSign, GraduationCap,
  Moon, Sun, Activity, Zap, Globe, Wallet, Clock, Terminal
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useWebSocket } from '../../services/websocket';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const ROLE_RANKS: any = { DEV: 100, MD: 90, DIRECTOR: 80, MANAGER: 70, MID_MANAGER: 60, STAFF: 50, CASUAL: 10 };

interface NavItemProps { to: string; icon: React.ElementType; label: string; badge?: number; index: number; }

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

const NavItem = ({ to, icon: Icon, label, badge, index }: NavItemProps) => (
  <NavLink to={to} className={({ isActive }) => cn(
    "flex items-center px-4 py-3.5 rounded-2xl mx-3 mb-1 text-[13.5px] font-bold transition-all duration-300 group relative",
    isActive
      ? "bg-primary/10 text-primary-light shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"
      : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
  )}>
    {({ isActive }) => (
      <>
        {isActive && (
          <motion.div
            layoutId="active-nav-indicator"
            className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <Icon size={18} className={cn(
          "mr-4 flex-shrink-0 transition-all duration-300",
          isActive ? "text-primary-light scale-110" : "text-slate-500 group-hover:text-slate-300 group-hover:scale-110"
        )} />
        <span className="flex-1 tracking-tight">{label}</span>
        {badge ? (
          <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-white shadow-lg shadow-primary/20">{badge}</span>
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

import { X } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) => {
  const navigate = useNavigate();
  const { settings, isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllRead } = useWebSocket();
  const [showNotifs, setShowNotifs] = useState(false);

  const userString = localStorage.getItem('nexus_user');
  const user = userString ? JSON.parse(userString) : {};
  const currentRank = ROLE_RANKS[user.role] || 0;

  const isManager = currentRank >= 60; // MID_MANAGER and up
  const isAdmin = currentRank >= 80;   // DIRECTOR and up
  const isDEV = currentRank === 100;   // DEV only

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    navigate('/');
  };

  const initials = user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??';

  return (
    <>
      {/* Mobile Backdrop Overlay - closes sidebar when clicked outside */}
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
        "fixed left-0 top-0 h-full w-72 flex flex-col z-[70] glass rounded-none border-y-0 border-l-0 border-white/[0.05] bg-[#080c16]/95 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>

        {/* Premium Logo Section */}
        <div className="px-8 py-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xl shadow-primary/20"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
            >
              {settings.companyLogoUrl
                ? <img src={settings.companyLogoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                : <Shield size={22} className="text-white" />
              }
            </motion.div>
            <div className="min-w-0">
              <div>
                <h1 className="text-[14px] font-black tracking-widest text-white uppercase font-display leading-tight">{settings.companyName || 'NEXUS'}</h1>
                <p className="text-[9px] font-black tracking-[0.3em] text-primary-light uppercase mt-1 opacity-80 decoration-primary underline decoration-2 underline-offset-4">HRM OS</p>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white mt-1">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Optimized Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto px-2 custom-scrollbar">
          <NavGroup label="Main" delay={0.1}>
            <NavItem index={0} to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem index={1} to="/attendance" icon={Clock} label="Attendance" />
            <NavItem index={2} to="/orgchart" icon={Globe} label="Org Chart" />
          </NavGroup>

          <NavGroup label="Modules" delay={0.2}>
            <NavItem index={3} to="/performance" icon={Target} label="Performance" />
            <NavItem index={4} to="/appraisals" icon={ClipboardCheck} label="Appraisals" />
            <NavItem index={5} to="/finance" icon={Wallet} label="Finance & Loans" />
            <NavItem index={6} to="/leave" icon={Calendar} label="Leave" />
            <NavItem index={7} to="/training" icon={GraduationCap} label="Training" />
            <NavItem index={8} to="/payroll" icon={DollarSign} label="Payroll" />
          </NavGroup>

          {isManager && (
            <NavGroup label="Management" delay={0.3}>
              <NavItem index={9} to="/team" icon={Users} label="Team Review" />
              <NavItem index={10} to="/manager-appraisals" icon={Activity} label="Team Appraisals" />
            </NavGroup>
          )}

          {isAdmin && (
            <NavGroup label="Admin" delay={0.4}>
              <NavItem index={11} to="/employees" icon={User} label="Employees" />
              <NavItem index={12} to="/departments" icon={Building2} label="Departments" />
              <NavItem index={13} to="/cycles" icon={FileText} label="Review Cycles" />
              <NavItem index={14} to="/assets" icon={Package} label="Assets" />
              {ROLE_RANKS[user.role] >= 90 && (
                <NavItem index={15} to="/audit" icon={Shield} label="Audit Logs" />
              )}
              {isDEV && (
                <NavItem index={16} to="/it-admin" icon={Terminal} label="IT Admin" />
              )}
            </NavGroup>
          )}

          {isDEV && (
            <NavGroup label="Developer" delay={0.5}>
              <NavItem index={17} to="/dev" icon={Zap} label="System Portal" />
            </NavGroup>
          )}
        </nav>

        {/* Premium Footer */}
        <div className="p-6 mt-auto border-t border-white/[0.03]">
          <motion.div
            whileHover={{ y: -2 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-primary/20 transition-all cursor-pointer group"
            onClick={() => isDEV ? navigate('/settings') : undefined}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-lg shadow-black/50"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
              {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-xl object-cover" /> : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate group-hover:text-primary-light transition-colors">{user.name || 'Nexus User'}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{user.role?.replace('_', ' ')}</p>
            </div>
            {isDEV && <Settings size={16} className="text-slate-600 group-hover:text-white group-hover:rotate-90 transition-all duration-500" />}
          </motion.div>

          <div className="flex items-center justify-between mt-6 px-2">
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
