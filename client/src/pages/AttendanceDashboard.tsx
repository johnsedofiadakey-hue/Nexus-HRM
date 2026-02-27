import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, LogIn, LogOut, Loader2, Calendar, MapPin, Search } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const AttendanceDashboard = () => {
    const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [search, setSearch] = useState('');

    const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
    const isAdmin = ['HR_ADMIN', 'MD', 'SUPERVISOR', 'SUPER_ADMIN'].includes(user.role);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'all' && isAdmin ? '/attendance' : '/attendance/me';
            const res = await api.get(endpoint);
            setLogs(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [activeTab]);

    const handleClockAction = async (type: 'in' | 'out') => {
        setActionLoading(true);
        try {
            if (type === 'in') {
                await api.post('/attendance/clock-in');
                alert('Clocked in successfully!');
            } else {
                await api.post('/attendance/clock-out');
                alert('Clocked out successfully!');
            }
            fetchLogs();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Failed to register time.');
        } finally {
            setActionLoading(false);
        }
    };

    const todayLog = logs.find(l =>
        new Date(l.date).toDateString() === new Date().toDateString() && l.employeeId === user.id
    );

    const hasClockedIn = !!todayLog;
    const hasClockedOut = !!todayLog?.clockOut;

    const filteredLogs = logs.filter(l =>
        l.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        l.status.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 page-enter min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white font-display tracking-tight flex items-center gap-3">
                        <Clock size={36} className="text-amber-500" /> Time & Attendance
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Track daily work hours and check-ins
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
                    {!hasClockedIn ? (
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => handleClockAction('in')}
                            disabled={actionLoading}
                            className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-3 px-8 py-4 rounded-xl shadow-xl shadow-emerald-500/20 font-black uppercase tracking-[0.2em] text-[10px]"
                        >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                            Clock In
                        </motion.button>
                    ) : !hasClockedOut ? (
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => handleClockAction('out')}
                            disabled={actionLoading}
                            className="bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-3 px-8 py-4 rounded-xl shadow-xl shadow-rose-500/20 font-black uppercase tracking-[0.2em] text-[10px]"
                        >
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                            Clock Out
                        </motion.button>
                    ) : (
                        <div className="flex items-center gap-2 px-6 py-3 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 rounded-xl">
                            <CheckCircle size={14} /> Completed for Today
                        </div>
                    )}
                </div>
            </div>

            {isAdmin && (
                <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
                    <button onClick={() => setActiveTab('my')} className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", activeTab === 'my' ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25" : "text-slate-500 hover:text-white hover:bg-white/5")}>My History</button>
                    <button onClick={() => setActiveTab('all')} className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", activeTab === 'all' ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25" : "text-slate-500 hover:text-white hover:bg-white/5")}>All Employees</button>
                </div>
            )}

            <div className="glass rounded-[2rem] border border-white/[0.05] overflow-hidden flex flex-col min-h-[600px]">
                {activeTab === 'all' && isAdmin && (
                    <div className="p-6 md:p-8 border-b border-white/[0.05] bg-black/20 flex flex-col sm:flex-row justify-between gap-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                            Directory Logs
                        </h2>
                        <div className="relative w-full max-w-sm">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input type="text" className="nx-input pl-10 py-3 text-xs w-full bg-black/40 border-white/5" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto custom-scrollbar flex-grow p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 size={32} className="text-amber-500 animate-spin" /></div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">No attendance logs found.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.01] border-b border-white/[0.05]">
                                    {activeTab === 'all' && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Employee</th>}
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Date</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Clock In</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Clock Out</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {(activeTab === 'all' ? filteredLogs : logs).map((log) => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                        {activeTab === 'all' && (
                                            <td className="px-6 py-4 font-bold text-sm text-white">{log.employee?.fullName || '—'}</td>
                                        )}
                                        <td className="px-6 py-4 text-[11px] font-mono tracking-widest text-slate-400">{new Date(log.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-[11px] font-mono tracking-widest text-emerald-400">
                                            {log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-mono tracking-widest text-rose-400">
                                            {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border",
                                                log.status === 'PRESENT' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    "bg-white/5 text-slate-400 border-white/10"
                                            )}>{log.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceDashboard;
