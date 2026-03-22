import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Bell, Search, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredUser } from '../../utils/session';
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
        <header 
            className="fixed top-0 left-0 lg:left-[280px] right-0 h-24 z-40 flex items-center justify-between px-8 lg:px-12 transition-all duration-300 border-b border-[var(--border-subtle)]"
            style={{ 
                background: 'var(--bg-main)',
                backgroundColor: 'rgba(var(--primary-rgb), 0.02)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}
        >
            {/* Search Bar / Mobile Menu Toggle */}
            <div className="flex items-center gap-6 flex-1">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
                >
                    <Menu size={20} />
                </button>

                <div className="hidden md:flex items-center gap-3 px-5 py-2.5 rounded-full bg-[var(--bg-elevated)] border border-transparent focus-within:border-[var(--primary)]/30 focus-within:bg-[var(--bg-card)] focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.03)] w-full max-w-[320px] transition-all group">
                    <Search size={16} className="text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        className="bg-transparent border-none outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-full font-medium"
                    />
                </div>
            </div>

            {/* Identity & Actions */}
            <div className="flex items-center gap-6 lg:gap-10">
                {/* Notifications */}
                <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--bg-elevated)] rounded-full transition-all">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--primary)] rounded-full border-2 border-[var(--bg-main)] shadow-[0_0_10px_var(--primary)]" />
                    )}
                </button>

                {/* User Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-4 py-2 pl-2 pr-1 rounded-full transition-all text-left group"
                    >
                        <div className="hidden md:block text-right">
                            <p className="text-[13px] font-bold text-[var(--text-primary)] leading-none mb-1 group-hover:text-[var(--primary)] transition-colors">
                                {user?.name || 'User Profile'}
                            </p>
                            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider opacity-70">
                                {(user as any)?.jobTitle || user?.role?.replace('_',' ') || 'Staff'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--bg-sidebar)] to-[var(--bg-sidebar)] flex items-center justify-center text-white border-2 border-[var(--bg-elevated)] shadow-sm group-hover:border-[var(--primary)]/30 transition-all">
                            <User size={18} className="opacity-80" />
                        </div>
                    </button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-0" onClick={() => setIsDropdownOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                                    className="absolute right-0 mt-3 w-60 nx-card p-2.5 z-50 origin-top-right border-[var(--border-subtle)] shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                                >
                                    <button
                                        onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        <User size={16} className="opacity-60" />
                                        <span className="text-[13px] font-medium tracking-tight">{t('common.profile')}</span>
                                    </button>
                                    <button
                                        onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}
                                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                                    >
                                        <Settings size={16} className="opacity-60" />
                                        <span className="text-[13px] font-medium tracking-tight">{t('common.settings')}</span>
                                    </button>
                                    <div className="h-[1px] bg-[var(--border-subtle)] my-2 opacity-50" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg hover:bg-rose-500/5 text-rose-500 transition-all font-semibold"
                                    >
                                        <LogOut size={16} />
                                        <span className="text-[13px] tracking-tight">{t('common.logout')}</span>
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
