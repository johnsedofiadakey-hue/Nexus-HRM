import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Clock, ChevronRight, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import PageHeader from '../../components/common/PageHeader';
import FlowSteps from '../../components/common/FlowSteps';
import { Award } from 'lucide-react';

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

  const milestones = [
    { title: 'Q4 KPI Submission Deadline', date: 'In 3 days', status: 'urgent' },
    { title: 'Monthly Team Review', date: 'Next Monday', status: 'upcoming' },
    { title: 'Onboarding — New Hire', date: 'This Friday', status: 'upcoming' },
  ];

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

      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-center gap-4"
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Team Members', value: stats.teamSize || '0', icon: Users, color: '#6366f1' },
          { label: 'Pending Reviews', value: stats.pendingReviews || '0', icon: Target, color: '#f59e0b' },
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
        {/* Upcoming Milestones */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass p-8">
          <h3 className="font-display font-bold text-xl text-white mb-6">Upcoming Milestones</h3>
          <div className="space-y-4">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 transition-all">
                <div className={`p-2 rounded-xl ${m.status === 'urgent' ? 'bg-rose-500/10' : 'bg-primary/10'}`}>
                  {m.status === 'urgent' ? <AlertCircle size={16} className="text-rose-400" /> : <Clock size={16} className="text-primary-light" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{m.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.date}</p>
                </div>
                <ChevronRight size={14} className="text-slate-600" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pending Actions Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="xl:col-span-2 glass p-8 border-[var(--growth)]/20 shadow-2xl shadow-[var(--growth)]/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-display font-bold text-xl text-white">Pending Actions</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">High-priority management vectors</p>
            </div>
            <div className="px-4 py-1 rounded-full bg-[var(--growth)]/10 text-[var(--growth-light)] text-[10px] font-black uppercase tracking-widest border border-[var(--growth)]/20">
              Needs Attention
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a href="/manager/appraisals" className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-[var(--growth)]/40 hover:bg-[var(--growth)]/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle2 size={20} className="text-[var(--growth-light)]" />
                <span className="text-2xl font-black text-white">{stats.pendingReviews}</span>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-tight">Pending Appraisals</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 group-hover:text-[var(--growth-light)]">Finalize calibrations</p>
            </a>

            <a href="/kpi/team" className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/40 hover:bg-primary/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <Target size={20} className="text-primary-light" />
                <span className="text-2xl font-black text-white">2</span>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-tight">KPI Reviews</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 group-hover:text-primary-light">Review target progress</p>
            </a>

            <a href="/leave" className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-rose-500/40 hover:bg-rose-500/5 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <Calendar size={20} className="text-rose-400" />
                <span className="text-2xl font-black text-white">{stats.openLeaves}</span>
              </div>
              <p className="text-xs font-black text-white uppercase tracking-tight">Leave Requests</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 group-hover:text-rose-400">Review time-off mandates</p>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default ManagerDashboard;
