import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, Bell, Search, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredUser } from '../../utils/session';
import { cn } from '../../utils/cn';

interface TopHeaderProps {
    onMenuClick: () => void;
}

const TopHeader = ({ onMenuClick }: TopHeaderProps) => {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const user = getStoredUser();

    useEffect(() => {
        api.get('/notifications/unread-count')
            .then(r => setUnreadCount(r.data?.count || 0))
            .catch(() => {});
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_refresh_token');
        localStorage.removeItem('nexus_user');
        navigate('/');
    };

    return (
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-20 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/[0.05] px-6 lg:px-10 flex items-center justify-between">
            {/* Search Bar / Mobile Menu Toggle */}
            <div className="flex items-center gap-4 flex-1">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                    <Menu size={20} />
                </button>

                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.05] w-full max-w-md group focus-within:border-primary/50 transition-all">
                    <Search size={18} className="text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-600 w-full"
                    />
                    <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>
            </div>

            {/* Identity & Actions */}
            <div className="flex items-center gap-3 lg:gap-6">
                {/* Notifications */}
                <button className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary rounded-full border-2 border-[#020617] text-[9px] font-black text-white flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />

                {/* User Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-white/5 transition-all text-left"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <User size={20} />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-xs font-black text-white leading-none mb-1">{user?.name || 'User Profile'}</p>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-primary-light">{(user as any)?.jobTitle || user?.role?.replace('_',' ') || 'Staff'}</span>
                            </div>
                        </div>
                        <ChevronDown size={14} className={cn("text-slate-600 transition-transform", isDropdownOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-0" onClick={() => setIsDropdownOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-56 glass border-white/10 p-2 z-50 origin-top-right shadow-2xl"
                                >
                                    <button
                                        onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                                    >
                                        <User size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">My Profile</span>
                                    </button>
                                    <button
                                        onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                                    >
                                        <Settings size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Account Settings</span>
                                    </button>
                                    <div className="h-[1px] bg-white/5 my-2 mx-2" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-all font-bold"
                                    >
                                        <LogOut size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default TopHeader;
