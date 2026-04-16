import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Layers, Zap, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { cn } from '../../utils/cn';
import { usePersistentDraft } from '../../hooks/usePersistentDraft';
import { getStoredUser } from '../../utils/session';
import { useTranslation } from 'react-i18next';

interface TargetModel {
  id: string;
  title: string;
  level: string;
  status: string;
  progress: number;
  contributionWeight?: number;
  assignee?: { fullName: string; jobTitle: string; avatarUrl?: string };
}

interface StaffModel {
  id: string;
  fullName: string;
  jobTitle: string;
}

const StrategicGoalBuilder = () => {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [deptGoals, setDeptGoals] = useState<TargetModel[]>([]);
  const [childTargets, setChildTargets] = useState<TargetModel[]>([]);
  const [employees, setEmployees] = useState<StaffModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  
  const {
    data: newGoal,
    updateDraft: setNewGoal
  } = usePersistentDraft('strategic_goal_drafts', user?.id || 'anonymous', { 
    title: '', 
    description: '', 
    level: 'DEPARTMENT' 
  });

  const [linkingTarget, setLinkingTarget] = useState<string | null>(null);
  const [cascadeForm, setCascadeForm] = useState({ staffId: '', weightRatio: 1.0 });

  useEffect(() => {
    fetchGoals();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (linkingTarget) {
      fetchChildTargets(linkingTarget);
    }
  }, [linkingTarget]);

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/targets?level=DEPARTMENT');
      setDeptGoals(data);
    } catch (err) {
      console.error('Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/users');
      setEmployees(Array.isArray(data) ? data.filter((u: any) => u.status !== 'TERMINATED') : []);
    } catch (err) {
      console.error('Failed to fetch employees');
    }
  };

  const fetchChildTargets = async (id: string) => {
    try {
      const { data } = await api.get(`/targets/strategic/${id}`);
      // The API returns a rollup object { parentId, parentTitle, totalProgress, breakdown }
      // We'll map the breakdown to TargetModel structure for the UI
      if (data?.breakdown) {
        // Need to fetch individual targets for full details if breakdown is just IDs/progress
        // But getStrategicRollup in service already provides title/progress/contributionWeight
        setChildTargets(data.breakdown);
      } else {
        setChildTargets([]);
      }
    } catch (err) {
      console.error('Failed to fetch child targets');
    }
  };

  const handleCreateGoal = async () => {
    try {
      await api.post('/targets', newGoal);
      setShowNewGoal(false);
      setNewGoal({ title: '', description: '', level: 'DEPARTMENT' });
      fetchGoals();
    } catch (err) {
      alert('Failed to create goal');
    }
  };

  const handleCascade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingTarget || !cascadeForm.staffId) return;
    
    try {
      await api.post(`/targets/${linkingTarget}/cascade`, { 
        assignments: [{ staffId: cascadeForm.staffId, weightRatio: cascadeForm.weightRatio }] 
      });
      setShowCascadeModal(false);
      setCascadeForm({ staffId: '', weightRatio: 1.0 });
      fetchChildTargets(linkingTarget);
      fetchGoals(); // Refresh parent progress
    } catch (err) {
      alert('Failed to cascade target');
    }
  };

  return (
    <div className="space-y-10 pb-20 page-transition">
      <PageHeader 
        title={t('performance.builder.title')}
        description={t('performance.builder.subtitle')}
        icon={Layers}
        variant="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Departmental Goals */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{t('performance.builder.dept_goals')}</h3>
            <button 
              onClick={() => setShowNewGoal(true)}
              className="p-2 rounded-xl bg-[var(--growth)]/10 text-[var(--growth-light)] hover:bg-[var(--growth)]/20 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {deptGoals.map((goal) => (
              <motion.div 
                key={goal.id}
                layoutId={goal.id}
                onClick={() => setLinkingTarget(goal.id)}
                className={cn(
                  "glass p-6 cursor-pointer transition-all border-2",
                  linkingTarget === goal.id ? "border-[var(--growth)] bg-[var(--growth)]/5" : "border-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-[var(--growth)]/10 text-[var(--growth-light)]">
                    <Zap size={16} />
                  </div>
                  <h4 className="font-bold text-white text-sm">{goal.title}</h4>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>{t('performance.builder.progress')}</span>
                  <span className="text-white">{Math.round(goal.progress || 0)}%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${goal.progress || 0}%` }} 
                    className="h-full bg-[var(--growth)] shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                  />
                </div>
              </motion.div>
            ))}

            {showNewGoal && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 border-[var(--growth)]/30">
                  <input 
                    autoFocus
                    placeholder={t('performance.builder.goal_placeholder')}
                    className="bg-transparent border-none text-white font-bold text-sm w-full outline-none mb-4"
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreateGoal} className="flex-1 py-2 rounded-xl bg-[var(--growth)] text-[var(--text-inverse)] text-[10px] font-black uppercase tracking-widest">{t('performance.builder.create')}</button>
                    <button onClick={() => setShowNewGoal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('performance.builder.cancel')}</button>
                  </div>
               </motion.div>
            )}
          </div>
        </div>

        {/* Right: Cascade Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {linkingTarget ? (
              <motion.div 
                key={linkingTarget}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass p-8 bg-[var(--growth)]/[0.02]">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-display font-bold text-2xl text-white">{t('performance.builder.breakdown')}</h3>
                      <p className="text-xs text-slate-500 mt-1">{t('performance.builder.breakdown_desc')}</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] text-[10px] font-black uppercase tracking-widest">
                      <TrendingUp size={12} /> {t('performance.builder.alignment')}
                    </div>
                  </div>

                  {!showCascadeModal ? (
                    <div 
                      onClick={() => setShowCascadeModal(true)}
                      className="p-10 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center group hover:border-[var(--growth)]/30 transition-all cursor-pointer"
                    >
                      <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[var(--growth)]/10 transition-all">
                        <Plus size={32} className="text-slate-600 group-hover:text-[var(--growth-light)]" />
                      </div>
                      <h4 className="font-bold text-white mb-2">{t('performance.builder.new_objective')}</h4>
                      <p className="text-xs text-slate-500 max-w-[200px]">{t('performance.builder.assign_desc')}</p>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-10 border-2 border-[var(--growth)]/30 bg-[var(--growth)]/5 rounded-[2rem]">
                       <form onSubmit={handleCascade} className="space-y-6 max-w-md mx-auto">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('onboarding.manager.select_employee')}</label>
                             <select 
                                required
                                value={cascadeForm.staffId}
                                onChange={e => setCascadeForm({...cascadeForm, staffId: e.target.value})}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
                             >
                                <option value="">{t('onboarding.manager.select_employee')}...</option>
                                {employees.map(emp => (
                                   <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.jobTitle})</option>
                                ))}
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('performance.builder.contribution', { percent: '' })} (Scale: 0.1 - 2.0)</label>
                             <input 
                                type="number" step="0.1" min="0.1" max="5.0"
                                value={cascadeForm.weightRatio}
                                onChange={e => setCascadeForm({...cascadeForm, weightRatio: parseFloat(e.target.value)})}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold"
                             />
                          </div>
                          <div className="flex gap-3 pt-4">
                             <button type="submit" className="flex-1 py-3 rounded-xl bg-[var(--growth)] text-[var(--text-inverse)] text-[10px] font-black uppercase tracking-[0.2em]">{t('performance.builder.create')}</button>
                             <button type="button" onClick={() => setShowCascadeModal(false)} className="px-6 py-3 rounded-xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{t('performance.builder.cancel')}</button>
                          </div>
                       </form>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {childTargets.map(child => (
                    <div key={child.id} className="glass p-6 border-white/5 bg-white/[0.01]">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                            {child.title.replace('[CASCADED] ', '').substring(0, 2)}
                          </div>
                          <div>
                             <p className="text-xs font-bold text-white">{child.title.replace('[CASCADED] ', '')}</p>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('onboarding.progress')}</p>
                          </div>
                       </div>
                       <p className="text-sm font-bold text-slate-300 mb-6 underline decoration-[var(--growth)]/50 underline-offset-4 line-clamp-2">{child.title}</p>
                       <div className="flex items-center justify-between">
                          <div className="px-3 py-1 rounded-lg bg-[var(--growth)]/10 text-[var(--growth-light)] text-[10px] font-black uppercase tracking-widest">
                             {t('performance.builder.contribution', { percent: child.contributionWeight })}
                          </div>
                          <div className="text-xs font-bold text-white">{t('performance.builder.done_percent', { percent: Math.round(child.progress || 0) })}</div>
                       </div>
                    </div>
                  ))}
                  {childTargets.length === 0 && !showCascadeModal && (
                    <div className="col-span-1 md:col-span-2 py-20 text-center glass border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">{t('performance.builder.select_tip')}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-10">
                <div className="p-6 rounded-[2rem] bg-white/5 mb-6">
                  <Target size={48} className="text-slate-700 opacity-50" />
                </div>
                <h3 className="font-display font-bold text-xl text-white mb-2">{t('performance.builder.select_goal')}</h3>
                <p className="text-sm text-slate-500 max-w-[300px]">{t('performance.builder.select_tip')}</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default StrategicGoalBuilder;
