import { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { motion } from 'framer-motion';
import { Terminal, Activity, Database, Shield, HardDrive, Cpu, RefreshCcw } from 'lucide-react';
import api from '../../services/api';


const DevDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, backupsRes] = await Promise.all([
        api.get('/dev/stats'),
        api.get('/dev/backups')
      ]);
      setStats(statsRes.data || {});
      setBackups(Array.isArray(backupsRes.data) ? backupsRes.data : []);
    } catch (error) {
      console.error('Failed to fetch dev data:', error);
      // Never leave the page blank — use safe defaults
      setStats((prev: any) => prev || {});

      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const runBackup = async () => {
    setBackingUp(true);
    try {
      await api.post('/dev/backup');

      fetchData();
    } catch (error) {
      toast.info('Backup failed');
    } finally {
      setBackingUp(false);
    }
  };

  if (loading || !stats) return <div className="p-8 font-mono text-emerald-500 animate-pulse bg-black h-screen">INITIALIZING NEXUS_DEV_CONSOLE...</div>;

  return (
    <div className="p-8 font-mono bg-[#050505] min-screen space-y-8 text-emerald-400">
      <div className="flex items-center justify-between border-b border-emerald-900/50 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
            <Terminal className="text-emerald-500" /> Nexus HRM Dev Portal
          </h1>
          <p className="text-[10px] opacity-60 mt-1 uppercase tracking-widest">Master Control & System Monitoring</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-emerald-900/20 border border-emerald-500/30 rounded text-[10px] uppercase font-bold">
            Platform: {stats.system.platform} ({stats.system.arch})
          </div>
          <div className="px-4 py-2 bg-emerald-900/20 border border-emerald-500/30 rounded text-[10px] uppercase font-bold">
            Uptime: {Math.floor(stats.system.uptimeSeconds / 3600)}h {Math.floor((stats.system.uptimeSeconds % 3600) / 60)}m
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatTile label="Memory Usage" value={`${stats.system.memoryPct}%`} sub={`${stats.system.memoryUsedMB}MB / ${stats.system.memoryTotalMB}MB`} icon={HardDrive} />
        <StatTile label="CPU Load" value={stats.system.cpuLoad[0].toFixed(2)} sub="1m Average" icon={Cpu} />
        <StatTile label="Active Users" value={stats.counts.activeUsers} sub={`Total: ${stats.counts.totalUsers}`} icon={Activity} />
        <StatTile label="Security Status" value="LOCKED" sub="Firewall Active" icon={Shield} color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass border-emerald-900/30 p-6 rounded-xl bg-black/40">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <RefreshCcw className="w-4 h-4" /> Live System Logs (Raw)
            </h3>
            <div className="bg-[#0a0a0a] p-4 rounded-lg h-[300px] overflow-y-auto border border-emerald-900/20 text-[11px] space-y-2">
              {Array.isArray(stats?.recentAudit) && stats.recentAudit.map((log: any, i: number) => (
                <div key={i} className="flex gap-3 border-l-2 border-emerald-900/50 pl-3">
                  <span className="opacity-40">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                  <span className="text-emerald-300">USER_{log.user?.fullName?.split(' ')[0].toUpperCase()}</span>
                  <span className="opacity-60">{log.action}: {log.entity} ({log.entityId})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass border-emerald-900/30 p-6 rounded-xl bg-black/40">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex justify-between items-center">
                <span>Database Snapshots</span>
                <button onClick={runBackup} disabled={backingUp} className="text-[10px] bg-emerald-500 text-black px-3 py-1 rounded font-black hover:bg-emerald-400 transition-colors uppercase disabled:opacity-50">
                  {backingUp ? 'Processing...' : 'Manual Backup'}
                </button>
              </h3>
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {Array.isArray(backups) && backups.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-emerald-900/10 rounded border border-emerald-900/20">
                    <span className="truncate max-w-[150px]">{b.name}</span>
                    <span className="opacity-40 font-bold">{(b.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass border-rose-900/30 p-6 rounded-xl bg-rose-950/5">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-6 text-rose-500">Security & Maintenance</h3>
              <div className="space-y-4">
                <button className="w-full text-left p-3 rounded border border-rose-900/20 bg-rose-900/10 text-rose-400 text-[11px] uppercase font-bold hover:bg-rose-900/20 transition-colors">
                  Enable Maintenance Mode
                </button>
                <button className="w-full text-left p-3 rounded border border-rose-900/20 bg-rose-900/10 text-rose-400 text-[11px] uppercase font-bold hover:bg-rose-900/20 transition-colors">
                  Force Revoke All Sessions
                </button>
                <button className="w-full text-left p-3 rounded border border-rose-900/20 bg-rose-500/10 text-rose-500 text-[11px] uppercase font-bold hover:bg-rose-500/20 transition-colors">
                  System Lockdown (MD+ ONLY)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass border-amber-900/30 p-6 rounded-xl bg-amber-950/5">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6 text-amber-500 flex items-center gap-2">
              <Database className="w-4 h-4" /> Usage Quotas
            </h3>
            <div className="space-y-6">
              <QuotaRow label="Database Size" value="12.4 MB" total="1024 MB" pct={1.2} />
              <QuotaRow label="API Requests (24h)" value="1,429" total="100k" pct={1.4} />
              <QuotaRow label="Storage" value="482 MB" total="10 GB" pct={4.8} />
            </div>
          </div>

          <div className="glass border-emerald-900/30 p-6 rounded-xl bg-black/40">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Environment Variables</h3>
            <div className="text-[10px] space-y-2 opacity-60">
              <div className="flex justify-between border-b border-emerald-900/20 pb-1">
                <span>NODE_ENV</span>
                <span className="text-emerald-500">production</span>
              </div>
              <div className="flex justify-between border-b border-emerald-900/20 pb-1">
                <span>DATABASE_URL</span>
                <span className="text-emerald-500">****.db</span>
              </div>
              <div className="flex justify-between border-b border-emerald-900/20 pb-1">
                <span>PORT</span>
                <span className="text-emerald-500">5000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatTile = ({ label, value, sub, icon: Icon, color = 'text-emerald-400' }: any) => (
  <motion.div
    whileHover={{ y: -2, scale: 1.01 }}
    className="glass border-emerald-900/30 p-5 rounded-xl bg-black/40"
  >
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] uppercase font-bold opacity-40">{label}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className="flex items-baseline gap-2">
      <h2 className={`text-2xl font-black ${color}`}>{value}</h2>
      <span className="text-[10px] opacity-40 font-bold">{sub}</span>
    </div>
  </motion.div>
);

const QuotaRow = ({ label, value, total, pct }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[11px] font-bold">
      <span className="opacity-60">{label}</span>
      <span className="text-emerald-400">{value} / {total}</span>
    </div>
    <div className="h-1 bg-emerald-950 rounded-full overflow-hidden">
      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
    </div>
  </div>
);

export default DevDashboard;
