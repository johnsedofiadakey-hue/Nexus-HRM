import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import api from '../services/api';
import { Target, Lock, Clock, AlertTriangle, BookOpen, GraduationCap, ExternalLink, Loader2, ArrowRight, ShieldCheck, TrendingUp, CheckCircle } from 'lucide-react';
import UpdateProgressModal from '../components/UpdateProgressModal'; 
import { getStoredUser } from '../utils/session';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface KpiItem {
  id: string;
  category: string;
  description: string;
  name?: string;
  weight: number;
  targetValue: number;
  actualValue: number;
  score: number | null;
}

interface KpiSheet {
  id: string;
  title: string;
  month: number;
  year: number;
  status: string;
  totalScore: number | null;
  isLocked: boolean;
  items: KpiItem[];
}

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const normalizeSheet = (sheet: any): KpiSheet => ({
  id: String(sheet?.id || ''),
  title: String(sheet?.title || 'Mission Sheet'),
  month: Number(sheet?.month || new Date().getMonth() + 1),
  year: Number(sheet?.year || new Date().getFullYear()),
  status: String(sheet?.status || 'DRAFT'),
  totalScore: typeof sheet?.totalScore === 'number' ? sheet.totalScore : null,
  isLocked: Boolean(sheet?.isLocked),
  items: toArray<KpiItem>(sheet?.items).map((item: any) => ({
    id: String(item?.id || ''),
    category: String(item?.category || 'General'),
    description: String(item?.description || item?.name || 'Strategic goal'),
    name: item?.name ? String(item.name) : undefined,
    weight: Number(item?.weight || 0),
    targetValue: Number(item?.targetValue || 0),
    actualValue: Number(item?.actualValue || 0),
    score: typeof item?.score === 'number' ? item.score : null,
  })),
});

const Performance = () => {
  const [sheets, setSheets] = useState<KpiSheet[]>([]);
  const [deptKpis, setDeptKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<KpiSheet | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const u = getStoredUser();
      
      const [perfRes, trainingRes, kpiRes] = await Promise.all([
        api.get('/kpi/my-sheets'),
        api.get('/training'),
        u.departmentId ? api.get('/kpi/department', { params: { departmentId: u.departmentId } }) : Promise.resolve({ data: { data: [] } })
      ]);

      // Performance Data
      const rawSheets = Array.isArray(perfRes.data) ? perfRes.data : Array.isArray(perfRes.data?.data) ? perfRes.data.data : [];
      const sheetData = rawSheets.map(normalizeSheet);
      setSheets(sheetData);
      if (sheetData.length > 0 && !selectedSheet) setSelectedSheet(sheetData[0]);

      // Training Data
      setPrograms(Array.isArray(trainingRes.data) ? trainingRes.data : []);

      // Strategic Data
      setDeptKpis(Array.isArray(kpiRes.data?.data) ? kpiRes.data.data : []);

    } catch (error) {
      console.error('[Performance] fetchData error:', error);
      toast.error('Failed to sync mission data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Target size={32} className="animate-spin text-primary-light" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Aligning with strategic mandantes...</p>
    </div>
  );

  return (
    <div className="space-y-10 page-enter min-h-screen pb-20">
      {/* Strategic Intent Architecture */}
      <AnimatePresence>
        {deptKpis.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck size={120} className="text-emerald-500" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">Departmental Strategic Intent</h2>
                  <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mt-0.5">Mandate from MD / Top Leadership</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {deptKpis.map((kpi: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-emerald-500/30 transition-all">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1">{kpi.title}</p>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">{kpi.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Mission History */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Mission History</h2>
             <Clock size={16} className="text-slate-600" />
          </div>
          
          <div className="space-y-3">
             {sheets.length === 0 ? (
               <div className="p-10 text-center glass rounded-3xl border-dashed border-white/10 opacity-30">
                  <Target size={32} className="mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No mission assigned</p>
               </div>
             ) : (
               sheets.map((sheet) => (
                 <motion.button
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   key={sheet.id}
                   onClick={() => setSelectedSheet(sheet)}
                   className={cn(
                     "w-full p-5 rounded-2xl text-left transition-all duration-300 border",
                     selectedSheet?.id === sheet.id
                       ? "bg-primary/20 border-primary/40 shadow-xl shadow-primary/10"
                       : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                   )}
                 >
                   <div className="flex justify-between items-center mb-3">
                     <span className={cn(
                       "text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border",
                       sheet.status === 'LOCKED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-primary/10 text-primary-light border-primary/20"
                     )}>
                       {sheet.status}
                     </span>
                     {sheet.isLocked && <Lock size={12} className="text-slate-500" />}
                   </div>
                   <h3 className="text-sm font-bold text-white mb-1">{sheet.title}</h3>
                   <div className="flex justify-between items-center text-[10px] mt-2">
                     <span className="font-black uppercase tracking-widest text-slate-500">
                       {new Date(0, sheet.month - 1).toLocaleString('default', { month: 'short' })} {sheet.year}
                     </span>
                     <span className="font-black text-primary-light">
                       {sheet.totalScore?.toFixed(1) || 0}%
                     </span>
                   </div>
                 </motion.button>
               ))
             )}
          </div>
        </div>

        {/* Right Column: Mission Details */}
        <div className="flex-1 space-y-8">
           {selectedSheet ? (
             <>
               <div className="glass p-10 rounded-[2.5rem] border-white/[0.05] relative overflow-hidden bg-[#0d1225]/40 backdrop-blur-3xl">
                 <div className="absolute top-0 right-0 p-10 opacity-5">
                    <TrendingUp size={160} className="text-primary" />
                 </div>

                 <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-8 border-b border-white/[0.05] pb-10 mb-10">
                   <div>
                     <h1 className="text-4xl font-black text-white font-display tracking-tight underline decoration-primary decoration-4 underline-offset-8 decoration-white/10">{selectedSheet.title}</h1>
                     <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mt-6 flex items-center gap-2">
                       <Target size={14} className="text-primary-light" />
                       Execution window: {new Date(0, selectedSheet.month - 1).toLocaleString('default', { month: 'long' })} {selectedSheet.year}
                     </p>
                   </div>
                   <div className="text-right">
                     <div className="text-6xl font-black text-primary-light tracking-tighter">
                       {selectedSheet.totalScore?.toFixed(1) || 0}<span className="text-2xl text-slate-600">%</span>
                     </div>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Execution Score</p>
                   </div>
                 </div>

                 <div className="space-y-6">
                    {selectedSheet.items.map((item, idx) => (
                      <div key={item.id || idx} className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.03] hover:border-primary/20 transition-all group">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                          <div className="flex-1">
                            <span className="text-[9px] font-black text-primary-light uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                              {item.category}
                            </span>
                            <h4 className="text-lg font-bold text-white mt-4 leading-tight">{item.description}</h4>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weight</p>
                             <p className="text-xl font-black text-white">{item.weight}%</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                             <span className="text-slate-500">Progress Vector</span>
                             <span className="text-primary-light">
                               {item.actualValue} <span className="opacity-30">/</span> {item.targetValue}
                             </span>
                           </div>
                           <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min((item.actualValue / (item.targetValue || 1)) * 100, 100)}%` }}
                               className="h-full bg-gradient-to-r from-primary via-primary-light to-accent rounded-full"
                             />
                           </div>
                        </div>
                      </div>
                    ))}
                 </div>

                 <div className="mt-10 pt-10 border-t border-white/[0.05] flex flex-col sm:flex-row sm:justify-end gap-4">
                    {selectedSheet.isLocked ? (
                      <div className="px-6 py-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> 
                        {selectedSheet.status === 'LOCKED' ? 'Strategic Mission Approved' : 'Mission is locked by HQ policy'}
                      </div>
                    ) : selectedSheet.status === 'PENDING_APPROVAL' ? (
                      <div className="px-6 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <AlertTriangle size={16} /> Deploying for Review
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => setIsEditOpen(true)}
                          className="px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all font-display"
                        >
                          Update Execution
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm("Submit this mission vector for review?")) {
                              try {
                                await api.patch('/kpi/update-progress', { sheetId: selectedSheet.id, items: [], submit: true });
                                fetchData();
                              } catch (err) { console.error(err); }
                            }
                          }}
                          className="px-8 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-primary-light transition-all shadow-xl shadow-primary/20 font-display"
                        >
                          Submit for HQ
                        </button>
                      </>
                    )}
                 </div>
               </div>

               {/* Growth Path Integration */}
               {selectedSheet.items.some(i => ['Development', 'Training', 'Learning', 'Growth'].includes(i.category)) && (
                 <div className="glass p-10 rounded-[2.5rem] bg-[#0f172a] border-white/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                      <GraduationCap size={200} className="text-white" />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
                          <BookOpen size={24} className="text-primary-light" />
                       </div>
                       <div>
                         <h3 className="text-lg font-black text-white uppercase tracking-[0.25em]">Growth Trajectory</h3>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Automated Skill Acquisition</p>
                       </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-8 max-w-xl leading-relaxed">
                       Your mission includes <span className="text-primary-light font-bold">Growth Objectives</span>. 
                       Completing matching programs from the Training Catalog will automatically increment your mission progress.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                       {programs.slice(0, 4).map((p) => (
                         <button 
                           key={p.id}
                           onClick={() => window.location.href = '/training'}
                           className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-primary/30 transition-all text-left group/card"
                         >
                           <div className="flex justify-between items-start mb-3">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{p.title}</h4>
                              <ExternalLink size={14} className="text-slate-600 group-hover/card:text-primary-light" />
                           </div>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.provider || 'Nexus Academy'}</p>
                         </button>
                       ))}
                    </div>

                    <button 
                      onClick={() => window.location.href = '/training'}
                      className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-primary-light hover:text-white transition-all group"
                    >
                      Browse All Capabilities <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                 </div>
               )}
             </>
           ) : (
             <div className="h-[60vh] flex flex-col items-center justify-center text-center opacity-30 grayscale">
                <Target size={80} className="mb-6" />
                <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white">No Mission Selected</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Select a vector from the history to view mission parameters</p>
             </div>
           )}
        </div>
      </div>

      {isEditOpen && selectedSheet && (
        <UpdateProgressModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          sheet={selectedSheet}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Performance;
