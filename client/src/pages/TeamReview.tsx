import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, PlusCircle, CheckCircle } from 'lucide-react';
import AssignKpiModal from '../components/AssignKpiModal';
import ReviewKpiModal from '../components/ReviewKpiModal';

interface Employee {
  id: string;
  fullName: string;
  jobTitle: string;
  avatarUrl: string | null;
  kpiSheets: { id: string; totalScore: number | null; status: string }[];
}

const TeamReview = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTeam();
  }, []);

  const fetchMyTeam = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('nexus_user') || '{}');
      const supervisorId = currentUser?.id;

      if (!supervisorId) {
        setEmployees([]);
        return;
      }

      const res = await api.get('/team/list', { params: { supervisorId } });
      const data = res.data || [];

      const mapped: Employee[] = data.map((emp: any) => {
        const hasSheets = Array.isArray(emp.kpiSheets) && emp.kpiSheets.length > 0;
        const fallbackSheets = typeof emp.lastScore === 'number'
          ? [{
            id: emp.lastSheetId || `latest-${emp.id}`,
            totalScore: emp.lastScore,
            status: emp.status === 'On Track' ? 'LOCKED' : emp.status === 'Needs Attention' ? 'PENDING_APPROVAL' : 'NO_GOALS'
          }]
          : [];

        return {
          id: emp.id,
          fullName: emp.fullName || emp.name || 'Unknown',
          jobTitle: emp.jobTitle || emp.role || 'Staff',
          avatarUrl: emp.avatarUrl || emp.avatar || null,
          kpiSheets: hasSheets ? emp.kpiSheets : fallbackSheets
        };
      });

      setEmployees(mapped);
    } catch (err) {
      console.error(err);
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

  if (loading) {
    return <div className="p-6 text-slate-400">Loading team data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team Performance</h1>
          <p className="text-slate-500">Assign targets and review progress for your reports.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm font-medium text-slate-600">
          Total Staff: <span className="text-nexus-600 font-bold ml-1">{employees.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp) => {
          const lastSheet = emp.kpiSheets[0];
          const score = lastSheet?.totalScore || 0;
          const status = lastSheet?.status || 'NO_GOALS';
          const sheetId = lastSheet?.id;

          return (
            <div key={emp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt={emp.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xl">
                          {emp.fullName[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 leading-tight">{emp.fullName}</h3>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">{emp.jobTitle}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  {status === 'NO_GOALS' ? (
                    <div className="bg-slate-50 p-3 rounded-lg text-center border border-dashed border-slate-300">
                      <p className="text-sm text-slate-500 italic">No goals assigned for this month</p>
                    </div>
                  ) : (
                    <div className={`rounded-lg p-4 flex items-center justify-between border ${
                      status === 'PENDING_APPROVAL' ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-100' : 'bg-nexus-50 border-nexus-100'
                    }`}>
                      <div>
                        <p className="text-xs font-bold text-nexus-600 uppercase mb-1">Current Score</p>
                        <span className="text-2xl font-bold text-slate-800">{score ? score.toFixed(1) : 0}%</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        status === 'LOCKED' ? 'bg-green-200 text-green-800'
                          : status === 'PENDING_APPROVAL' ? 'bg-amber-200 text-amber-800 animate-pulse'
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        {status.replace('_', ' ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOpenAssign(emp)}
                  className="flex items-center justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <PlusCircle size={16} className="mr-2 text-nexus-600" /> Assign Goals
                </button>

                {status === 'PENDING_APPROVAL' && sheetId ? (
                  <button
                    onClick={() => handleOpenReview(emp, sheetId)}
                    className="flex items-center justify-center px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/20"
                  >
                    <CheckCircle size={16} className="mr-2" /> Review
                  </button>
                ) : (
                  <button className="flex items-center justify-center px-4 py-2 bg-nexus-600 text-white rounded-lg text-sm font-bold hover:bg-nexus-700 transition-colors shadow-md shadow-nexus-500/20">
                    View History
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {employees.length === 0 && !loading && (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <Users size={48} className="mx-auto mb-3 opacity-20" />
            <p>No team members found.</p>
          </div>
        )}
      </div>

      {selectedEmployee && (
        <AssignKpiModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          onSuccess={() => {
            fetchMyTeam();
          }}
        />
      )}

      {selectedEmployee && selectedSheetId && (
        <ReviewKpiModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          sheetId={selectedSheetId}
          employeeName={selectedEmployee.name}
          onSuccess={() => fetchMyTeam()}
        />
      )}
    </div>
  );
};

export default TeamReview;