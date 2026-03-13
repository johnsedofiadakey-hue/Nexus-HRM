import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, User as UserIcon, Building, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="flex flex-col items-center">
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer bg-slate-900 shadow-xl
          ${node.role === 'MD' ? 'border-amber-500/50 w-64' : 'border-slate-800 w-56'}
          hover:border-blue-500/50 hover:shadow-blue-500/10`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {node.avatar ? (
              <img src={node.avatar} alt={node.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                <UserIcon className="text-slate-400" size={20} />
              </div>
            )}
            {node.role === 'MD' && (
              <div className="absolute -top-1 -right-1 bg-amber-500 p-1 rounded-full shadow-lg">
                <ShieldCheck size={12} className="text-slate-900" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-100 truncate">{node.name}</h4>
            <p className="text-xs text-slate-400 truncate">{node.title}</p>
            <div className="mt-1 flex items-center gap-1">
              <Building size={10} className="text-blue-400" />
              <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">{node.department || 'General'}</span>
            </div>
          </div>
          {hasChildren && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="ml-1 p-1 hover:bg-slate-800 rounded-md transition-colors">
              {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            </button>
          )}
        </div>
      </motion.div>

      {hasChildren && isExpanded && (
        <div className="relative pt-8 flex gap-8">
          {/* Vertical line from parent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-800" />

          {/* Horizontal connecting line */}
          {node.children.length > 1 && (
            <div className="absolute top-8 left-[calc(100%/node.children.length/2)] right-[calc(100%/node.children.length/2)] h-0.5 bg-slate-800" />
          )}

          <AnimatePresence>
            {(node.children || []).map((child, idx) => (
              <div key={child.id} className="relative">
                {/* Vertical line to child */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-slate-800" />
                <Node node={child} level={level + 1} />
              </div>
            ))}
          </AnimatePresence>
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
