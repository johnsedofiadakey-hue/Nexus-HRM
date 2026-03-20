import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Target, Clock, ChevronRight, CheckCircle2, 
  TrendingUp, ClipboardCheck, AlertCircle, Award 
} from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import PageHeader from '../../components/common/PageHeader';
import FlowSteps from '../../components/common/FlowSteps';
import ActionInbox from '../../components/dashboard/ActionInbox';

const ManagerDashboard = () => {
  const user = getStoredUser();
  const [stats, setStats] = useState({ teamSize: 0, pendingReviews: 0, teamPerf: 88, openLeaves: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/executive')
      .then(res => setStats({
        teamSize: Number(res.data?.totalEmployees) || 0,
        pendingReviews: Number(res.data?.pendingTasks) || 0,
        teamPerf: Number(res.data?.teamPerf) || 0,
        openLeaves: Number(res.data?.activeLeaves) || 0,
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 pb-10 page-transition">
      <PageHeader 
        title={`${user.name?.split(' ')[0] || 'Manager'} Hub`}
        description={`${user.jobTitle || 'Manager'} · Review your team's execution and finalize growth vectors.`}
        icon={Target}
        variant="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 border-indigo-500/20 bg-indigo-500/5 rounded-[2rem]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-6 text-center flex items-center justify-center gap-2">
            <Target size={12} />
            Team Strategy (KPIs)
          </h3>
          <FlowSteps 
            currentStep={2}
            variant="indigo"
            steps={[
              { id: 1, label: 'Department', description: 'Goals' },
              { id: 2, label: 'Team', description: 'Decomp' },
              { id: 3, label: 'Employee', description: 'Focus' },
            ]}
            className="mb-0"
          />
        </div>

        <div className="glass p-8 border-purple-500/20 bg-purple-500/5 rounded-[2rem]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-6 text-center flex items-center justify-center gap-2">
            <Award size={12} />
            Team Growth (Appraisals)
          </h3>
          <FlowSteps 
            currentStep={2}
            variant="purple"
            steps={[
              { id: 1, label: 'Self Review', description: 'Internal' },
              { id: 2, label: 'Manager', description: 'Alignment' },
              { id: 3, label: 'Calibration', description: 'Growth' },
            ]}
            className="mb-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 h-full">
          <ActionInbox />
        </div>
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-6 h-full rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-tight">Active Guidance</p>
              <p className="text-[10px] font-medium text-amber-500/80 uppercase tracking-widest mt-0.5">
                You have {stats.pendingReviews} team members awaiting review and {stats.openLeaves} pending leave requests.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Team Members', value: stats.teamSize || '0', icon: Users, color: '#6366f1' },
          { label: 'Pending Reviews', value: stats.pendingReviews || '0', icon: ClipboardCheck, color: '#f59e0b' },
          { label: 'Team Performance', value: `${(stats.teamPerf || 0).toFixed(1)}%`, icon: CheckCircle2, color: '#10b981' },
          { label: 'Open Leave Req.', value: stats.openLeaves || '0', icon: Clock, color: '#ec4899' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass p-6 group hover:border-primary/30 transition-all">
            <div className="p-3 rounded-2xl w-fit mb-4" style={{ background: `${s.color}15` }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div className="text-2xl font-black text-white mb-1">
              {loading ? <span className="text-slate-600 animate-pulse">···</span> : s.value}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* PENDING REVIEWS (Purple Track) */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass p-8 border-purple-500/20 shadow-2xl shadow-purple-500/5">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                  <ClipboardCheck size={24} />
               </div>
               <div>
                  <h3 className="font-display font-bold text-xl text-white">Pending Reviews</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Growth Calibration Phase</p>
               </div>
            </div>
            <a href="/reviews/team" className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2">
               View All <ChevronRight size={14} />
            </a>
          </div>
          
          <div className="space-y-4">
             {stats.pendingReviews > 0 ? (
                <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between group hover:bg-purple-500/10 transition-all">
                   <div>
                      <p className="text-sm font-bold text-white uppercase tracking-tight">{stats.pendingReviews} Appraisals Pending</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Action required: HR Calibration</p>
                   </div>
                   <a href="/reviews/team" className="px-6 py-2 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 hover:bg-purple-500 transition-all">Review Now</a>
                </div>
             ) : (
                <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                   <CheckCircle2 size={32} className="mx-auto text-slate-700 mb-4 opacity-50" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">All growth vectors finalized</p>
                </div>
             )}
          </div>
        </motion.div>

        {/* TEAM TARGETS (Indigo Track) */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-8 border-indigo-500/20 shadow-2xl shadow-indigo-500/5">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                  <Target size={24} />
               </div>
               <div>
                  <h3 className="font-display font-bold text-xl text-white">Team Targets</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Strategic Mission Monitoring</p>
               </div>
            </div>
            <a href="/kpi/team" className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2">
               Assign <ChevronRight size={14} />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all">
                <p className="text-2xl font-black text-white">8</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Active KPI Sheets</p>
             </div>
             <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 transition-all">
                <p className="text-2xl font-black text-white">2</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Draft Missions</p>
             </div>
          </div>
        </motion.div>

        {/* TEAM PERFORMANCE (Indigo Track) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="xl:col-span-2 glass p-8 border-indigo-500/20 bg-indigo-500/[0.02]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-display font-bold text-xl text-white">Team Performance Analytics</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Aggregate Execution Scores</p>
            </div>
            <div className="flex items-center gap-2 text-2xl font-black text-green-400">
               {stats.teamPerf.toFixed(1)}%
               <TrendingUp size={20} />
            </div>
          </div>

          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-8">
             <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: `${stats.teamPerf}%` }} 
               className="h-full bg-gradient-to-r from-indigo-500 to-primary shadow-[0_0_20px_rgba(99,102,241,0.4)]"
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Execution Velocity</p>
                <p className="text-sm font-bold text-white">High</p>
             </div>
             <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Alignment</p>
                <p className="text-sm font-bold text-white">92%</p>
             </div>
             <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Resource Drain</p>
                <p className="text-sm font-bold text-white">Optimal</p>
             </div>
             <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Risk Profile</p>
                <p className="text-sm font-bold text-white">Low</p>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
