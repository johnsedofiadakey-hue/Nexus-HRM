import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserX, Package, FileText, CheckCircle2,
  ArrowRight, Shield, AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import api from '../services/api';
import { getStoredUser } from '../utils/session';

const Offboarding = () => {
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();
  const isHR = (user?.rank || 0) >= 70;

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/offboarding/list');
      setProcesses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { label: 'Initiation', icon: UserX, description: 'Formal exit request logged.' },
    { label: 'Asset Return', icon: Package, description: 'Laptops, cards, and keys.' },
    { label: 'Interview', icon: FileText, description: 'Exit feedback session.' },
    { label: 'Clearance', icon: CheckCircle2, description: 'Final dues and deactivation.' },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Separation <span className="text-[var(--primary)]">Manager</span>
          </h1>
          <p className="text-[var(--text-muted)] mt-2 font-medium">Handle employee exits with dignity and compliance.</p>
        </div>
        {isHR && (
          <button className="px-6 py-3 rounded-2xl bg-[var(--primary)] text-white font-black text-sm hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all flex items-center gap-2">
            <UserX size={18} />
            Initiate Exit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Progress Tracker Placeholder */}
        <div className="lg:col-span-3 space-y-8">
          <div className="p-8 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden">
             <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
               {steps.map((step, i) => (
                 <div key={i} className="flex flex-col items-center text-center gap-4 group flex-1">
                   <div className={cn(
                     "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500",
                     i === 0 ? "bg-[var(--primary)] text-white shadow-lg scale-110" : "bg-[var(--bg-sidebar-active)] text-[var(--text-muted)] opacity-50"
                   )}>
                     <step.icon size={28} />
                   </div>
                   <div>
                     <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--text-primary)]">{step.label}</p>
                     <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1 max-w-[120px]">{step.description}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Active Separation List */}
          <div className="space-y-6">
            <h2 className="text-xl font-black text-[var(--text-primary)]">Ongoing Separations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {loading ? (
                 <div className="col-span-2 py-10 text-center animate-pulse text-[var(--text-muted)] font-bold italic tracking-widest">LOADING CLEARANCE DATA...</div>
               ) : processes.length === 0 ? (
                 <div className="col-span-2 p-12 rounded-[2rem] bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-center">
                    <p className="text-[var(--text-muted)] font-medium">No active offboarding processes found.</p>
                 </div>
               ) : (
                 processes.map((p) => (
                   <motion.div
                    key={p.id}
                    whileHover={{ scale: 1.02 }}
                    className="p-6 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all cursor-pointer shadow-lg group"
                   >
                     <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center font-bold text-slate-500">
                           {p.employee?.fullName?.[0]}
                         </div>
                         <div>
                           <p className="text-sm font-black text-[var(--text-primary)]">{p.employee?.fullName}</p>
                           <p className="text-[10px] text-[var(--text-muted)] font-bold">{p.employee?.employeeCode}</p>
                         </div>
                       </div>
                       <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-widest">{p.status}</span>
                     </div>
                     <div className="space-y-3">
                       <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                         <span>Exit Progress</span>
                         <span>25%</span>
                       </div>
                       <div className="h-1.5 rounded-full bg-[var(--bg-sidebar-active)] overflow-hidden">
                         <div className="h-full bg-[var(--primary)] w-1/4 rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
                       </div>
                     </div>
                   </motion.div>
                 ))
               )}
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
           <div className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
             <div className="relative z-10">
               <Shield className="text-amber-400 mb-4" size={32} />
               <h3 className="font-black text-lg">Knowledge Transfer</h3>
               <p className="text-white/60 text-xs mt-2 leading-relaxed">Ensure all repositories, credentials, and documentation are handed over before the final clearance.</p>
               <button className="mt-6 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-xs font-black flex items-center justify-center gap-2">
                 Compliance Checklist <ArrowRight size={14} />
               </button>
             </div>
             <Shield size={100} className="absolute bottom-[-20px] left-[-20px] text-white/5 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-700" />
           </div>

           <div className="p-6 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-subtle)]">
             <h3 className="font-black text-[var(--text-primary)] mb-4 flex items-center gap-2 text-sm">
               <AlertCircle size={16} className="text-red-500" />
               Critical Reminders
             </h3>
             <ul className="space-y-3">
               {[
                 'Revoke VPN Access',
                 'Disable SSO / G-Suite',
                 'Final PAYE Settlement',
                 'Return Office Keys'
               ].map((item, i) => (
                 <li key={i} className="flex items-center gap-3 text-xs font-medium text-[var(--text-muted)] py-2 border-b border-[var(--border-subtle)] last:border-0">
                   <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                   {item}
                 </li>
               ))}
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Offboarding;
