import { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, PlusCircle, CheckCircle, Target, AlertCircle, History, ShieldCheck } from 'lucide-react';
import AssignKpiModal from '../components/AssignKpiModal';
import ReviewKpiModal from '../components/ReviewKpiModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';
import PageHeader from '../components/common/PageHeader';
import FlowSteps from '../components/common/FlowSteps';
import EmptyState from '../components/common/EmptyState';

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
  const currentUser = getStoredUser();
  const canManageTeam = getRankFromRole(currentUser.role) >= 60;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptKpis, setDeptKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  useEffect(() => {
    if (canManageTeam) fetchData();
    else setLoading(false);
  }, [canManageTeam]);

  const fetchData = async () => {
    try {
      const u = getStoredUser();
      if (!u?.id) { setEmployees([]); return; }

      const [teamRes, kpiRes] = await Promise.all([
        api.get('/team/list', { params: { supervisorId: u.id } }),
        u.departmentId ? api.get('/kpi/department', { params: { departmentId: u.departmentId } }) : Promise.resolve({ data: { data: [] } })
      ]);

      const list = (Array.isArray(teamRes.data) ? teamRes.data : []) as any[];
      setDeptKpis(Array.isArray(kpiRes.data?.data) ? kpiRes.data.data : []);

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
    } catch (err) { 
      console.error('[TeamReview] fetchData error:', err);
      setEmployees([]); 
    } finally { 
      setLoading(false); 
    }
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
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Syncing team strategy...</p>
    </div>
  );

  if (!canManageTeam) return (
    <div className="glass p-20 text-center border-white/[0.05] rounded-[2rem] mt-10">
      <AlertCircle size={48} className="mx-auto mb-6 opacity-10 text-slate-300" />
      <h2 className="text-xl font-bold text-slate-400 mb-2 font-display uppercase tracking-tight">Access Denied</h2>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 max-w-sm mx-auto leading-relaxed">Management access is required to set team strategy.</p>
    </div>
  );

  return (
    <div className="space-y-10 page-enter min-h-screen pb-20">
      <PageHeader 
        title="Team Operational KPIs"
        description="Deconstruct departmental strategic mandates into actionable team targets. Assign specific goals to your direct reports."
        icon={Users}
        variant="indigo"
      />

      <FlowSteps 
        currentStep={2}
        variant="indigo"
        steps={[
          { id: 1, label: 'Department KPI', description: 'Strategic Mandate' },
          { id: 2, label: 'Team Targets', description: 'Operational Decomp' },
          { id: 3, label: 'Member Execution', description: 'Individual Focus' },
        ]}
      />

      {/* Strategic Intent Architecture */}
      <AnimatePresence>
        {deptKpis.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Target size={120} className="text-emerald-500" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">Departmental Strategic KPI Mandates</h2>
                  <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mt-0.5">Directives set by Managing Director / HQ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {deptKpis.map((kpi: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:border-emerald-500/30 transition-all">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1">{kpi.title}</p>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">{kpi.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and description removed as they are now in PageHeader */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {employees.length === 0 ? (
          <div className="col-span-full">
            <EmptyState 
              title="No Team Members Found"
              description="You do not have any direct reports assigned. Team targets can only be set for employees under your supervision."
              icon={Users}
              variant="slate"
              action={{
                label: "View Labor Force",
                onClick: () => window.location.href = '/employees',
                icon: Users
              }}
            />
          </div>
        ) : (
          employees.map((emp) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative"
            >
              <div className="glass p-8 rounded-[2.5rem] border-white/[0.05] hover:border-primary/30 transition-all duration-500 flex flex-col h-full bg-[#0d1225]/40 backdrop-blur-3xl">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden shadow-2xl shadow-primary/5">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt={emp.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="text-primary-light" size={24} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">{emp.fullName}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{emp.jobTitle}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-6 mb-8">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Execution Level</span>
                      {emp.kpiSheets.length > 0 && (
                        <span className="text-xs font-black text-primary-light">
                          {emp.kpiSheets[0].totalScore?.toFixed(1) || '0.0'}%
                        </span>
                      )}
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(emp.kpiSheets[0]?.totalScore || 0, 100)}%` }}
                        className="h-full bg-gradient-to-r from-primary via-primary-light to-accent rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {emp.kpiSheets.length > 0 ? (
                      <div className={cn(
                        "px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                        statusColors[emp.kpiSheets[0].status] || statusColors.NO_GOALS
                      )}>
                        {emp.kpiSheets[0].status === 'LOCKED' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {emp.kpiSheets[0].status.replace('_', ' ')}
                      </div>
                    ) : (
                      <div className={cn("px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2", statusColors.NO_GOALS)}>
                        <AlertCircle size={10} /> NO MISSION SET
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleOpenAssign(emp)}
                    className="flex-1 py-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary-light text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all duration-300 shadow-lg shadow-primary/5 group/btn"
                  >
                    <PlusCircle size={14} className="inline mr-2 group-hover/btn:rotate-90 transition-transform" />
                    Set Operational KPIs
                  </button>
                  {emp.kpiSheets.length > 0 && (
                    <button 
                      onClick={() => handleOpenReview(emp, emp.kpiSheets[0].id)}
                      className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-slate-400 flex items-center justify-center hover:bg-white/[0.08] hover:text-white transition-all shadow-xl group/rev"
                    >
                      <History size={20} className="group-hover/rev:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AssignKpiModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        employeeId={selectedEmployee?.id || ''}
        employeeName={selectedEmployee?.name || ''}
        onSuccess={fetchData}
      />

      {selectedSheetId && (
        <ReviewKpiModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          sheetId={selectedSheetId}
          employeeName={selectedEmployee?.name || ''}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default TeamReview;
