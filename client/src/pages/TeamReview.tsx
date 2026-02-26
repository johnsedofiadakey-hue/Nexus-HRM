import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, PlusCircle, CheckCircle, Target, TrendingUp, AlertCircle, History } from 'lucide-react';
import AssignKpiModal from '../components/AssignKpiModal';
import ReviewKpiModal from '../components/ReviewKpiModal';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface Employee {
  id: string;
  fullName: string;
  jobTitle: string;
  avatarUrl: string | null;
  kpiSheets: { id: string; totalScore: number | null; status: string }[];
}

const statusColors: Record<string, string> = {
  NO_GOALS: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  LOCKED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const TeamReview = () => {
  const currentUser = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const canManageTeam = ['SUPERVISOR', 'MD', 'HR_ADMIN'].includes(currentUser.role);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  useEffect(() => {
    if (canManageTeam) fetchMyTeam();
    else setLoading(false);
  }, [canManageTeam]);

  const fetchMyTeam = async () => {
    try {
      const u = JSON.parse(localStorage.getItem('nexus_user') || '{}');
      if (!u?.id) { setEmployees([]); return; }
      const res = await api.get('/team/list', { params: { supervisorId: u.id } });
      const list = (res.data || []) as any[];

      const mapped: Employee[] = list.map(emp => {
        const hasSheets = Array.isArray(emp.kpiSheets) && emp.kpiSheets.length;
        const fallbackSheets = typeof emp.lastScore === 'number' ? [{
          id: emp.lastSheetId || `latest-${emp.id}`,
          totalScore: emp.lastScore,
          status: emp.status === 'On Track' ? 'LOCKED' : emp.status === 'Needs Attention' ? 'PENDING_APPROVAL' : 'NO_GOALS'
        }] : [];
        return {
          id: emp.id || 'unknown',
          fullName: emp.fullName || emp.name || 'Unknown Employee',
          jobTitle: emp.jobTitle || emp.role || 'Unassigned',
          avatarUrl: emp.avatarUrl || emp.avatar || null,
          kpiSheets: hasSheets ? emp.kpiSheets : fallbackSheets
        };
      });
      setEmployees(mapped);
    } catch (err) { console.error(err); setEmployees([]); }
    finally { setLoading(false); }
  };

  const handleOpenAssign = (emp: Employee) => {
    setSelectedEmployee({ id: emp.id, name: emp.fullName });
    setIsModalOpen(true);
  };
  const handleOpenReview = (emp: Employee, sheetId: string) => {
    setSelectedEmployee({ id: emp.id, name: emp.fullName });
    setSelectedSheetId(sheetId);
    setIsReviewOpen(true);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Target size={32} className="animate-spin text-primary-light" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading team data...</p>
    </div>
  );

  if (!canManageTeam) return (
    <div className="glass p-20 text-center border-white/[0.05] rounded-[2rem] mt-10">
      <AlertCircle size={48} className="mx-auto mb-6 opacity-10 text-slate-300" />
      <h2 className="text-xl font-bold text-slate-400 mb-2 font-display uppercase tracking-tight">Access Denied</h2>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 max-w-sm mx-auto leading-relaxed">Manager or HR access is required to view team performance.</p>
    </div>
  );

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Team Review</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <TrendingUp size={14} className="text-primary-light" />
            Track team performance and set goals
          </p>
        </div>
        <div className="glass px-6 py-4 rounded-2xl flex items-center gap-4 border-white/[0.05]">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team Size</span>
          <span className="text-xl font-black text-white font-display border-l border-white/10 pl-4">{employees.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {employees.length === 0 ? (
           <div className="col-span-full glass p-20 text-center border-white/[0.05] rounded-[2rem]">
              <Users size={48} className="mx-auto mb-6 opacity-10 text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No Team Members Found</p>
           </div>
        ) : (
          employees.map((emp, idx) => {
            const sheet = emp.kpiSheets[0];
            const score = sheet?.totalScore || 0;
            const status = sheet?.status || 'NO_GOALS';
            const initials = emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={emp.id} 
                className="glass rounded-[2rem] border-white/[0.05] bg-[#0a0f1e]/20 hover:bg-[#0a0f1e]/40 transition-colors flex flex-col overflow-hidden relative group"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                   <Target size={80} className="text-white" />
                </div>
                
                <div className="p-8 pb-6 flex-grow relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-slate-500/80 to-slate-500 flex items-center justify-center border border-white/10 shadow-lg text-lg font-black text-white">
                      {emp.avatarUrl ? <img src={emp.avatarUrl} alt="" className="w-full h-full rounded-[1.25rem] object-cover" /> : initials}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-lg text-white leading-tight mb-1">{emp.fullName}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{emp.jobTitle}</p>
                    </div>
                  </div>

                  {status === 'NO_GOALS' ? (
                    <div className="p-5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center text-center">
                       <AlertCircle size={20} className="text-slate-600 mb-2" />
                       <p className="text-[10px] font-black tracking-widest uppercase text-slate-500">No Goals Set</p>
                    </div>
                  ) : (
                    <div className={cn("p-5 rounded-2xl border flex items-center justify-between", status === 'PENDING_APPROVAL' ? "bg-amber-500/5 border-amber-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
                      <div>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", status === 'PENDING_APPROVAL' ? "text-amber-500/70" : "text-emerald-500/70")}>Current Score</p>
                        <span className={cn("text-3xl font-black font-display leading-none", status === 'PENDING_APPROVAL' ? "text-amber-400" : "text-emerald-400")}>{score.toFixed(1)}<span className="text-sm text-slate-500">%</span></span>
                      </div>
                      <span className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border", statusColors[status])}>
                         {status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 border-t border-white/[0.05] divide-x divide-white/[0.05] bg-white/[0.01]">
                   <button
                     onClick={() => handleOpenAssign(emp)}
                     className="py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/[0.03] hover:text-white transition-colors"
                   >
                     <PlusCircle size={14} className="text-primary-light" /> Assign Goal
                   </button>
                   
                   {status === 'PENDING_APPROVAL' && sheet?.id ? (
                     <button
                       onClick={() => handleOpenReview(emp, sheet.id)}
                       className="py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors shadow-inner shadow-amber-500/20"
                     >
                       <CheckCircle size={14} /> Review Goals
                     </button>
                   ) : (
                     <button className="py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white/[0.03] hover:text-white transition-colors">
                       <History size={14} className={status === 'NO_GOALS' ? 'text-slate-600' : 'text-emerald-500'} /> History
                     </button>
                   )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {selectedEmployee && (
        <AssignKpiModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} employeeId={selectedEmployee.id} employeeName={selectedEmployee.name} onSuccess={() => fetchMyTeam()} />
      )}

      {selectedEmployee && selectedSheetId && (
        <ReviewKpiModal isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} sheetId={selectedSheetId} employeeName={selectedEmployee.name} onSuccess={() => fetchMyTeam()} />
      )}
    </div>
  );
};

export default TeamReview;