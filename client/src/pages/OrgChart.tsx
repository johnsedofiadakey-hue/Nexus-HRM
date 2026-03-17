import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, ChevronRight, ChevronDown, Layout, List, ShieldCheck } from 'lucide-react';
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

const Node = ({ node, isFirst = false, isLast = false, isOnly = false, layoutType = 'horizontal' }: { 
  node: OrgNode; 
  isFirst?: boolean; 
  isLast?: boolean; 
  isOnly?: boolean;
  layoutType?: 'horizontal' | 'side-stacked';
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isMD = node.role === 'MD';

  // Professional logic for Side-Stacking (Fishbone Transition)
  // Roots (Executive/MD) always horizontal.
  // Managers stay horizontal if they have reports.
  // Staff level (no reports) always side-stacks under their manager to save space.
  const shouldSideStack = hasChildren && (
    (node.role !== 'MD' && node.role !== 'DIRECTOR') || 
    node.children.every(c => !c.children || c.children.length === 0)
  );

  return (
    <div className={cn(
      "flex relative",
      layoutType === 'horizontal' ? "flex-col items-center" : "flex-row items-center w-full"
    )}>
      {/* Connector lines FOR HORIZONTAL PARENT */}
      {layoutType === 'horizontal' && (
        <div className="relative w-full flex flex-col items-center">
          {/* Top connector for non-root nodes */}
          {!isMD && (
            <div className="relative w-full h-10 flex justify-center">
              {/* Horizontal line (Spans between siblings) */}
              {!isOnly && (
                <div className={cn(
                  "absolute top-0 h-[2px] bg-slate-800",
                  isFirst ? "left-1/2 w-1/2" : isLast ? "right-1/2 w-1/2" : "w-full"
                )} />
              )}
              {/* Vertical line to this specific card */}
              <div className="w-[2px] h-full bg-slate-800" />
            </div>
          )}
        </div>
      )}

      {/* Connector lines FOR SIDE-STACKED PARENT */}
      {layoutType === 'side-stacked' && (
        <div className="flex items-center h-full">
           {/* Vertical "rail" line */}
           <div className="w-8 h-full relative">
              <div className="absolute left-0 top-0 w-[2px] h-full bg-slate-800" />
              {/* Horizontal branch to this card */}
              <div className="absolute left-0 top-1/2 -translate-y-[1px] w-full h-[2px] bg-slate-800" />
              {/* Cap the rail for the very last item */}
              {isLast && <div className="absolute left-0 top-1/2 w-[2px] h-1/2 bg-slate-950" />}
           </div>
        </div>
      )}

      {/* Member Card */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative p-4 rounded-2xl border-2 transition-all cursor-default bg-slate-900 shadow-2xl group z-10",
          isMD ? 'border-amber-500/50 w-64 ring-8 ring-amber-500/5' : 'border-slate-800 w-52',
          "hover:border-primary/50 hover:shadow-primary/20",
          layoutType === 'horizontal' ? (isMD ? "mx-10" : "mx-8") : "" 
        )}
      >
        {isMD && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-950 flex items-center gap-1">
            <ShieldCheck size={10} /> Executive
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div className="relative">
            {node.avatar ? (
              <img src={node.avatar} alt={node.name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <UserIcon className="text-slate-500" size={16} />
              </div>
            )}
            {isMD && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900 shadow-lg" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm truncate">{node.name}</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[9px] text-slate-500 truncate uppercase font-black tracking-lighter">{node.title}</p>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <p className="text-[8px] text-slate-600 font-bold uppercase">{node.role}</p>
            </div>
          </div>
          {hasChildren && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0 z-20 relative">
              {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
          )}
        </div>
        
        {node.department && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <span className="text-[8px] font-black uppercase tracking-widest text-primary-light opacity-50">{node.department}</span>
          </div>
        )}
      </motion.div>

      {/* Children Section */}
      {hasChildren && isExpanded && (
        <div className={cn(
          "flex flex-col items-center transition-all",
          shouldSideStack ? "pl-4" : ""
        )}>
          {/* Vertical path directly below parent */}
          <div className={cn("w-[2px] bg-slate-800", shouldSideStack ? "h-6 ml-[28px]" : "h-10")} />
          
          <div className={cn(
            "flex flex-col",
            shouldSideStack ? "ml-[28px]" : ""
          )}>
            {/* 1. Management/Structured Group (Horizontal) */}
            {!shouldSideStack && (
              <div className="flex flex-row items-start px-20">
                {node.children
                  .filter(c => c.children.length > 0) // Those who are managers themselves
                  .map((child, idx, arr) => (
                    <Node 
                      key={child.id} 
                      node={child} 
                      isFirst={idx === 0}
                      isLast={idx === arr.length - 1}
                      isOnly={arr.length === 1}
                      layoutType="horizontal"
                    />
                  ))}
              </div>
            )}

            {/* 2. Direct Staff Group (Side-Stacked) */}
            {/* If we aren't already side-stacking the whole group, we handle leaf-node staff here */}
            {!shouldSideStack && node.children.some(c => c.children.length === 0) && (
              <div className="mt-8 flex flex-col items-center">
                 {/* Connection to the "staff" silo */}
                 <div className="w-[2px] h-8 bg-slate-800" />
                 <div className="flex flex-col ml-[28px]">
                    {node.children
                      .filter(c => c.children.length === 0) // Leaf nodes
                      .map((child, idx, arr) => (
                        <Node 
                          key={child.id} 
                          node={child} 
                          isFirst={false}
                          isLast={idx === arr.length - 1}
                          isOnly={false}
                          layoutType="side-stacked"
                        />
                      ))}
                 </div>
              </div>
            )}

            {/* 3. Normal Side-Stacked (if transition has occurred) */}
            {shouldSideStack && node.children.map((child, idx) => (
              <Node 
                key={child.id} 
                node={child} 
                isFirst={idx === 0}
                isLast={idx === node.children.length - 1}
                isOnly={node.children.length === 1}
                layoutType="side-stacked"
              />
            ))}
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
