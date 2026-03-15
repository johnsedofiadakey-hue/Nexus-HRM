import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, ChevronRight, ChevronDown } from 'lucide-react';
import api from '../services/api';


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
  
  // Identify if children are leaf nodes (no children of their own)
  const leafChildren = node.children.filter(c => !c.children || c.children.length === 0);
  const branchChildren = node.children.filter(c => c.children && c.children.length > 0);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer bg-slate-900 shadow-xl
          ${node.role === 'MD' ? 'border-amber-500/50 w-60' : 'border-slate-800 w-52'}
          hover:border-blue-500/50 hover:shadow-blue-500/10`}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            {node.avatar ? (
              <img src={node.avatar} alt={node.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-700" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                <UserIcon className="text-slate-400" size={16} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-100 text-sm truncate">{node.name}</h4>
            <p className="text-[10px] text-slate-400 truncate uppercase tracking-tighter">{node.title}</p>
          </div>
          {hasChildren && (
            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-1 hover:bg-slate-800 rounded-md transition-colors">
              {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            </button>
          )}
        </div>
      </motion.div>

      {hasChildren && isExpanded && (
        <div className="relative pt-6 flex flex-col items-center">
          {/* Vertical line from parent */}
          <div className="w-0.5 h-6 bg-slate-800" />

          <div className="flex gap-4">
            <AnimatePresence>
              {/* Branch children rendered normally */}
              {branchChildren.map((child) => (
                <div key={child.id} className="relative pt-6 border-t border-slate-800">
                  {/* Vertical line to child */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-800" />
                  <Node node={child} level={level + 1} />
                </div>
              ))}

              {/* Leaf children rendered in a compact grid/list to save horizontal space */}
              {leafChildren.length > 0 && (
                <div className="relative pt-6 border-t border-slate-800 flex flex-col items-center">
                   {/* Vertical line to leaf group */}
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-slate-800" />
                   
                   <div className={`grid ${leafChildren.length > 3 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 p-3 bg-slate-900/50 rounded-xl border border-slate-800/50`}>
                     {leafChildren.map(leaf => (
                       <div key={leaf.id} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 w-44">
                          {leaf.avatar ? (
                            <img src={leaf.avatar} alt={leaf.name} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                              <UserIcon size={12} className="text-slate-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-200 truncate">{leaf.name}</p>
                            <p className="text-[8px] text-slate-500 truncate uppercase">{leaf.title}</p>
                          </div>
                       </div>
                     ))}
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

const OrgChart = () => {
  const [data, setData] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-8 text-slate-400">Loading Organizational Data...</div>;

  return (
    <div className="p-8 min-h-screen bg-slate-950 overflow-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Organizational Chart</h1>
        <p className="text-slate-400">Visualizing reporting lines and company hierarchy.</p>
      </div>

      <div className="flex justify-center min-w-max pb-32">
        {(data || []).map(root => (
          <Node key={root.id} node={root} />
        ))}
      </div>
    </div>
  );
};

export default OrgChart;
