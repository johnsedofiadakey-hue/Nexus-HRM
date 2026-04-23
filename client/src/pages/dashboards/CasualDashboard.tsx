import React from 'react';
import { motion } from 'framer-motion';
import { getStoredUser } from '../../utils/session';
import { useTranslation } from 'react-i18next';
import ActionInbox from '../../components/common/ActionInbox';
import { Zap, Clock, Calendar, Target, Award } from 'lucide-react';

const CasualDashboard: React.FC = () => {
    const { t } = useTranslation();
    const user = getStoredUser();
    
    return (
        <div className="space-y-10 pb-20 max-w-[1600px] mx-auto page-enter">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest flex items-center gap-2">
                        <Zap size={12} className="animate-pulse" /> DEBUG CONSOLE v4.6
                    </div>
                </div>
                <h1 className="font-black text-5xl text-[var(--text-primary)] tracking-tight leading-none">
                    {user.name?.split(' ')[0] || 'Team'} <span className="text-[var(--text-muted)] font-thin">/ My Dashboard</span>
                </h1>
                <p className="text-[14px] font-medium mt-4 text-[var(--text-secondary)] opacity-70">
                    {user.jobTitle || 'Casual Worker'} &nbsp;·&nbsp; Deployment Sync Active
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4">
                    <ActionInbox isInline />
                </div>
                <div className="lg:col-span-8">
                    <div className="nx-card p-10 bg-[var(--primary)]/5 border-[var(--primary)]/10">
                        <p className="text-sm font-bold text-[var(--text-primary)] opacity-60">System is currently validating your personnel record. Dashboard controls will activate once synchronization is complete.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: 'Attendance', value: 'Syncing', icon: Clock, color: 'var(--success)' },
                    { title: 'Leave', value: 'Syncing', icon: Calendar, color: 'var(--warning)' },
                    { title: 'Performance', value: 'Syncing', icon: Target, color: 'var(--primary)' },
                    { title: 'Training', value: 'Syncing', icon: Award, color: 'var(--accent)' },
                ].map((stat, i) => (
                    <div key={i} className="nx-card p-10 opacity-50">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center mb-6">
                             <stat.icon size={18} style={{ color: stat.color }} />
                        </div>
                        <div className="text-2xl font-black text-[var(--text-primary)] mb-2">{stat.value}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{stat.title}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CasualDashboard;
