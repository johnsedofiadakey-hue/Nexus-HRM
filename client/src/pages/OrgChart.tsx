import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, ChevronRight, ChevronDown, Layout, List, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrgNode {
  id: string;
  name: string;
  title: string;
  role: string;
  rank: number;
  avatar: string | null;
  department: string | null;
  children: OrgNode[];
  matrixReports?: OrgNode[];
  reportingType?: 'SOLID' | 'DOTTED';
}

const Node = ({ node, isFirst = false, isLast = false, isOnly = false, layoutType = 'horizontal' }: { 
  node: OrgNode; 
  isFirst?: boolean; 
  isLast?: boolean; 
  isOnly?: boolean;
  layoutType?: 'horizontal' | 'side-stacked';
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isExecutive = node.rank >= 90;
  const isDirector = node.rank >= 80 && node.rank < 90;
  const isManager = node.rank >= 70 && node.rank < 80;

  // Hierarchical branching logic: MD, Directors, and Managers branch horizontally.
  // Lower ranks side-stack to save space while maintaining the visual tree depth.
  const shouldSideStack = hasChildren && (
    node.rank < 70 || 
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
          {!isExecutive && (
            <div className="relative w-full h-10 flex justify-center">
              {/* Horizontal line (Spans between siblings) */}
              {!isOnly && (
                <div className={cn(
                  "absolute top-0 h-[2px] bg-[var(--border-subtle)]",
                  isFirst ? "left-1/2 w-1/2" : isLast ? "right-1/2 w-1/2" : "w-full"
                )} />
              )}
              {/* Vertical line to this specific card */}
              <div className="w-[2px] h-full bg-[var(--border-subtle)]" />
            </div>
          )}
        </div>
      )}

      {/* Connector lines FOR SIDE-STACKED PARENT */}
      {layoutType === 'side-stacked' && (
        <div className="flex items-center h-full">
           {/* Vertical "rail" line */}
           <div className="w-8 h-full relative">
              <div className="absolute left-0 top-0 w-[2px] h-full bg-[var(--border-subtle)]" />
              {/* Horizontal branch to this card */}
              <div className="absolute left-0 top-1/2 -translate-y-[1px] w-full h-[2px] bg-[var(--border-subtle)]" />
              {/* Cap the rail for the very last item */}
              {isLast && <div className="absolute left-0 top-1/2 w-[2px] h-1/2 bg-[var(--bg-main)]" />}
           </div>
        </div>
      )}

      {/* Member Card */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative p-4 rounded-2xl border-2 transition-all cursor-default shadow-2xl group z-10",
          node.reportingType === 'DOTTED' ? "border-dashed border-[var(--accent)]/40 bg-[var(--bg-elevated)]/30" : (
            isExecutive ? 'border-[var(--warning)] w-64 ring-8 ring-[var(--warning)]/5 bg-[var(--bg-main)]' : 
            isDirector ? 'border-[var(--info)]/50 w-56 bg-[var(--bg-card)]' :
            isManager ? 'border-[var(--success)]/50 w-52 bg-[var(--bg-card)]' :
            'border-[var(--border-subtle)] w-52 bg-[var(--bg-card)]'
          ),
          "hover:border-[var(--primary)] hover:shadow-[var(--primary)]/20",
          layoutType === 'horizontal' ? (isExecutive ? "mx-10" : "mx-8") : "" 
        )}
      >
        {node.reportingType === 'DOTTED' && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--accent)] rounded-full text-[7px] font-black uppercase tracking-widest text-white flex items-center gap-1 shadow-lg">
            {t('org_chart.dotted_line', 'Dotted Line')}
          </div>
        )}
        {isExecutive && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--warning)] rounded-full text-[8px] font-black uppercase tracking-widest text-white flex items-center gap-1 shadow-lg border border-[var(--warning)]/30">
            <ShieldCheck size={10} /> {t('org_chart.executive', 'Executive Board')}
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div className="relative">
            {node.avatar ? (
              <img src={node.avatar} alt={node.name} className="w-10 h-10 rounded-lg object-cover border border-[var(--border-subtle)]" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)]">
                <UserIcon className={cn(isExecutive ? "text-[var(--warning)]" : "text-[var(--text-muted)]")} size={16} />
              </div>
            )}
            {isExecutive && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[var(--warning)] rounded-full border-2 border-[var(--bg-main)] shadow-lg" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn("font-bold text-sm truncate", isExecutive ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]")}>{node.name}</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={cn("text-[9px] truncate uppercase font-black tracking-lighter", isExecutive ? "text-[var(--warning)]" : "text-[var(--text-muted)]")}>{node.title}</p>
              <div className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
              <p className={cn("text-[8px] font-bold uppercase", isExecutive ? "text-[var(--text-muted)]/40" : "text-[var(--text-secondary)]")}>{node.role}</p>
            </div>
          </div>
          {hasChildren && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors flex-shrink-0 z-20 relative">
              {isExpanded ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : <ChevronRight size={14} className="text-[var(--text-muted)]" />}
            </button>
          )}
        </div>
        
        {node.department && (
          <div className={cn("mt-2 pt-2 border-t", isExecutive ? "border-[var(--text-primary)]/10" : "border-[var(--border-subtle)]")}>
            <span className={cn("text-[8px] font-black uppercase tracking-widest opacity-80", 
              isExecutive ? "text-[var(--warning)]" : isDirector ? "text-[var(--info)]" : isManager ? "text-[var(--success)]" : "text-[var(--primary)]"
            )}>{node.department}</span>
          </div>
        )}
      </motion.div>

      {/* Children Section */}
      {hasChildren && isExpanded && (
        <div className={cn(
          "flex flex-col items-center transition-all",
          shouldSideStack ? "pl-20" : ""
        )}>
          {/* Vertical path directly below parent */}
          <div className={cn("w-[2px] bg-[var(--border-subtle)]", shouldSideStack ? "h-12 ml-[calc(-50%+1px)]" : "h-10")} />
          
          <div className={cn(
            "flex flex-col",
            shouldSideStack ? "items-start w-full" : "items-center"
          )}>
            {/* 1. Management/Structured Group (Horizontal) */}
            {!shouldSideStack && (
              <div className="flex flex-row items-start px-20">
                {node.children
                  .filter(c => c.children.length > 0 || c.rank >= 70) // MD, Directors & Managers branch horizontally
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
            {!shouldSideStack && node.children.some(c => c.children.length === 0 && c.rank < 70) && (
              <div className="mt-8 flex flex-col items-start w-full pl-20">
                 {/* Connection to the "staff" silo */}
                 <div className="w-[2px] h-8 bg-[var(--border-subtle)] -mt-8 mb-0 ml-[calc(-50%+1px)]" />
                 <div className="flex flex-col">
                    {node.children
                      .filter(c => c.children.length === 0 && c.rank < 70) 
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
            {shouldSideStack && (
              <div className="flex flex-col">
                {node.children.map((child, idx, arr) => (
                  <Node 
                    key={child.id} 
                    node={child} 
                    isFirst={idx === 0}
                    isLast={idx === arr.length - 1}
                    isOnly={arr.length === 1}
                    layoutType="side-stacked"
                  />
                ))}
              </div>
            )}

            {/* 4. Matrix/Dotted Reports (Side-Stacked) */}
            {node.matrixReports && node.matrixReports.length > 0 && isExpanded && (
              <div className="mt-8 flex flex-col items-start w-full pl-20">
                 <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[var(--accent)] opacity-60 mb-2 ml-[calc(-50%+10px)]">{t('org_chart.matrix_reports', 'Matrix Reporting')}</div>
                 <div className="w-[2px] h-6 border-l-2 border-dashed border-[var(--accent)]/30 ml-[calc(-50%+1px)]" />
                 <div className="flex flex-col">
                    {node.matrixReports.map((child, idx, arr) => (
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
          </div>
        </div>
      )}
    </div>
  );
};

const LinearView = ({ data }: { data: OrgNode[] }) => {
  const { t } = useTranslation();
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
          node.rank >= 90 ? "bg-[var(--bg-elevated)] border-[var(--warning)]/50 shadow-xl shadow-[var(--warning)]/10" : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30"
        )}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden relative shadow-inner">
            {node.avatar ? (
              <img src={node.avatar} alt={node.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <UserIcon size={16} />
              </div>
            )}
            {node.role === 'MD' && <div className="absolute top-0 right-0 p-1 bg-[var(--primary)]" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={cn("font-bold text-sm truncate", node.rank >= 90 ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]")}>{node.name}</h4>
              <span className={cn(
                "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                node.rank >= 90 ? "bg-[var(--warning)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
              )}>
                {node.role}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-tight flex items-center gap-2">
              {node.title} 
              {node.department && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                  <span className="text-[var(--primary)] font-bold opacity-80">{node.department}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {node.children.length > 0 && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest">{t('org_chart.team_size')}</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{node.children.length}</span>
            </div>
          )}
          
          {node.children.length > 0 && (
            <button 
              onClick={() => toggleNode(node.id)}
              className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center hover:bg-[var(--primary)]/20 hover:text-[var(--primary)] transition-all"
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
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'hierarchical' | 'linear'>('hierarchical');

  const user = getStoredUser();
  const rank = getRankFromRole(user?.role);
  const isAuthorized = rank >= 85;

  useEffect(() => {
    if (!isAuthorized) {
        setLoading(false);
        return;
    }

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
  }, [isAuthorized]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
         <div className="w-12 h-12 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
         <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('org_chart.retrieving')}</p>
      </div>
    </div>
  );

  if (!isAuthorized) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-10 text-center">
        <div className="w-24 h-24 bg-[var(--error)]/10 rounded-[2rem] flex items-center justify-center text-[var(--error)] mb-8">
            <ShieldAlert size={48} />
        </div>
        <h1 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-4">Classified Access Only</h1>
        <p className="text-[var(--text-muted)] max-w-md font-medium leading-relaxed">
            The Organizational Atlas is strictly restricted to Level 85+ Strategic Leadership. 
            Unauthorized access transmissions have been logged.
        </p>
        <button 
            onClick={() => navigate('/dashboard')}
            className="mt-10 px-8 py-4 bg-[var(--primary)] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all"
        >
            Return to Command Center
        </button>
    </div>
  );

  return (
    <div className="min-h-screen page-transition bg-[var(--bg-main)]">
      {/* Header & Controls */}
      <div className="sticky top-0 z-50 nx-glass-card !rounded-none border-b border-[var(--border-subtle)] mb-10">
        <div className="max-w-7xl mx-auto px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_10px_var(--primary)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">{t('org_chart.subtitle', 'Strategic Reporting Topology')}</p>
            </div>
            <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight">The <span className="text-[var(--primary)]">Atlas</span></h1>
          </div>

          <div className="flex p-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-inner">
             <button
               onClick={() => setViewType('hierarchical')}
               className={cn(
                 "flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 viewType === 'hierarchical' ? "bg-[var(--primary)] text-white shadow-xl" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
               )}
             >
               <Layout size={14} /> {t('org_chart.hierarchical', 'Hierarchical')}
             </button>
             <button
               onClick={() => setViewType('linear')}
               className={cn(
                 "flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 viewType === 'linear' ? "bg-[var(--primary)] text-white shadow-xl" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
               )}
             >
               <List size={14} /> {t('org_chart.linear', 'Linear')}
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
                <p className="text-[var(--text-muted)] font-bold">{t('org_chart.no_data', 'No structural data available for this organization.')}</p>
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
