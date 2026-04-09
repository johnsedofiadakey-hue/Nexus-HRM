import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Calendar, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

const MobileNav = () => {
    const { t } = useTranslation();
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: t('common.dashboard'), path: '/dashboard' },
        { icon: Inbox, label: t('common.inbox'), path: '/notifications' },
        { icon: Calendar, label: t('common.leave'), path: '/leave' },
        { icon: Clock, label: t('common.attendance'), path: '/attendance' },
        { icon: Users, label: t('common.employees'), path: '/employees' },
    ];

    return (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-[60] safe-area-bottom">
            <div className="flex items-center justify-around h-[72px] px-2 bg-[var(--bg-card)]/90 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-[2rem] shadow-2xl shadow-black/20">
                {navItems.map((item, i) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={i}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center justify-center gap-1 min-w-[56px] h-full transition-all duration-300 relative px-2",
                                isActive ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"
                            )}
                        >
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div 
                                        layoutId="mobile-nav-pill"
                                        className="absolute top-2 w-10 h-1 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </AnimatePresence>
                            
                            <div className={cn(
                                "p-2 rounded-xl transition-all duration-300",
                                isActive ? "bg-[var(--primary)]/10" : "bg-transparent"
                            )}>
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-[0.1em] transition-all",
                                isActive ? "opacity-100 scale-100" : "opacity-0 scale-90 h-0"
                            )}>
                                {item.label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNav;
