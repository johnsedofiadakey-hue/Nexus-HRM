import React, { useEffect, useState } from 'react';
import { Shield, Search, ChevronLeft, ChevronRight, Loader2, Activity, Terminal } from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const actionColor: Record<string, string> = {
  LEAVE_APPLIED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  LEAVE_APPROVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  LEAVE_REJECTED: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  KPI_ASSIGNED: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  KPI_SUBMITTED: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  KPI_REVIEW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  APPRAISAL_SELF_SUBMIT: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  APPRAISAL_MANAGER_REVIEW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  CREATE_ASSET: 'text-slate-400 bg-white/5 border-white/10',
  ASSIGN_ASSET: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const AuditLogs = () => {
  const [data, setData] = useState<any>({ logs: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit/logs?page=${page}&limit=50`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const logs = data.logs?.filter((l: any) =>
    `${l.action} ${l.entity} ${l.user?.fullName} ${l.ipAddress}`.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 page-enter min-h-[80vh] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight flex items-center gap-3">
             <Terminal size={32} className="text-emerald-500" /> Audit Logs
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">
            {data.total.toLocaleString()} records found
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-400/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <Activity size={16} className="text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Live</span>
        </div>
      </div>

      <div className="glass overflow-hidden flex flex-col flex-grow border-white/[0.05]">
        <div className="p-6 md:p-8 border-b border-white/[0.05] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
             <Shield size={14} className="text-slate-500" /> All Events
          </h2>
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50" />
            <input 
               type="text" 
               className="nx-input pl-10 py-3 text-xs w-full bg-black/40 border-white/5 font-bold focus:border-emerald-500/50 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all" 
               placeholder="Search logs..." 
               value={search} 
               onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={32} className="animate-spin text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/70">Loading...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar flex-grow bg-[#0a0f1e]/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-white/[0.05]">
                    {['Timestamp', 'User', 'Action', 'Target', 'Details', 'IP Address'].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {logs.map((log: any, idx: number) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                      key={log.id} 
                      className="hover:bg-white/[0.02] transition-colors font-mono text-[11px]"
                    >
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                           year: 'numeric', month: '2-digit', day: '2-digit',
                           hour: '2-digit', minute: '2-digit', second: '2-digit',
                           hour12: false
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-300">{log.user.fullName}</span>
                            <span className="text-[9px] text-slate-600 tracking-wider mix-blend-screen">{log.user.email}</span>
                          </div>
                        ) : <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">SYSTEM</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={cn("px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border", actionColor[log.action] || 'text-slate-400 bg-white/5 border-white/10')}>
                           {log.action?.replace(/_/g, ' ')}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-indigo-400 font-bold tracking-wider">{log.entity}</td>
                      <td className="px-6 py-4 max-w-[250px] truncate">
                        {log.details && (
                          <span className="text-slate-400 bg-black/60 px-2.5 py-1.5 rounded border border-white/5 whitespace-nowrap">
                            {typeof log.details === 'object' ? JSON.stringify(log.details).slice(0, 50) + '...' : String(log.details).slice(0, 50)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 tracking-widest">[{log.ipAddress || '0.0.0.0'}]</td>
                    </motion.tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-20 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/40 border-none">No logs found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {data.pages > 1 && (
              <div className="px-8 py-5 border-t border-white/[0.05] bg-black/40 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60">
                  Page {page} of {data.pages}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-10 h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 disabled:opacity-30 disabled:hover:bg-white/[0.02] flex items-center justify-center text-emerald-400 transition-all">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                    className="w-10 h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 disabled:opacity-30 disabled:hover:bg-white/[0.02] flex items-center justify-center text-emerald-400 transition-all">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
