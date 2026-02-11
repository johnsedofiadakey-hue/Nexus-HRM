import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line 
} from 'recharts';
import { 
  TrendingUp, Users, AlertCircle, Award, 
  ArrowUpRight, ArrowDownRight, Calendar, Download, MoreHorizontal 
} from 'lucide-react';

// --- REAL DATA HOOKS ---
const useDashboardData = () => {
  const [stats, setStats] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, perfRes, deptRes, actRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/performance'),
          api.get('/departments'),
          api.get('/activity/logs?limit=10'),
        ]);
        setStats(statsRes.data);
        setPerformance(perfRes.data);
        setDepartments(deptRes.data);
        setActivity(actRes.data);
      } catch (e) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  return { stats, performance, departments, activity, loading, error };
};

// --- COMPONENTS ---


// AnimatedStatCard: lively, gradient, animated, interactive
const AnimatedStatCard = ({ title, value, subtext, icon: Icon, colorFrom, colorTo, trend }) => (
  <div
    className={`relative group p-6 rounded-2xl bg-gradient-to-br ${colorFrom} ${colorTo} shadow-xl transition-transform duration-300 hover:scale-105 cursor-pointer overflow-hidden animate-in fade-in zoom-in`}
    style={{ minHeight: 140 }}
  >
    <div className="absolute right-4 top-4 opacity-20 group-hover:opacity-40 transition-opacity text-white text-7xl pointer-events-none">
      <Icon size={64} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={28} className="text-white drop-shadow-lg" />
        <span className="text-white text-lg font-semibold tracking-wide drop-shadow">{title}</span>
      </div>
      <div className="text-4xl font-extrabold text-white drop-shadow-lg flex items-end gap-2">
        {value}
        {trend === 'up' && <span className="ml-1 text-emerald-200 animate-bounce">▲</span>}
        {trend === 'down' && <span className="ml-1 text-rose-200 animate-bounce">▼</span>}
      </div>
      <div className="text-white/80 text-sm mt-2 font-medium">{subtext}</div>
    </div>
    <div className="absolute inset-0 rounded-2xl border-2 border-white/10 group-hover:border-white/30 transition-all pointer-events-none" />
  </div>
);

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem('nexus_user') || '{"name": "Executive"}');
  const [timeRange, setTimeRange] = useState('6M');
  const { stats, performance, departments, activity, loading, error } = useDashboardData();

  if (loading) return <div className="p-12 text-center text-xl text-nexus-600 animate-pulse">Loading dashboard...</div>;
  if (error) return <div className="p-12 text-center text-xl text-rose-600">{error}</div>;

  return (
    <div className="space-y-10 animate-in fade-in zoom-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-1">Executive Overview</h1>
          <p className="text-slate-500 text-lg flex items-center">
            Welcome back, <span className="font-semibold text-nexus-600 mx-1">{user.name}</span>.
            <span className="ml-2">Here is what's happening today.</span>
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold shadow-lg hover:scale-105 transition-transform">
            <Download size={18} className="mr-2" /> Export
          </button>
          <button className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-rose-500 text-white rounded-lg font-bold shadow-lg hover:scale-105 transition-transform">
            <Calendar size={18} className="mr-2" /> New Period
          </button>
        </div>
      </div>

      {/* Animated Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <AnimatedStatCard
          title="Avg Performance"
          value={stats?.avgPerformance ? `${stats.avgPerformance}%` : '--'}
          subtext={stats?.performanceChange || ''}
          icon={TrendingUp}
          colorFrom="from-blue-500" colorTo="to-purple-500"
          trend={stats?.performanceChange?.startsWith('-') ? 'down' : 'up'}
        />
        <AnimatedStatCard
          title="Team Morale"
          value={stats?.teamMorale ? stats.teamMorale.toFixed(1) : '--'}
          subtext={stats?.moraleChange || ''}
          icon={Users}
          colorFrom="from-emerald-500" colorTo="to-blue-400"
          trend={stats?.moraleChange?.startsWith('-') ? 'down' : 'up'}
        />
        <AnimatedStatCard
          title="Critical Issues"
          value={stats?.criticalIssues ?? '--'}
          subtext={stats?.criticalIssues > 0 ? 'Action Req.' : 'All Good'}
          icon={AlertCircle}
          colorFrom="from-rose-500" colorTo="to-orange-400"
          trend={stats?.criticalIssues > 0 ? 'down' : 'up'}
        />
        <AnimatedStatCard
          title="Top Performers"
          value={stats?.topPerformers ?? '--'}
          subtext={stats?.topPerformers > 0 ? 'Bonus Ready' : ''}
          icon={Award}
          colorFrom="from-purple-500" colorTo="to-emerald-400"
          trend={stats?.topPerformers > 0 ? 'up' : 'down'}
        />
      </div>

      {/* 3. Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart: Performance Trend */}
        <div className="lg:col-span-2 p-0 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-100 shadow-xl relative overflow-hidden border-0">
          <div className="flex justify-between items-center px-6 pt-6 mb-4">
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Performance Trend</h3>
            <div className="flex bg-white/70 p-1 rounded-lg shadow-sm">
              {['1M', '3M', '6M', 'YTD'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    timeRange === range ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80 px-2 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e7ff" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#6366f1', fontSize: 13, fontWeight: 600}}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#6366f1', fontSize: 13, fontWeight: 600}}
                />
                <Tooltip
                  contentStyle={{
                    background: 'linear-gradient(90deg, #6366f1 0%, #0ea5e9 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgba(99,102,241,0.15)'
                  }}
                  itemStyle={{color: '#fff'}}
                  cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  activeDot={{ r: 7, strokeWidth: 0, fill: '#0ea5e9' }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel: Department Health & Activity */}
        <div className="space-y-6">
          
          {/* Dept Health */}
          <div className="bg-gradient-to-br from-emerald-50 to-blue-100 p-6 rounded-2xl shadow-xl border-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Department Health</h3>
              <MoreHorizontal size={20} className="text-slate-400 cursor-pointer hover:text-nexus-600" />
            </div>
            <div className="space-y-5">
              {departments.map((team) => (
                <div key={team.id || team.department || team.name} className="transition-all animate-in fade-in zoom-in">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${team.score < 50 ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`}></span>
                      {team.name || team.department}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      team.score < 50 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {team.score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${team.score < 50 ? 'bg-rose-500' : 'bg-emerald-500'} transition-all duration-1000 animate-pulse`}
                      style={{ width: `${team.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-gradient-to-br from-purple-50 to-rose-100 p-6 rounded-2xl shadow-xl border-0">
            <h3 className="text-lg font-extrabold text-slate-800 mb-4 tracking-tight">Recent Activity</h3>
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 animate-in fade-in zoom-in">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-lg">
                    {item.user[0]}
                  </div>
                  <div>
                    <p className="text-base text-slate-800 font-semibold">
                      <span className="font-bold text-nexus-600">{item.user}</span> <span className="text-slate-600">{item.action}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.target} • {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 rounded-lg shadow transition-all">
              View All Logs
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;