import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Brain, Zap, 
  AlertCircle, CheckCircle2, 
  TrendingUp, Info, Bot
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAI } from '../../context/AIContext';
import { analyzeContext, type StrategicVerdict, type StrategicInsight } from '../../services/InsightEngine';
import { getStoredUser } from '../../utils/session';

interface NexusAIInsightProps {
    isOpen: boolean;
    onClose: () => void;
    contextData?: any;
}

const NexusAIInsight: React.FC<NexusAIInsightProps> = ({ isOpen, onClose, contextData }) => {
    const location = useLocation();
    const { contextData: globalContextData, isEnabled } = useAI();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [verdict, setVerdict] = useState<StrategicVerdict | null>(null);
    
    const user = getStoredUser();
    const isStrategicMode = (user.rank || 0) >= 85;

    const activeContext = contextData || globalContextData;

    useEffect(() => {
        if (isOpen && isEnabled) {
            setIsAnalyzing(true);
            const timer = setTimeout(() => {
                const results = analyzeContext(location.pathname, activeContext);
                setVerdict(results);
                setIsAnalyzing(false);
            }, 1200); // Simulated analysis delay for premium feel
            return () => clearTimeout(timer);
        }
    }, [isOpen, isEnabled, location.pathname, activeContext]);

    // AI Guardrail: Do not render if disabled in settings (MUST BE AFTER HOOKS)
    if (!isEnabled) return null;

    const getIcon = (type: StrategicInsight['type']) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle2 className="text-emerald-500" size={14} />;
            case 'WARNING': return <AlertCircle className="text-amber-500" size={14} />;
            case 'CRITICAL': return <Zap className="text-rose-500" size={14} />;
            default: return <Info className="text-sky-500" size={14} />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:bg-transparent lg:backdrop-blur-none"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-[400px] lg:w-[450px] bg-[var(--bg-card)]/95 backdrop-blur-2xl border-l border-[var(--border-subtle)] z-[101] shadow-2xl flex flex-col ai-neural-bg"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white ai-glow-primary shadow-lg animate-pulse-subtle">
                                    <Bot size={22} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
                                        {isStrategicMode ? 'Strategic Intelligence' : 'Nexus Intelligence'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles size={10} className={cn(isStrategicMode ? "text-amber-500" : "text-[var(--primary)]")} /> 
                                        {isStrategicMode ? 'Executive Laboratory ' : 'Strategic Laboratory'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {isAnalyzing ? (
                                <div className="h-full flex flex-col items-center justify-center gap-6 py-20">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-2 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                                        <Brain className="absolute inset-0 m-auto text-[var(--primary)] animate-pulse" size={24} />
                                    </div>
                                    <div className="space-y-1 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] ai-gradient-text">Analyzing Context</p>
                                        <p className="text-[9px] font-bold text-[var(--text-muted)] animate-pulse">Scanning multidimensional data points...</p>
                                    </div>
                                </div>
                            ) : verdict ? (
                                <>
                                    {/* Primary Verdict Card */}
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "nx-card p-6 bg-gradient-to-br border-2 transition-all duration-1000",
                                            isStrategicMode 
                                                ? "from-amber-500/10 to-transparent border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]" 
                                                : "from-[var(--bg-elevated)]/50 to-[var(--bg-card)]/30 border-[var(--primary)]/20 ai-border-glow"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                                <TrendingUp size={16} />
                                            </div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--primary)]">{verdict.title}</h3>
                                        </div>
                                        <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed mb-4">
                                            {verdict.summary}
                                        </p>
                                        <div className={cn("p-4 rounded-xl border transition-all", isStrategicMode ? "bg-amber-500/10 border-amber-500/20" : "bg-[var(--primary)]/5 border-border-[var(--primary)]/10")}>
                                            <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] mb-2", isStrategicMode ? "text-amber-600" : "text-[var(--primary)]")}>
                                                {isStrategicMode ? 'Institutional Advisory' : 'Strategic Verdict'}
                                            </p>
                                            <p className="text-xs font-medium text-[var(--text-secondary)] italic leading-relaxed">
                                                "{verdict.recommendation}"
                                            </p>
                                        </div>
                                    </motion.div>

                                    {/* Decomposition Analysis */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] px-1">Heuristic Breakdown</h4>
                                        <div className="space-y-4">
                                            {verdict.insights.map((insight, i) => (
                                                <motion.div 
                                                    key={insight.id}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="p-4 rounded-xl bg-[var(--bg-elevated)]/40 border border-[var(--border-subtle)] space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {getIcon(insight.type)}
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{insight.label}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-[var(--text-muted)] opacity-60">Impact: {insight.impact}%</span>
                                                    </div>
                                                    <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                                                        {insight.description}
                                                    </p>
                                                    <div className="h-1 w-full bg-[var(--bg-card)] rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${insight.impact}%` }}
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                insight.type === 'CRITICAL' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                                                                insight.type === 'WARNING' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                                                                insight.type === 'SUCCESS' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                                                "bg-[var(--primary)] shadow-[0_0_8px_var(--ring-color)]"
                                                            )}
                                                        />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Confidence Meter */}
                                    <div className="pt-4 px-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Model Confidence</span>
                                            <span className="text-[9px] font-bold text-[var(--primary)]">{Math.round(verdict.confidence * 100)}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${verdict.confidence * 100}%` }}
                                                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-20 opacity-40">
                                    <Bot size={48} className="mx-auto mb-4" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Awaiting Contextual Stream</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30">
                            <button 
                                onClick={onClose}
                                className="w-full py-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all flex items-center justify-center gap-2"
                            >
                                <X size={14} /> Dismiss Laboratory
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NexusAIInsight;
