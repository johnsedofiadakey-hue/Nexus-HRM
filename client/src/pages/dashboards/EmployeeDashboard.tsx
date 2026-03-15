import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Clock, FileText, Award, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';

const EmployeeDashboard: React.FC = () => {
  const user = getStoredUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
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
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-sm font-bold uppercase tracking-widest text-primary-light mb-1">{greeting}</p>
        <h1 className="font-display font-black text-4xl lg:text-5xl text-white leading-none">
          {user.name?.split(' ')[0] || 'Team'} <span className="gradient-text">Success</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          {user.jobTitle || 'Staff'} &nbsp;·&nbsp; Personal Performance & Records
        </p>
      </motion.div>

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
