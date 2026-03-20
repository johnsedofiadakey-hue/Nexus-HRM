import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, DollarSign, Activity, TrendingUp, Shield, FileText, Bell, ArrowUp, Target } from 'lucide-react';
import api from '../../services/api';
import { getStoredUser } from '../../utils/session';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import FlowSteps from '../../components/common/FlowSteps';
import { Award, Globe } from 'lucide-react';
import ActionInbox from '../../components/dashboard/ActionInbox';

interface Stats {
  totalEmployees: number;
  activeLeaves: number;
  pendingTasks: number;
  payrollTotal: number;
  attendanceRate: number;
  growth: { name: string; value: number }[];
}

const MDDashboard = () => {
  const user = getStoredUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();

  useEffect(() => {
    api.get('/analytics/executive')
      .then(res => setStats({
        totalEmployees: res.data?.totalEmployees || 0,
        activeLeaves: res.data?.activeLeaves || 0,
        pendingTasks: res.data?.pendingTasks || 4,
        payrollTotal: res.data?.payrollTotal || 0,
        attendanceRate: res.data?.attendanceRate || 0,
        growth: Array.isArray(res.data?.growth) ? res.data.growth :
          [{ name: 'Jan', value: 4000 }, { name: 'Feb', value: 3200 }, { name: 'Mar', value: 2800 },
           { name: 'Apr', value: 3600 }, { name: 'May', value: 4200 }, { name: 'Jun', value: 3900 }, { name: 'Jul', value: 4800 }]
      }))
      .catch(() => setStats({
        totalEmployees: 0, activeLeaves: 0, pendingTasks: 0, payrollTotal: 0, attendanceRate: 0,
        growth: [{ name: 'Jan', value: 4000 }, { name: 'Feb', value: 3200 }, { name: 'Mar', value: 2800 },
                 { name: 'Apr', value: 3600 }, { name: 'May', value: 4200 }, { name: 'Jun', value: 3900 }, { name: 'Jul', value: 4800 }]
      }))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Employees', value: stats?.totalEmployees ?? '—', icon: Users, color: '#6366f1', change: '+3%' },
    { label: 'On Leave Now', value: stats?.activeLeaves ?? '—', icon: Calendar, color: '#f59e0b', change: '' },
    { label: 'Monthly Payroll', value: stats?.payrollTotal ? `GHS ${Number(stats.payrollTotal).toLocaleString()}` : '—', icon: DollarSign, color: '#10b981', change: '' },
    { label: 'Attendance Rate', value: stats?.attendanceRate ? `${stats.attendanceRate}%` : '—', icon: Activity, color: '#06b6d4', change: '+1.2%' },
  ];

  return (
    <div className="space-y-10 pb-10 page-transition">
      <PageHeader 
        title={`${user.name?.split(' ')[0] || 'Executive'} Command`}
        description={`${user.jobTitle || 'Managing Director'} · Orchestrating strategic alignment and organizational growth.`}
        icon={Globe}
        variant="indigo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ActionInbox />
        </div>
        <div className="lg:col-span-2 space-y-8">
          <div className="glass p-8 border-indigo-500/20 bg-indigo-500/5 rounded-[2rem]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-6 text-center flex items-center justify-center gap-2">
              <Target size={12} />
              Enterprise Strategy (KPIs)
            </h3>
            <FlowSteps 
              currentStep={1}
              variant="indigo"
              steps={[
                { id: 1, label: 'Corp Strategy', description: 'MD Mandate' },
                { id: 2, label: 'Operational', description: 'Decomp' },
                { id: 3, label: 'Execution', description: 'Success' },
              ]}
              className="mb-0"
            />
          </div>

          <div className="glass p-8 border-purple-500/20 bg-purple-500/5 rounded-[2rem]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-6 text-center flex items-center justify-center gap-2">
              <Award size={12} />
              Institutional Growth (Appraisals)
            </h3>
            <FlowSteps 
              currentStep={3}
              variant="purple"
              steps={[
                { id: 1, label: 'Self Review', description: 'Internal' },
                { id: 2, label: 'Alignment', description: 'Manager' },
                { id: 3, label: 'Final Verdict', description: 'Growth' },
              ]}
              className="mb-0"
            />
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass p-6 group hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3 rounded-2xl" style={{ background: `${s.color}15` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              {s.change && (
                <span className="text-[10px] font-black flex items-center gap-1 text-emerald-400">
                  <ArrowUp size={10} />{s.change}
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-white mb-1">
              {loading ? <span className="text-slate-600 animate-pulse">···</span> : s.value}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Growth Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display font-bold text-xl text-white">Workforce Growth</h3>
            <p className="text-xs text-slate-500 mt-1">Headcount trend — current cycle</p>
          </div>
          <TrendingUp size={18} className="text-primary-light" />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats?.growth || []}>
            <defs>
              <linearGradient id="mdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#mdGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Users, label: 'Manage Employees', desc: 'View all staff records', href: '/employees', color: '#6366f1' },
          { icon: DollarSign, label: 'Run Payroll', desc: 'Process monthly payroll', href: '/payroll', color: '#10b981' },
          { icon: FileText, label: 'Audit Logs', desc: 'Full system audit trail', href: '/audit', color: '#f59e0b' },
          { icon: Bell, label: 'Announcements', desc: 'Broadcast to all staff', href: '/announcements', color: '#ec4899' },
          { icon: Activity, label: 'Performance', desc: 'Institutional Verdict', href: '/reviews/final', color: '#06b6d4' },
          { icon: Shield, label: 'Company Settings', desc: 'Org config & branding', href: '/company-settings', color: '#8b5cf6' },
        ].map((item, i) => (
          <motion.div key={i} onClick={() => window.location.href = item.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.06 }}
            className="glass p-6 group hover:border-primary/30 transition-all cursor-pointer block no-underline">
            <div className="p-3 rounded-2xl w-fit mb-4" style={{ background: `${item.color}15` }}>
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <p className="text-sm font-black text-white group-hover:text-primary-light transition-colors">{item.label}</p>
            <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MDDashboard;
