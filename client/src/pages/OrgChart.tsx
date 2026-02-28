import React, { useEffect, useState } from 'react';
import { Users, ChevronDown, ChevronRight, Loader2, Download, Network, Building2 } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface OrgNode {
  id: string; name: string; title: string; role: string;
  department: string; avatar?: string; children: OrgNode[];
}

const getRoleColor = (role: string) => {
  const map: Record<string, string> = {
    MD: 'from-amber-500/80 to-amber-500 text-amber-500 border-amber-500/30 bg-amber-500/10',
    DIRECTOR: 'from-blue-500/80 to-blue-500 text-blue-400 border-blue-500/30 bg-blue-500/10',
    MANAGER: 'from-purple-500/80 to-purple-500 text-purple-400 border-purple-500/30 bg-purple-500/10',
    MID_MANAGER: 'from-cyan-500/80 to-cyan-500 text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    STAFF: 'from-emerald-500/80 to-emerald-500 text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    CASUAL: 'from-slate-400/80 to-slate-400 text-slate-400 border-slate-400/30 bg-slate-400/10',
    HR_ADMIN: 'from-primary/80 to-primary text-primary-light border-primary/30 bg-primary/10'
  };
  return map[role] || 'from-slate-500/80 to-slate-500 text-slate-300 border-slate-500/30 bg-slate-500/10';
};

const getRoleGradientOnly = (role: string) => {
  const map: Record<string, string> = {
    MD: 'from-amber-500/80 to-amber-500',
    DIRECTOR: 'from-blue-500/80 to-blue-500',
    MANAGER: 'from-purple-500/80 to-purple-500',
    MID_MANAGER: 'from-cyan-500/80 to-cyan-500',
    STAFF: 'from-emerald-500/80 to-emerald-500',
    CASUAL: 'from-slate-400/80 to-slate-400',
    HR_ADMIN: 'from-primary/80 to-primary'
  };
  return map[role] || 'from-slate-500/80 to-slate-500';
};

const NodeCard = ({ node, depth = 0 }: { node: OrgNode; depth?: number }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const colors = getRoleColor(node.role);
  const gradient = getRoleGradientOnly(node.role);
  const initials = node.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center">
      {/* Node */}
      <div className="relative z-10">
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "glass p-5 w-56 text-center transition-all group relative overflow-hidden",
            hasChildren ? "cursor-pointer hover:bg-white/[0.05]" : "",
            expanded && hasChildren ? "border-primary/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]" : "border-white/[0.05]"
          )}
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          {/* Avatar */}
          <div className={cn("w-14 h-14 rounded-[1rem] flex items-center justify-center text-lg font-black text-white mx-auto mb-4 tracking-tighter bg-gradient-to-br shadow-lg", gradient)}>
            {node.avatar ? <img src={node.avatar} alt="" className="w-full h-full rounded-[1rem] object-cover" /> : initials}
          </div>

          <p className="font-display font-black text-white text-[15px] leading-tight mb-1 truncate tracking-tight">{node.name}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate mb-4">{node.title}</p>

          <div className="flex flex-col items-center gap-2">
            <span className={cn("px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border", colors.replace(/from-\S+ to-\S+ /, ''))}>
              {node.role.replace('_', ' ')}
            </span>
            {node.department && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 truncate w-full"><Building2 size={10} className="inline mr-1" />{node.department}</p>
            )}
          </div>

          {hasChildren && (
            <div className="absolute bottom-2 right-2 text-primary-light/50 group-hover:text-primary-light transition-colors">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
        </motion.div>

        {/* Connection line down */}
        {hasChildren && expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: '24px' }} className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-px bg-white/10" />
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && expanded && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0, overflow: 'hidden' }}
            className="relative mt-6"
          >
            {/* Horizontal bar connecting children */}
            {node.children.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-px bg-white/10" style={{ top: '-1px' }} />
            )}
            <div className="flex gap-8 items-start pt-6 relative">
              {node.children.map((child, i) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Vertical line up to horizontal bar */}
                  <div className="absolute -top-6 left-1/2 w-px h-6 bg-white/10" />
                  <NodeCard node={child} depth={depth + 1} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrgChart = () => {
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tree' | 'list'>('tree');
  const [flat, setFlat] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/orgchart');
        setTree(res.data.tree);
        setFlat(res.data.flat);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const exportCSV = () => {
    const token = localStorage.getItem('nexus_token');
    window.open(`/api/export/employees/csv`, '_blank');
  };

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Org Chart</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <Network size={14} className="text-primary-light" />
            Company structure and employee distribution ({flat.length} Employees)
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex p-1 rounded-2xl gap-1 bg-white/[0.02] border border-white/5 shadow-inner hidden sm:flex">
            <button onClick={() => setView('tree')} className={cn("px-6 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", view === 'tree' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white")}>
              Tree View
            </button>
            <button onClick={() => setView('list')} className={cn("px-6 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", view === 'list' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white")}>
              List View
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={exportCSV}
            className="glass px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white border-white/[0.05] flex items-center gap-2"
          >
            <Download size={14} /> Export CSV
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 size={32} className="animate-spin text-primary-light" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading org chart...</p>
        </div>
      ) : view === 'tree' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-12 overflow-x-auto border-white/[0.05] bg-[#0a0f1e]/40 shadow-2xl rounded-[3rem] min-h-[600px] flex items-center justify-center">
          <div className="inline-flex flex-col items-center min-w-max pb-12">
            {tree.map(root => <NodeCard key={root.id} node={root} depth={0} />)}
            {tree.length === 0 && (
              <div className="p-20 text-center border-white/[0.05] flex flex-col items-center">
                <Network size={64} className="mb-6 opacity-10 text-slate-300" />
                <h2 className="text-xl font-bold text-slate-400 mb-2 font-display uppercase tracking-tight">No Org Chart</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 max-w-sm mx-auto leading-relaxed">No organizational structure found. Add managers to employees to build the tree.</p>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden border-white/[0.05]">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="nx-table">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Personnel Node</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Designation</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Sector</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Access Level</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Upline Monitor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {flat.map((emp: any) => {
                  const supervisor = flat.find((e: any) => e.id === emp.supervisorId);
                  const colors = getRoleColor(emp.role);
                  const gradient = getRoleGradientOnly(emp.role);
                  return (
                    <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0 bg-gradient-to-br shadow-lg", gradient)}>
                            {emp.fullName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{emp.fullName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-slate-400">{emp.jobTitle}</td>
                      <td className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">{emp.departmentObj?.name || 'UNASSIGNED'}</td>
                      <td className="px-6 py-5">
                        <span className={cn("px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border", colors.replace(/from-\S+ to-\S+ /, ''))}>{emp.role.replace('_', ' ')}</span>
                      </td>
                      <td className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary-light transition-colors">
                        {supervisor?.fullName || 'NO MANAGER'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OrgChart;
