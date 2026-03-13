import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Calendar, User } from 'lucide-react';
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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-[#020617]/80 backdrop-blur-xl border-t border-white/[0.05] safe-area-bottom">
            <div className="flex items-center justify-around h-20 px-4">
                {navItems.map((item, i) => (
                    <NavLink
                        key={i}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex flex-col items-center justify-center gap-1.5 transition-all duration-300",
                            isActive ? "text-primary scale-110" : "text-slate-500"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    "group-active:scale-90"
                                )}>
                                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default MobileNav;
