import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { Calendar, Clock, Play, Plus, RefreshCw, Layers, ShieldCheck, X, AlertCircle, Trash2 } from 'lucide-react';
import api from '../services/api';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import PageHeader from '../components/common/PageHeader';

interface Cycle {
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) return response.data.message;
    }
    if (error instanceof Error) return error.message;
    return fallback;
};

const CycleManagement: React.FC = () => {
    const currentUser = getStoredUser() as { role?: string };
    const canManageCycles = getRankFromRole(currentUser.role) >= 80;
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', type: 'QUARTERLY', startDate: '', endDate: '' });

    useEffect(() => {
        fetchCycles();
    }, []);

    const fetchCycles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/cycles');
            setCycles(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/cycles', formData);
            setShowModal(false);
            setFormData({ name: '', type: 'QUARTERLY', startDate: '', endDate: '' });
            fetchCycles();
            toast.info("Cycle Created!");
        } catch (error) {
            toast.info(String(getErrorMessage(error, "Failed to create cycle")));
        }
    };

    const initiateAppraisals = async (cycleId: string) => {
        if (!confirm("Initiate organizational review? This will generate appraisal forms for all eligible employees.")) return;

        try {
            const res = await api.post('/appraisals/init', { cycleId, employeeIds: [] });
            toast.info(String(res.data.message));
            fetchCycles();
        } catch (error) {
            toast.info(String(getErrorMessage(error, "Failed to initiate")));
        }
    };

    const activateCycle = async (cycleId: string) => {
        try {
            await api.put(`/cycles/${cycleId}`, { status: 'ACTIVE' });
            fetchCycles();
            toast.info("Cycle activated!");
        } catch (error) {
            toast.info(String(getErrorMessage(error, "Failed to activate cycle")));
        }
    };

    const handleDeleteCycle = async (cycleId: string) => {
        if (!confirm("Are you sure you want to delete this cycle? All appraisal data associated with it will be removed. This cannot be undone.")) return;
        setLoading(true);
        try {
            await api.delete(`/cycles/${cycleId}`);
            toast.info("Cycle and associated data removed.");
            fetchCycles();
        } catch (error) {
            toast.info(String(getErrorMessage(error, "Failed to delete cycle")));
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <RefreshCw size={32} className="animate-spin text-[var(--growth-light)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Syncing performance cycles...</p>
        </div>
    );

    return (
        <div className="space-y-10 page-transition min-h-screen pb-20">
            <PageHeader 
                title="Evaluation Cycles"
                description="Performance Review Infrastructure. Establish organizational timelines for retrospective growth calibration."
                icon={Layers}
                variant="purple"
                action={canManageCycles ? {
                    label: "Establish New Cycle",
                    onClick: () => setShowModal(true),
                    icon: Plus
                } : undefined}
            />

            {/* Strategic Information Alert */}
            <div className="p-8 rounded-[2rem] bg-purple-500/5 border border-purple-500/10 flex items-center gap-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--growth)]/10 flex items-center justify-center border border-[var(--growth)]/20">
                    <ShieldCheck className="text-[var(--growth-light)]" size={20} />
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--growth-light)]">Infrastructure Notice</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">These cycles define the retrospective evaluation period for all missions across the organization.</p>
                </div>
            </div>

            {/* Cycles Grid */}
            <div className="grid gap-6">
                {cycles.length === 0 ? (
                    <div className="glass p-20 text-center border-white/[0.05] opacity-50">
                        <Calendar size={48} className="mx-auto mb-6 text-slate-600" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No organizational cycles defined</p>
                    </div>
                ) : (
                    cycles.map((cycle, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={cycle.id} 
                            className="glass p-8 md:p-10 border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-[var(--growth)]/30 transition-all"
                        >
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight">{cycle.name}</h3>
                                    <span className={cn(
                                        "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                                        cycle.status === 'ACTIVE' 
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    )}>
                                        {cycle.status}
                                    </span>
                                </div>
                                <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                    <span className="flex items-center gap-2"><Calendar size={14} className="text-[var(--growth-light)]" /> Start: {new Date(cycle.startDate).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-2"><Clock size={14} className="text-[var(--growth-light)]" /> End: {new Date(cycle.endDate).toLocaleDateString()}</span>
                                    <span className="bg-white/[0.03] px-3 py-1 rounded-lg border border-white/5">{cycle.type}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-5">
                                {cycle.status === 'DRAFT' && canManageCycles && (
                                    <button
                                        onClick={() => activateCycle(cycle.id)}
                                        className="px-6 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Seal & Activate
                                    </button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => initiateAppraisals(cycle.id)}
                                    disabled={cycle.status !== 'ACTIVE' || !canManageCycles}
                                    className={cn(
                                        "px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl",
                                        cycle.status === 'ACTIVE' && canManageCycles 
                                            ? "bg-[var(--growth)] text-white shadow-[var(--growth)]/20 hover:scale-105" 
                                            : "bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed grayscale"
                                    )}
                                >
                                    <Play size={16} fill="currentColor" /> Deploy Review Package
                                </motion.button>
                                {canManageCycles && (
                                    <button 
                                        onClick={() => handleDeleteCycle(cycle.id)}
                                        className="p-4 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors text-slate-600 border border-white/5"
                                        title="Delete Cycle"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* CREATE MODAL */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass w-full max-w-xl bg-[#0a0f1e] border-white/[0.05] p-10 relative shadow-2xl overflow-hidden"
                        >
                             <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
                                <RefreshCw size={120} className="text-[var(--growth)]" />
                             </div>

                             <div className="flex justify-between items-start mb-10 relative z-10">
                                <div>
                                    <h2 className="text-3xl font-black text-white font-display tracking-tight uppercase">Establish Cycle</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Defining Performance Timeline</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 transition-colors">
                                    <X size={20} />
                                </button>
                             </div>

                             <form onSubmit={handleCreate} className="space-y-8 relative z-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cycle Designation</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. FY26 ANNUAL ASSESSMENT"
                                        className="nx-input"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cycle Type</label>
                                        <select
                                            className="nx-input appearance-none"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="QUARTERLY" className="bg-slate-900">Quarterly Calibration</option>
                                            <option value="ANNUAL" className="bg-slate-900">Annual Evaluation</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3 opacity-30">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                                            Status <ShieldCheck size={12} />
                                        </label>
                                        <div className="nx-input flex items-center bg-white/5 cursor-not-allowed">
                                            DRAFT MODE
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 p-8 rounded-3xl bg-[var(--growth)]/5 border border-[var(--growth)]/10">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--growth-light)] ml-1 flex items-center gap-2">
                                            <Calendar size={12} /> Evaluation Start
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            className="nx-input !bg-transparent !border-white/10 focus:!border-[var(--growth)]"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--growth-light)] ml-1 flex items-center gap-2">
                                            <Clock size={12} /> Deadline Vector
                                        </label>
                                        <input
                                            required
                                            type="date"
                                            className="nx-input !bg-transparent !border-white/10 focus:!border-[var(--growth)]"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        className="w-full py-5 rounded-2xl bg-[var(--growth)] text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-[var(--growth)]/30 hover:scale-[1.02] transition-all active:scale-[0.98]"
                                    >
                                        Finalize & Established Cycle
                                    </button>
                                </div>
                             </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CycleManagement;
