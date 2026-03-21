import { useNavigate , Link} from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, Target, Calendar, Building2, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ActionInbox from '../../components/dashboard/ActionInbox';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

const DirectorDashboard = () => {
  const user = getStoredUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const [data, setData] = useState({ distribution: [] as any[], performance: [] as any[] });
  const [loading, setLoading] = useState(true);

  const fallbackDist = [
    { name: 'Operations', value: 38 }, { name: 'Sales', value: 28 },
    { name: 'Admin', value: 18 }, { name: 'IT', value: 16 }
  ];
  const fallbackPerf = [
    { name: 'Operations', value: 88 }, { name: 'Sales', value: 74 },
    { name: 'Admin', value: 91 }, { name: 'IT', value: 82 }
  ];

  useEffect(() => {
    api.get('/analytics/dept-growth')
      .then(res => setData({
        distribution: fallbackDist,
        performance: Array.isArray(res.data) && res.data.length ? res.data : fallbackPerf
      }))
      .catch(() => setData({ distribution: fallbackDist, performance: fallbackPerf }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 pb-10 page-transition">
      {/* Identity Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm font-bold uppercase tracking-widest text-primary-light mb-1">{greeting}</p>
        <h1 className="font-display font-black text-4xl lg:text-5xl text-white leading-none">
          {user.name?.split(' ')[0] || 'Director'} <span className="gradient-text">Overview</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          {user.jobTitle || 'Director'} &nbsp;·&nbsp; Departmental Intelligence
        </p>
      </motion.div>

      {/* Action Inbox & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ActionInbox />
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 gap-5 h-fit">
          {[
            { label: 'Departments', value: '5', icon: Building2, color: '#6366f1' },
            { label: 'Active Reviews', value: '12', icon: BarChart3, color: '#a855f7' },
            { label: 'Open Targets', value: '24', icon: Target, color: '#f59e0b' },
            { label: 'Pending Leave', value: '3', icon: Calendar, color: '#10b981' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass p-6 group hover:border-primary/30 transition-all">
              <div className="p-3 rounded-2xl w-fit mb-4" style={{ background: `${s.color}15` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-black text-white mb-1">{s.value}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Department Distribution Pie */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass p-8">
          <h3 className="font-display font-bold text-xl text-white mb-6">Headcount Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {data.distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {data.distribution.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-slate-400">{d.name} <strong className="text-white">{d.value}%</strong></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dept Performance Bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass p-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-primary-light" />
            <h3 className="font-display font-bold text-xl text-white">Department Performance</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.performance} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
              <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Quick access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Institutional Verdict', href: '/reviews/final', color: '#6366f1' },
          { label: 'Team Targets', href: '/kpi/team', color: '#a855f7' },
          { label: 'Department Config', href: '/departments', color: '#06b6d4' },
        ].map((item, i) => (
          <Link key={i} to={item.href} className="glass p-5 flex items-center justify-between group hover:border-primary/30 transition-all no-underline">
            <span className="text-sm font-black text-white group-hover:text-primary-light transition-colors">{item.label}</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${item.color}20` }}>
              <span style={{ color: item.color }}>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
export default DirectorDashboard;
