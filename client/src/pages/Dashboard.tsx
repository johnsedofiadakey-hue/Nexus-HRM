import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line 
} from 'recharts';
import { 
  TrendingUp, Users, AlertCircle, Award, 
  ArrowUpRight, ArrowDownRight, Calendar, Download, MoreHorizontal 
} from 'lucide-react';

// --- MOCK DATA (Ideally, this comes from /api/dashboard/stats) ---
const performanceData = [
  { name: 'Jan', score: 65, target: 80 },
  { name: 'Feb', score: 72, target: 80 },
  { name: 'Mar', score: 85, target: 85 },
  { name: 'Apr', score: 78, target: 85 },
  { name: 'May', score: 90, target: 90 },
  { name: 'Jun', score: 92, target: 90 },
  { name: 'Jul', score: 88, target: 95 },
];

const teamHealth = [
  { department: 'Sales', score: 92, status: 'High', color: 'bg-emerald-500' },
  { department: 'Marketing', score: 74, status: 'Medium', color: 'bg-blue-500' },
  { department: 'IT Support', score: 45, status: 'Critical', color: 'bg-rose-500' },
  { department: 'HR', score: 88, status: 'High', color: 'bg-purple-500' },
];

const recentActivity = [
  { id: 1, user: 'Sarah Connor', action: 'Approved Leave', target: 'John Doe', time: '2 hours ago' },
  { id: 2, user: 'Richard Sterling', action: 'Updated Policy', target: 'Q3 Sales Targets', time: '5 hours ago' },
  { id: 3, user: 'System', action: 'Auto-Locked', target: 'Oct KPI Sheets', time: '1 day ago' },
];

// --- COMPONENTS ---

interface StatCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: any;
  trend: 'up' | 'down';
}

const StatCard = ({ title, value, subtext, icon: Icon, trend }: StatCardProps) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1 group-hover:text-nexus-600 transition-colors">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      {trend === 'up' ? (
        <span className="text-emerald-600 flex items-center font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
          <ArrowUpRight size={14} className="mr-1" /> {subtext}
        </span>
      ) : (
        <span className="text-rose-500 flex items-center font-bold bg-rose-50 px-2 py-0.5 rounded-full text-xs">
          <ArrowDownRight size={14} className="mr-1" /> {subtext}
        </span>
      )}
      <span className="text-slate-400 ml-2 text-xs font-medium uppercase tracking-wide">vs last month</span>
    </div>
  </div>
);

const Dashboard = () => {
  // 1. Get User Info from LocalStorage (Real Data)
  const user = JSON.parse(localStorage.getItem('nexus_user') || '{"name": "Executive"}');
  const [timeRange, setTimeRange] = useState('6M');

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Overview</h1>
          <p className="text-slate-500 mt-2 flex items-center">
            Welcome back, <span className="font-semibold text-nexus-600 mx-1">{user.name}</span>. 
            Here is what's happening today.
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
            <Download size={18} className="mr-2" /> Export
          </button>
          <button className="flex items-center px-4 py-2 bg-nexus-600 text-white rounded-lg font-bold hover:bg-nexus-700 shadow-lg shadow-nexus-500/20 transition-all active:scale-95">
            <Calendar size={18} className="mr-2" /> New Period
          </button>
        </div>
      </div>

      {/* 2. Key Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Avg Performance" 
          value="78%" 
          subtext="+4.2%" 
          icon={TrendingUp} 
          trend="up" 
        />
        <StatCard 
          title="Team Morale" 
          value="4.2" 
          subtext="-0.1" 
          icon={Users} 
          trend="down" 
        />
        <StatCard 
          title="Critical Issues" 
          value="3" 
          subtext="Action Req." 
          icon={AlertCircle} 
          trend="down" 
        />
        <StatCard 
          title="Top Performers" 
          value="12" 
          subtext="Bonus Ready" 
          icon={Award} 
          trend="up" 
        />
      </div>

      {/* 3. Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart: Performance Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Performance Trend</h3>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['1M', '3M', '6M', 'YTD'].map((range) => (
                <button 
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    timeRange === range ? 'bg-white text-nexus-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0f172a', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{color: '#fff'}}
                  cursor={{ stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#0ea5e9" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#0284c7' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#94a3b8" 
                  strokeWidth={2} 
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
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Department Health</h3>
              <MoreHorizontal size={20} className="text-slate-400 cursor-pointer hover:text-nexus-600" />
            </div>
            <div className="space-y-5">
              {teamHealth.map((team) => (
                <div key={team.department}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-slate-700 text-sm">{team.department}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      team.score < 50 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {team.score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full ${team.color} transition-all duration-1000`} 
                      style={{ width: `${team.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-nexus-50 flex items-center justify-center text-nexus-600 font-bold text-xs shrink-0">
                    {item.user[0]}
                  </div>
                  <div>
                    <p className="text-sm text-slate-800 font-medium">
                      <span className="font-bold">{item.user}</span> {item.action}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.target} • {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-sm text-nexus-600 font-medium hover:bg-nexus-50 rounded-lg transition-colors">
              View All Logs
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;