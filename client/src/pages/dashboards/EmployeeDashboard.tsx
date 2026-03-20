import React from 'react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Clock, FileText, Award, ChevronRight, Calendar, Send } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import PageHeader from '../../components/common/PageHeader';
import FlowSteps from '../../components/common/FlowSteps';
import ActionInbox from '../../components/dashboard/ActionInbox';

const EmployeeDashboard: React.FC = () => {
  const user = getStoredUser();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/personal')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 page-transition pb-10">
      <PageHeader 
        title={`${user.name?.split(' ')[0] || 'Team'} Success`}
        description={`${user.jobTitle || 'Staff'} · Execution phase for your current mission targets.`}
        icon={Target}
        variant="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 border-indigo-500/20 bg-indigo-500/5 rounded-[2rem]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-6 text-center flex items-center justify-center gap-2">
            <Target size={12} />
            Strategic Journey (KPIs)
          </h3>
          <FlowSteps 
            currentStep={3}
            variant="indigo"
            steps={[
              { id: 1, label: 'MD Goals', description: 'Strategy' },
              { id: 2, label: 'Team KPI', description: 'Decomp' },
              { id: 3, label: 'My Focus', description: 'Execution' },
            ]}
            className="mb-0"
          />
        </div>

        <div className="glass p-8 border-purple-500/20 bg-purple-500/5 rounded-[2rem]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-6 text-center flex items-center justify-center gap-2">
            <Award size={12} />
            Growth Journey (Appraisals)
          </h3>
          <FlowSteps 
            currentStep={stats?.pendingAppraisals > 0 ? 1 : 0}
            variant="purple"
            steps={[
              { id: 1, label: 'Self Review', description: 'Internal' },
              { id: 2, label: 'Manager', description: 'Alignment' },
              { id: 3, label: 'Complete', description: 'Growth' },
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
            className="p-6 h-full rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Send size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-tight">Personnel Status</p>
              <p className="text-[10px] font-medium text-emerald-400/80 uppercase tracking-widest mt-0.5">
                You have {stats?.activeGoals?.length || 0} active targets and {stats?.pendingAppraisals || 0} pending appraisals.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { title: 'My Performance', value: loading ? '…' : `${stats?.overallPerformance ?? 0}%`, icon: Target, color: '#6366f1' },
          { title: 'Attendance Rate', value: loading ? '…' : `${stats?.attendanceRate ?? 0}%`, icon: Clock, color: '#10b981' },
          { title: 'Leave Balance', value: loading ? '…' : `${stats?.leaveBalance ?? 0} days`, icon: Calendar, color: '#f59e0b' },
          { title: 'Training Status', value: 'On Track', icon: Award, color: '#ec4899' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass p-6 group hover:border-primary/30 transition-all">
            <div className="p-3 w-fit rounded-2xl mb-4" style={{ background: `${stat.color}15` }}>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.title}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass p-8">
          <h3 className="font-display font-bold text-xl text-white mb-6">My Goals</h3>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4 text-slate-500 animate-pulse text-sm">Loading active goals...</div>
            ) : (!stats?.activeGoals || stats.activeGoals.length === 0) ? (
              <div className="text-center py-4 text-slate-500 text-sm">No active performance goals assigned matching this criteria.</div>
            ) : (
              stats.activeGoals.map((item: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-slate-400 truncate pr-4">{item.name}</span>
                    <span style={{ color: item.color }}>{item.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: item.color }}
                      initial={{ width: 0 }} animate={{ width: `${item.progress}%` }} transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass p-8">
          <h3 className="font-display font-bold text-xl text-white mb-6">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { label: 'Request Leave', href: '/leave', icon: Calendar },
              { label: 'View Payslips', href: '/finance', icon: FileText },
              { label: 'My Appraisal', href: '/performance-reviews', icon: Target },
              { label: 'Training Portal', href: '/training', icon: Award },
            ].map((item, i) => (
              <Link key={i} to={item.href}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 transition-all group">
                <item.icon size={16} className="text-slate-500 group-hover:text-primary-light transition-colors" />
                <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors flex-1">{item.label}</span>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-primary-light transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default EmployeeDashboard;
