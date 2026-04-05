import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Calendar, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

const MobileNav = () => {
    const { t } = useTranslation();

    const navItems = [
        { icon: LayoutDashboard, label: t('common.dashboard'), path: '/dashboard' },
        { icon: Clock, label: t('common.attendance'), path: '/attendance' },
        { icon: Calendar, label: t('common.leave'), path: '/leave' },
        { icon: Users, label: t('common.employees'), path: '/employees' },
        { icon: UserIcon, label: t('common.profile'), path: '/profile' },
    ];

    return (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[60] safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2 bg-[var(--bg-card)]/80 backdrop-blur-3xl border border-[var(--border-subtle)] rounded-2xl shadow-xl">
                {navItems.map((item, i) => (
                    <NavLink
                        key={i}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex flex-col items-center justify-center gap-1 w-14 h-12 transition-all duration-300 relative",
                            isActive ? "text-[var(--primary)]" : "text-[var(--text-secondary)] opacity-60"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div 
                                        layoutId="mobile-nav-active"
                                        className="absolute inset-0 bg-[var(--primary)]/5 rounded-xl border border-[var(--primary)]/10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-[0.1em] relative z-10 transition-all text-center truncate w-full px-1",
                                    isActive ? "opacity-100" : "opacity-0"
                                )}>
                                    {item.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default MobileNav;
