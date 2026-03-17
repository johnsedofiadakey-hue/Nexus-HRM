import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, ChevronRight, ChevronDown, Layout, List, ShieldCheck, UserCheck } from 'lucide-react';
import api from '../services/api';
import { cn } from '../utils/cn';

interface OrgNode {
  id: string;
  name: string;
  title: string;
  role: string;
  avatar: string | null;
  department: string | null;
  children: OrgNode[];
}

const Node = ({ node, level = 0 }: { node: OrgNode; level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  
  const leafChildren = node.children.filter(c => !c.children || c.children.length === 0);
  const branchChildren = node.children.filter(c => c.children && c.children.length > 0);

  // MD identification for styling
  const isMD = node.role === 'MD';

  return (
    <div className="flex flex-col items-center">
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative p-4 rounded-2xl border-2 transition-all cursor-default bg-slate-900 shadow-xl group",
          isMD ? 'border-amber-500/50 w-64 ring-4 ring-amber-500/5' : 'border-slate-800 w-52',
          "hover:border-primary/50 hover:shadow-primary/10"
        )}
      >
        {isMD && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-950 flex items-center gap-1">
            <ShieldCheck size={10} /> Top Level
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div className="relative">
            {node.avatar ? (
              <img src={node.avatar} alt={node.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <UserIcon className="text-slate-500" size={16} />
              </div>
            )}
            {isMD && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900 shadow-lg" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm truncate">{node.name}</h4>
            <p className="text-[9px] text-slate-500 truncate uppercase font-black tracking-lighter">{node.title}</p>
          </div>
          {hasChildren && (
            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
              {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
          )}
        </div>
        {node.department && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{node.department}</span>
          </div>
        )}
      </motion.div>

      {hasChildren && isExpanded && (
        <div className="relative pt-8 flex flex-col items-center w-full">
          {/* Main vertical line from parent */}
          <div className="absolute top-0 left-1/2 w-[2px] h-8 bg-gradient-to-b from-slate-800 to-slate-700/50" />

          <div className="flex gap-8 justify-center items-start">
            <AnimatePresence mode="popLayout">
              {branchChildren.map((child) => (
                <div key={child.id} className="relative pt-8 flex flex-col items-center">
                  {/* Horizontal line connector */}
                  <div className="absolute top-0 w-full h-[1px] bg-slate-800" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-8 bg-slate-800" />
                  <Node node={child} level={level + 1} />
                </div>
              ))}

              {leafChildren.length > 0 && (
                <div className="relative pt-8 flex flex-col items-center">
                   {/* Horizontal line connector */}
                   <div className="absolute top-0 w-full h-[1px] bg-slate-800" />
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-8 bg-slate-800" />
                   
                   <div className={cn(
                     "p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2",
                     isMD ? "border-amber-500/10 bg-amber-500/[0.01]" : ""
                   )}>
                     {isMD && (
                       <div className="flex items-center gap-2 mb-2 px-2">
                         <UserCheck size={10} className="text-amber-500" />
                         <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/60">Direct Executive Support</span>
                       </div>
                     )}
                     <div className={cn(
                       "grid gap-2",
                       leafChildren.length > 4 ? 'grid-cols-2' : 'grid-cols-1'
                     )}>
                       {leafChildren.map(leaf => (
                         <div key={leaf.id} className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-white/5 w-44 hover:border-primary/20 transition-all">
                            {leaf.avatar ? (
                              <img src={leaf.avatar} alt={leaf.name} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                <UserIcon size={12} className="text-slate-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-200 truncate">{leaf.name}</p>
                              <p className="text-[8px] text-slate-500 truncate uppercase mt-0.5">{leaf.title}</p>
                            </div>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

const LinearView = ({ data }: { data: OrgNode[] }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const renderItem = (node: OrgNode, depth = 0) => (
    <div key={node.id} className="space-y-1">
      <div 
        className={cn(
          "flex items-center gap-4 p-4 rounded-2xl border transition-all group",
          node.role === 'MD' ? "bg-amber-500/10 border-amber-500/20 shadow-xl shadow-amber-500/5" : "bg-white/[0.02] border-white/5 hover:bg-white/5"
        )}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden relative shadow-inner">
            {node.avatar ? (
              <img src={node.avatar} alt={node.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <UserIcon size={16} />
              </div>
            )}
            {node.role === 'MD' && <div className="absolute top-0 right-0 p-1 bg-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white text-sm truncate">{node.name}</h4>
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                node.role === 'MD' ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-500 border border-white/10"
              )}>
                {node.role}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight flex items-center gap-2">
              {node.title} 
              {node.department && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-800" />
                  <span className="text-primary-light font-bold opacity-80">{node.department}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {node.children.length > 0 && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Team Size</span>
              <span className="text-sm font-bold text-white">{node.children.length}</span>
            </div>
          )}
          
          {node.children.length > 0 && (
            <button 
              onClick={() => toggleNode(node.id)}
              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary-light transition-all"
            >
              <div className={cn("transition-transform duration-300", expandedNodes.has(node.id) ? "rotate-90" : "")}>
                <ChevronRight size={18} />
              </div>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expandedNodes.has(node.id) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="py-2 space-y-1">
              {node.children.map(child => renderItem(child, depth + 1))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full px-4">
      {data.map(root => renderItem(root))}
    </div>
  );
};

const OrgChart = () => {
  const [data, setData] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'hierarchical' | 'linear'>('hierarchical');

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await api.get('/orgchart');
        setData(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Org Chart failed, using empty state:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
         <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
         <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Retrieving Hierarchy...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen page-transition">
      {/* Header & Controls */}
      <div className="sticky top-0 z-50 glass border-b border-white/5 mb-10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary-light">Live Organization</p>
            </div>
            <h1 className="text-3xl font-black text-white font-display tracking-tight">The <span className="gradient-text">Atlas</span></h1>
          </div>

          <div className="flex p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-xl">
             <button
               onClick={() => setViewType('hierarchical')}
               className={cn(
                 "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 viewType === 'hierarchical' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"
               )}
             >
               <Layout size={14} /> Hierarchical
             </button>
             <button
               onClick={() => setViewType('linear')}
               className={cn(
                 "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 viewType === 'linear' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"
               )}
             >
               <List size={14} /> Linear
             </button>
          </div>
        </div>
      </div>

      <motion.div 
        key={viewType}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="pb-32"
      >
        {viewType === 'hierarchical' ? (
          <div className="flex justify-center min-w-max px-20">
            {data.length > 0 ? (
              data.map(root => <Node key={root.id} node={root} />)
            ) : (
              <div className="text-center py-20">
                <p className="text-slate-500 font-bold">No organizational structure available</p>
              </div>
            )}
          </div>
        ) : (
          <LinearView data={data} />
        )}
      </motion.div>
    </div>
  );
};

export default OrgChart;
