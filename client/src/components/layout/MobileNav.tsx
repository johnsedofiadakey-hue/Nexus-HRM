import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const MobileNav = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
        { icon: Clock, label: 'Time', path: '/attendance' },
        { icon: Calendar, label: 'Off', path: '/leave' },
        { icon: Users, label: 'Team', path: '/employees' },
        { icon: User, label: 'Me', path: '/profile' },
    ];

    return (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[60] safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                {navItems.map((item, i) => (
                    <NavLink
                        key={i}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex flex-col items-center justify-center gap-1 w-14 h-12 transition-all duration-300 relative",
                            isActive ? "text-[var(--primary)]" : "text-slate-400 opacity-60"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div 
                                        layoutId="mobile-nav-active"
                                        className="absolute inset-0 bg-white/5 rounded-xl border border-white/5"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-[0.1em] relative z-10 transition-all",
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
