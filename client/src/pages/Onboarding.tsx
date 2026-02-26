import React, { useEffect, useState } from 'react';
import { CheckSquare, CheckCircle, Clock, Circle, Loader2, ChevronDown, ChevronRight, Users, Sparkles, Rocket, ShieldCheck, Flag } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const categoryColors: Record<string, string> = {
  HR: 'text-primary-light border-primary/20 bg-primary/10',
  IT: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10',
  Admin: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
  Manager: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
  General: 'text-slate-400 border-white/10 bg-white/5'
};

const Onboarding = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const isAdmin = ['MD', 'HR_ADMIN'].includes(user.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes] = await Promise.all([api.get('/onboarding/my')]);
      setSessions(myRes.data);
      if (isAdmin) {
        const allRes = await api.get('/onboarding/all');
        setAllSessions(allRes.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplete = async (itemId: string) => {
    setCompleting(itemId);
    try {
      await api.post('/onboarding/task/complete', { itemId, notes: '' });
      fetchData();
    } catch (e) { console.error(e); }
    finally { setCompleting(null); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 size={32} className="animate-spin text-primary-light" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading onboarding tasks...</p>
    </div>
  );

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Onboarding</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <Rocket size={14} className="text-primary-light" />
            Manage your onboarding tasks
          </p>
        </div>
      </div>

      {/* My Active Flows */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 ml-2">
           <Sparkles size={18} className="text-primary-light" />
           <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">My Onboarding Tasks</h2>
        </div>

        {sessions.length === 0 && (
          <div className="glass p-20 text-center border-white/[0.05]">
            <Flag size={48} className="mx-auto mb-6 opacity-10 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-400 mb-2 font-display uppercase tracking-tight">No Active Onboarding Tasks</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 max-w-sm mx-auto leading-relaxed">You have no pending onboarding tasks at this time.</p>
          </div>
        )}

        {sessions.map((session: any, sIdx: any) => {
          const isOpen = expanded === session.id;
          const done = session.items.filter((i: any) => i.completedAt).length;
          const total = session.items.length;

          return (
            <motion.div 
               key={session.id} 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: sIdx * 0.1 }}
               className="glass overflow-hidden border-white/[0.05] bg-[#0a0f1e]/40 shadow-2xl shadow-primary/5"
            >
              <div 
                className="px-8 py-8 flex flex-col md:flex-row md:items-center gap-8 cursor-pointer group" 
                onClick={() => setExpanded(isOpen ? null : session.id)}
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg group-hover:scale-110 transition-transform">
                       <ShieldCheck className="text-primary-light" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">{session.template?.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                             "px-3 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                             session.completedAt ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          )}>
                            {session.completedAt ? 'Completed' : 'In Progress'}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Started: {new Date(session.startDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-1 w-full relative">
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${session.progress}%` }}
                          transition={{ duration: 1.5, ease: 'circOut' }}
                          className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-8 whitespace-nowrap">
                       <div className="flex flex-col items-end">
                          <span className="text-xl font-black text-primary-light font-display">{session.progress}%</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Progress</span>
                       </div>
                       <div className="flex flex-col items-end">
                          <span className="text-xl font-black text-white font-display">{done} <span className="text-slate-600">/</span> {total}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Tasks Completed</span>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center md:justify-end">
                   <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-500 group-hover:text-primary-light group-hover:bg-primary/5 transition-all">
                      {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                   </div>
                </div>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/[0.05] bg-black/20"
                  >
                    <div className="px-8 py-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {session.items.map((item: any, iIdx: any) => {
                        const isDone = !!item.completedAt;
                        const isOverdue = !isDone && item.dueDate && new Date(item.dueDate) < new Date();
                        const Theme = categoryColors[item.category] || categoryColors.General;

                        return (
                          <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: iIdx * 0.05 }}
                            className={cn(
                              "relative p-6 rounded-[2rem] border transition-all duration-500",
                              isDone ? "bg-emerald-500/[0.02] border-emerald-500/10 opacity-70" : isOverdue ? "bg-rose-500/[0.02] border-rose-500/10" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                            )}>
                            
                            <div className="flex items-start gap-5">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => !isDone && handleComplete(item.id)}
                                disabled={isDone || completing === item.id}
                                className={cn(
                                   "mt-1 flex-shrink-0 w-8 h-8 rounded-[0.75rem] border-2 flex items-center justify-center transition-all shadow-lg",
                                   isDone ? "bg-emerald-500 border-emerald-500 shadow-emerald-500/20" : "bg-transparent border-white/10 hover:border-primary text-slate-800"
                                )}
                              >
                                {completing === item.id ? (
                                  <Loader2 size={14} className="animate-spin text-white" />
                                ) : isDone ? (
                                  <CheckCircle size={16} className="text-white" />
                                ) : <Circle size={16} />}
                              </motion.button>

                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-3">
                                  <p className={cn(
                                     "font-bold text-sm tracking-tight",
                                     isDone ? "text-slate-500 line-through" : "text-white group-hover:text-primary-light"
                                  )}>{item.title}</p>
                                  <span className={cn("px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border", Theme)}>
                                    {item.category}
                                  </span>
                                  {item.isRequired && !isDone && <span className="text-[8px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg">Required</span>}
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  {item.dueDate && (
                                    <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest", isOverdue && !isDone ? "text-rose-400" : "text-slate-600")}>
                                      <Clock size={12} />
                                      Due Date: {new Date(item.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                  {isDone && (
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                                      <ShieldCheck size={12} />
                                      Completed on: {new Date(item.completedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Admin: Intelligence Registry */}
      {isAdmin && allSessions.length > 0 && (
        <div className="space-y-6 pt-10">
          <div className="flex items-center gap-3 ml-2">
             <Users size={18} className="text-primary-light" />
             <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">All Onboarding Tasks</h2>
          </div>
          <div className="glass overflow-hidden border-white/[0.05] bg-[#0a0f1e]/20">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="nx-table">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-left">Employee</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Onboarding Plan</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Progress</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Start Date</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {allSessions.map((s: any) => {
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] text-slate-500 group-hover:text-primary-light transition-colors">
                                {s.employee?.fullName?.charAt(0)}
                             </div>
                             <div>
                                <p className="font-bold text-xs text-white uppercase tracking-tight">{s.employee?.fullName}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{s.employee?.jobTitle}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">{s.template?.name}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-1.5 flex-1 max-w-[100px] bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${s.progress}%` }} />
                            </div>
                            <span className="text-[10px] font-black text-primary-light">{s.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <span className="text-[10px] font-medium text-slate-500">{new Date(s.startDate).toLocaleDateString()}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={cn(
                             "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                             s.completedAt ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          )}>
                             {s.completedAt ? 'Completed' : 'In Progress'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
