import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, Bell, Search, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredUser } from '../../utils/session';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';

interface TopHeaderProps {
    onMenuClick: () => void;
}

const TopHeader = ({ onMenuClick }: TopHeaderProps) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
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
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-20 z-40 bg-[var(--bg-navbar)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] shadow-sm px-6 lg:px-10 flex items-center justify-between">
            {/* Search Bar / Mobile Menu Toggle */}
            <div className="flex items-center gap-4 flex-1">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all"
                >
                    <Menu size={20} />
                </button>

                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] w-full max-w-md group focus-within:border-[var(--primary)]/50 transition-all">
                    <Search size={18} className="text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full"
                    />
                    <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] px-1.5 font-mono text-[10px] font-medium text-[var(--text-muted)] opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>
            </div>

            {/* Identity & Actions */}
            <div className="flex items-center gap-3 lg:gap-6">
                {/* Notifications */}
                <button className="relative p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[var(--primary)] rounded-full border-2 border-[var(--bg-card)] text-[9px] font-black text-white flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                <div className="h-8 w-[1px] bg-[var(--border-subtle)] hidden sm:block" />

                {/* User Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-[var(--bg-card)] transition-all text-left"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white shadow-lg shadow-[var(--primary)]/20">
                            <User size={20} />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-xs font-black text-[var(--text-primary)] leading-none mb-1">{user?.name || 'User Profile'}</p>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--primary)] opacity-80">{(user as any)?.jobTitle || user?.role?.replace('_',' ') || 'Staff'}</span>
                            </div>
                        </div>
                        <ChevronDown size={14} className={cn("text-[var(--text-muted)] transition-transform", isDropdownOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-0" onClick={() => setIsDropdownOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-56 nx-card p-2 z-50 origin-top-right shadow-2xl"
                                >
                                    <button
                                        onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        <User size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">{t('common.profile')}</span>
                                    </button>
                                    <button
                                        onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        <Settings size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">{t('common.settings')}</span>
                                    </button>
                                    <div className="h-[1px] bg-[var(--border-subtle)] my-2 mx-2" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-all font-bold"
                                    >
                                        <LogOut size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">{t('common.logout')}</span>
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
