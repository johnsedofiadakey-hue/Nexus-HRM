import React, { useEffect, useState, useCallback } from 'react';
import { 
  Target, TrendingUp, Award, CheckCircle, Clock, 
  AlertCircle, ChevronRight, Plus, BarChart3, 
  Layers, Zap, Shield
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { toast } from '../utils/toast';

const Performance = () => {
    const [targets, setTargets] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');

    const user = getStoredUser();
    const isAdmin = getRankFromRole(user.role) >= 70;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [targetRes, statsRes] = await Promise.all([
                api.get('/performance/targets'),
                api.get('/performance/stats')
            ]);
            setTargets(Array.isArray(targetRes.data) ? targetRes.data : []);
            setStats(statsRes.data);
        } catch (e) {
            console.error(e);
            toast.error('Performance telemetry failure');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getProgressColor = (progress: number) => {
        if (progress >= 80) return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
        if (progress >= 40) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
        return 'text-rose-600 bg-rose-500/10 border-rose-500/20';
    };

    return (
        <div className="space-y-12 pb-32">
            {/* Header Architecture */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">Performance Matrix</h1>
                    <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
                        <Target size={18} className="text-[var(--primary)] opacity-60" />
                        Strategic goal alignment and personnel growth orchestration
                    </p>
                </motion.div>

                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <div className="flex bg-[var(--bg-elevated)]/50 p-1.5 rounded-2xl border border-[var(--border-subtle)]">
                            {(['my', 'team'] as const).map(t => (
                                <button key={t} onClick={() => setActiveTab(t)}
                                    className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === t ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                                    {t === 'my' ? 'Individual' : 'Team Hub'}
                                </button>
                            ))}
                        </div>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3"
                    >
                        <Plus size={18} /> Define Objective
                    </motion.button>
                </div>
            </div>

            {/* Strategic Summary Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'Completion Rate', value: `${stats?.avgProgress || 0}%`, icon: Zap, color: 'text-amber-600 bg-amber-500/5' },
                    { label: 'Active Objectives', value: stats?.activeCount || 0, icon: Target, color: 'text-blue-600 bg-blue-500/5' },
                    { label: 'Strategic Alignment', value: 'High', icon: Shield, color: 'text-emerald-600 bg-emerald-500/5' },
                    { label: 'Growth Velocity', value: '+12%', icon: TrendingUp, color: 'text-purple-600 bg-purple-500/5' }
                ].map((stat, i) => (
                    <motion.div 
                        key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="nx-card p-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden group"
                    >
                        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[var(--primary)]/5 blur-[40px] group-hover:scale-125 transition-transform" />
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-[var(--border-subtle)]/50 shadow-sm", stat.color)}>
                            <stat.icon size={20} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 opacity-60">{stat.label}</p>
                        <h4 className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">{stat.value}</h4>
                    </motion.div>
                ))}
            </div>

            {/* Objective Grid */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] flex items-center gap-4">
                        Strategic Roadmaps
                        <div className="h-[2px] w-20 bg-[var(--primary)]/20" />
                    </h3>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-6">
                        <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Pulling performance metrics</p>
                    </div>
                ) : targets.length === 0 ? (
                    <div className="nx-card py-24 flex flex-col items-center justify-center gap-6 border-[var(--border-subtle)] border-dashed bg-transparent opacity-40 text-[var(--text-muted)]">
                        <Layers size={48} />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">No strategic objectives defined</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {targets.map((target, i) => (
                            <motion.div 
                                key={target.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                                className="nx-card group flex flex-col bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30 hover:shadow-2xl transition-all duration-500 overflow-hidden"
                            >
                                <div className="p-8 space-y-8">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-black text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors tracking-tight uppercase leading-tight">{target.title}</h4>
                                            <p className="text-[11px] font-medium text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{target.description || 'Core administrative development initiative'}</p>
                                        </div>
                                        <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm", getProgressColor(target.progress))}>
                                            {target.progress}%
                                        </div>
                                    </div>

                                    {/* Vision Progress architecture */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">
                                            <span>Milestone Status</span>
                                            <span className="text-[var(--text-secondary)]">{target.dueDate ? new Date(target.dueDate).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Continuous'}</span>
                                        </div>
                                        <div className="h-4 w-full bg-[var(--bg-elevated)] rounded-xl overflow-hidden p-1 border border-[var(--border-subtle)]">
                                            <motion.div 
                                                initial={{ width: 0 }} animate={{ width: `${target.progress}%` }} transition={{ duration: 1, delay: 0.5 }}
                                                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-lg shadow-lg relative cursor-help group/progress"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-[var(--border-subtle)]/30 pt-6">
                                        <div className="flex items-center gap-4 text-[11px] font-bold text-[var(--text-secondary)]">
                                            <div className="flex items-center gap-2 group-hover:text-[var(--primary)] transition-colors">
                                                <Zap size={14} className="opacity-50" />
                                                <span>{target.kpis?.length || 0} KPI Metrics</span>
                                            </div>
                                        </div>
                                        <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:gap-5 transition-all">
                                            Analyze Analytics <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Performance;
