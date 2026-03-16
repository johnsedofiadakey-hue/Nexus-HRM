import React from 'react';
import { Zap, Clock, ChevronRight, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const SubscriptionPage: React.FC = () => {
    return (
        <div className="space-y-10 page-enter min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white font-display tracking-tight">Subscription</h1>
                    <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-primary-light" />
                        Enterprise Organization Workspace
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Plan Card */}
                <div className="lg:col-span-2 glass p-10 rounded-[2.5rem] border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Zap size={200} className="text-white" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary-light shadow-2xl shadow-primary/20">
                                <Zap size={32} />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-light mb-1">Current Plan</h2>
                                <h3 className="text-5xl font-black text-white font-display tracking-tighter">Enterprise</h3>
                            </div>
                        </div>

                        <p className="text-slate-400 mb-10 max-w-xl text-lg leading-relaxed">
                            Full-scale HRM automation for growing enterprises. You have unlimited access to all modules including Payroll, Performance, and IT Administration.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Modules', val: 'All Active', color: 'text-emerald-400' },
                                { label: 'Status', val: 'Premium', color: 'text-primary-light' },
                                { label: 'Billing', val: 'Annual', color: 'text-slate-300' },
                                { label: 'Support', val: 'Priority 24/7', color: 'text-amber-400' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">{stat.label}</p>
                                    <p className={cn("text-xs font-black uppercase tracking-wider", stat.color)}>{stat.val}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Seat Usage */}
                <div className="glass p-10 rounded-[2.5rem] border border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-400">
                            <UserCheck size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">Seat Usage</h3>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-4xl font-black text-white font-display">42 <span className="text-lg text-slate-500 font-medium">/ 100</span></p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Active Employees</p>
                                </div>
                                <p className="text-xs font-black text-primary-light uppercase tracking-widest">42% Used</p>
                            </div>
                            <div className="h-3 w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: '42%' }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-primary to-accent" 
                                />
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                <CheckCircle2 size={14} className="text-primary" />
                                <span>Multi-regional Hosting</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                <CheckCircle2 size={14} className="text-primary" />
                                <span>Dedicated Database Instance</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                <CheckCircle2 size={14} className="text-primary" />
                                <span>Enterprise SSO Sync</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Billing History */}
            <div className="glass rounded-[2.5rem] overflow-hidden border border-white/5">
                <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-400">
                            <Clock size={18} />
                        </div>
                        <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">Recent Invoices</h3>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Download Annual Report</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.01]">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Invoice ID</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Billing Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {[
                                { id: 'INV-2026-003', date: 'Mar 01, 2026', amt: '$1,200.00', status: 'Paid' },
                                { id: 'INV-2026-002', date: 'Feb 01, 2026', amt: '$1,200.00', status: 'Paid' },
                                { id: 'INV-2026-001', date: 'Jan 01, 2026', amt: '$1,200.00', status: 'Paid' }
                            ].map((inv, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-8 py-6 text-sm font-bold text-white">{inv.id}</td>
                                    <td className="px-8 py-6 text-sm font-medium text-slate-400">{inv.date}</td>
                                    <td className="px-8 py-6 text-sm font-black text-white">{inv.amt}</td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest">{inv.status}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-500 group-hover:text-white transition-all">
                                            <ChevronRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
