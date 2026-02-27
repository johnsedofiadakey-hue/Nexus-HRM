import React, { useState, useEffect } from 'react';
import { Wallet, DollarSign, Receipt, Plus, Loader2, Search, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const FinanceHub = () => {
    const [activeTab, setActiveTab] = useState<'loans' | 'expenses'>('loans');
    const [viewScope, setViewScope] = useState<'my' | 'all'>('my');

    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [error, setError] = useState('');

    const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
    const isAdmin = ['HR_ADMIN', 'MD', 'SUPERVISOR'].includes(user.role);

    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoint = `/${activeTab}${viewScope === 'all' && isAdmin ? '' : '/me'}`;
            const res = await api.get('/finance' + endpoint);
            setItems(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, viewScope]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading('submit');
        setError('');
        try {
            const payload = { ...formData, employeeId: user.id };
            await api.post(`/finance/${activeTab}`, payload);
            setShowModal(false);
            setFormData({});
            fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Submission failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleStatusUpdate = async (id: string, action: 'approve' | 'reject') => {
        setActionLoading(id);
        try {
            await api.post(`/finance/${activeTab}/${id}/${action}`);
            fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-8 page-enter min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white font-display tracking-tight flex items-center gap-3">
                        <Wallet size={36} className="text-blue-500" /> Finance Hub
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Manage Salary Advances, Loans, and Expense Claims
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { setFormData({}); setShowModal(true); }}
                    className="bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/20 font-black uppercase tracking-[0.2em] text-[10px]"
                >
                    <Plus size={16} /> Request {activeTab === 'loans' ? 'Advance' : 'Expense'}
                </motion.button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
                    <button onClick={() => setActiveTab('loans')} className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", activeTab === 'loans' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" : "text-slate-500 hover:text-white hover:bg-white/5")}>Loans & Advances</button>
                    <button onClick={() => setActiveTab('expenses')} className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", activeTab === 'expenses' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" : "text-slate-500 hover:text-white hover:bg-white/5")}>Expense Claims</button>
                </div>

                {isAdmin && (
                    <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
                        <button onClick={() => setViewScope('my')} className={cn("px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all", viewScope === 'my' ? "bg-white/10 text-white" : "text-slate-500 hover:text-white hover:bg-white/5")}>My Requests</button>
                        <button onClick={() => setViewScope('all')} className={cn("px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all", viewScope === 'all' ? "bg-white/10 text-white" : "text-slate-500 hover:text-white hover:bg-white/5")}>Manage All</button>
                    </div>
                )}
            </div>

            <div className="glass rounded-[2rem] border border-white/[0.05] overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto custom-scrollbar flex-grow p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 size={32} className="text-blue-500 animate-spin" /></div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Receipt size={48} className="mb-4 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">No records found.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.01] border-b border-white/[0.05]">
                                    {viewScope === 'all' && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Employee</th>}
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Amount</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Reason/Title</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Status</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Date</th>
                                    {viewScope === 'all' && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        {viewScope === 'all' && (
                                            <td className="px-6 py-4 font-bold text-sm text-white">{item.employee?.fullName || '—'}</td>
                                        )}
                                        <td className="px-6 py-4 text-[12px] font-mono tracking-widest text-emerald-400">
                                            {activeTab === 'loans' ? item.principalAmount : item.amount} {activeTab === 'expenses' ? item.currency : ''}
                                            {activeTab === 'loans' && <span className="block text-[8px] text-slate-500 mt-1">/{item.monthsDuration} mos</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-300">
                                            {activeTab === 'loans' ? item.purpose || item.type : item.title}
                                            {activeTab === 'expenses' && <span className="block text-[9px] font-mono tracking-widest text-slate-500 mt-1">{item.category}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border",
                                                item.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    item.status === 'REJECTED' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                                        item.status === 'PAID' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                            "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                            )}>{item.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500">
                                            {new Date(item.requestedAt || item.submittedAt).toLocaleDateString()}
                                        </td>
                                        {viewScope === 'all' && (
                                            <td className="px-6 py-4 text-right">
                                                {item.status === 'PENDING' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleStatusUpdate(item.id, 'approve')} disabled={actionLoading === item.id} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"><CheckCircle size={16} /></button>
                                                        <button onClick={() => handleStatusUpdate(item.id, 'reject')} disabled={actionLoading === item.id} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><XCircle size={16} /></button>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Creation Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass w-full max-w-lg bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl z-10">
                            <div className="p-6 border-b border-white/[0.05] bg-black/40">
                                <h2 className="text-xl font-black text-white uppercase tracking-wider">New {activeTab === 'loans' ? 'Advance/Loan' : 'Expense Claim'}</h2>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {error && <div className="p-4 rounded-xl bg-rose-500/10 text-rose-400 text-[10px] font-black tracking-widest uppercase">{error}</div>}

                                {activeTab === 'loans' ? (
                                    <>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Amount (GHS)</label>
                                            <input type="number" required className="nx-input p-3 w-full text-sm" value={formData.principalAmount || ''} onChange={e => setFormData({ ...formData, principalAmount: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Duration (Months)</label>
                                            <input type="number" required max={24} className="nx-input p-3 w-full text-sm" value={formData.monthsDuration || ''} onChange={e => setFormData({ ...formData, monthsDuration: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Purpose</label>
                                            <textarea required className="nx-input p-3 w-full text-sm" value={formData.purpose || ''} onChange={e => setFormData({ ...formData, purpose: e.target.value })} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Amount</label>
                                            <input type="number" required className="nx-input p-3 w-full text-sm" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Title/Description</label>
                                            <input type="text" required className="nx-input p-3 w-full text-sm" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Category</label>
                                            <select required className="nx-input p-3 w-full text-sm appearance-none" value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                                <option value="">Select...</option>
                                                <option value="TRAVEL">Travel</option>
                                                <option value="SUPPLIES">Supplies</option>
                                                <option value="MEALS">Meals</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                                    <button type="submit" disabled={!!actionLoading} className="flex-1 py-3 bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/30 transition-colors">Submit Request</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FinanceHub;
