import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Clock, MessageSquare, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';

const ManagerDashboard = () => {
  const user = getStoredUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const [stats, setStats] = useState({ teamSize: 0, pendingReviews: 0, teamPerf: 88, openLeaves: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/executive')
      .then(res => setStats({
        teamSize: 8,
        pendingReviews: Number(res.data?.pendingTasks) || 3,
        teamPerf: 88,
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm font-bold uppercase tracking-widest text-primary-light mb-1">{greeting}</p>
        <h1 className="font-display font-black text-4xl lg:text-5xl text-white leading-none">
          {user.name?.split(' ')[0] || 'Manager'} <span className="gradient-text">Hub</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          {user.jobTitle || 'Manager'} &nbsp;·&nbsp; Team Operations Dashboard
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Team Members', value: stats.teamSize || '—', icon: Users, color: '#6366f1' },
          { label: 'Pending Reviews', value: stats.pendingReviews || '—', icon: Target, color: '#f59e0b' },
          { label: 'Team Performance', value: `${stats.teamPerf}%`, icon: CheckCircle2, color: '#10b981' },
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

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass p-8">
          <h3 className="font-display font-bold text-xl text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Assign KPIs', href: '/team-targets', icon: Target },
              { label: 'Review Team', href: '/performance-reviews', icon: CheckCircle2 },
              { label: 'Approve Leave', href: '/leave', icon: Clock },
              { label: 'Team Chat', href: '/employees', icon: MessageSquare },
            ].map((item, idx) => (
              <a key={idx} href={item.href}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-primary/30 hover:bg-primary/5 transition-all flex flex-col gap-3 no-underline group">
                <item.icon size={18} className="text-slate-500 group-hover:text-primary-light transition-colors" />
                <span className="text-sm font-black text-white group-hover:text-primary-light transition-colors">{item.label}</span>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default ManagerDashboard;
