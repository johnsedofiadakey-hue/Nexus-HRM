import { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import api from '../services/api';
import { Target, Lock, Clock, AlertTriangle } from 'lucide-react';
import UpdateProgressModal from '../components/UpdateProgressModal'; 
import { getStoredUser } from '../utils/session';

interface KpiItem {
  id: string;
  category: string;
  description: string;
  name?: string;
  weight: number;
  targetValue: number;
  actualValue: number;
  score: number | null;
}

interface KpiSheet {
  id: string;
  title: string;
  month: number;
  year: number;
  status: string;
  totalScore: number | null;
  isLocked: boolean;
  items: KpiItem[];
}

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const normalizeSheet = (sheet: any): KpiSheet => ({
  id: String(sheet?.id || ''),
  title: String(sheet?.title || 'Performance Sheet'),
  month: Number(sheet?.month || new Date().getMonth() + 1),
  year: Number(sheet?.year || new Date().getFullYear()),
  status: String(sheet?.status || 'DRAFT'),
  totalScore: typeof sheet?.totalScore === 'number' ? sheet.totalScore : null,
  isLocked: Boolean(sheet?.isLocked),
  items: toArray<KpiItem>(sheet?.items).map((item: any) => ({
    id: String(item?.id || ''),
    category: String(item?.category || 'General'),
    description: String(item?.description || item?.name || 'Performance goal'),
    name: item?.name ? String(item.name) : undefined,
    weight: Number(item?.weight || 0),
    targetValue: Number(item?.targetValue || 0),
    actualValue: Number(item?.actualValue || 0),
    score: typeof item?.score === 'number' ? item.score : null,
  })),
});

const Performance = () => {
  const [sheets, setSheets] = useState<KpiSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheet, setSelectedSheet] = useState<KpiSheet | null>(null);

  // State to control the popup
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    fetchMyPerformance();
  }, []);

  const fetchMyPerformance = async () => {
    try {
      const res = await api.get('/kpi/my-sheets');
      const payload = res.data;
      const rawSheets = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
      const sheetData = rawSheets.map(normalizeSheet);
      setSheets(sheetData);
      setSelectedSheet(sheetData.length ? sheetData[0] : null);
    } catch (error) {
      toast.error('Failed to load performance metrics. Our servers might be experiencing a delay.');
      setSheets([]);
      setSelectedSheet(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-slate-400">
      <div className="animate-pulse">Loading your metrics...</div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 animate-in fade-in duration-500 min-h-[70vh]">

      {/* LEFT COLUMN: List of Months */}
      <div className="w-full lg:w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[40vh] lg:max-h-[72vh]">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-700 flex items-center">
            <Clock className="mr-2" size={18} /> History
          </h2>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {(sheets || []).length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Clock size={32} className="mx-auto mb-2 opacity-20" />
              <p>No performance sheets assigned yet.</p>
            </div>
          ) : (
            (sheets || []).map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => setSelectedSheet(sheet)}
                className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${selectedSheet?.id === sheet.id
                  ? 'bg-nexus-50 border-nexus-200 shadow-sm ring-1 ring-nexus-200'
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                  }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${sheet.status === 'LOCKED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {sheet.status}
                  </span>
                  {sheet.isLocked && <Lock size={14} className="text-slate-400" />}
                </div>
                <h3 className="font-bold text-slate-800 truncate">{sheet.title}</h3>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-slate-500">
                    {new Date(0, sheet.month - 1).toLocaleString('default', { month: 'short' })} {sheet.year}
                  </p>
                  <p className="text-sm font-bold text-nexus-600">
                    {sheet.totalScore ? sheet.totalScore.toFixed(1) : 0}%
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: The Details */}
      <div className="w-full lg:w-2/3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col relative min-h-[48vh]">
        {/* Performance Entry Point for Managers */}
        {(getStoredUser()?.role === 'MD' || getStoredUser()?.role === 'MANAGER' || getStoredUser()?.role === 'DIRECTOR') && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Target size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Team Performance Management</p>
                <p className="text-xs text-slate-500">Assign and review KPI targets for your direct reports.</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.href = '/team'}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Set Team KPIs
            </button>
          </div>
        )}

        {selectedSheet ? (
          <>
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-3 bg-slate-50 rounded-t-xl">
              <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-800">{selectedSheet.title}</h1>
                <p className="text-xs md:text-sm text-slate-500">
                  Target Period: {new Date(0, selectedSheet.month - 1).toLocaleString('default', { month: 'long' })} {selectedSheet.year}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-nexus-600">
                  {selectedSheet.totalScore ? selectedSheet.totalScore.toFixed(1) : 0}%
                </div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Score</p>
              </div>
            </div>

            {/* Scrollable Items List */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {(selectedSheet?.items || []).map((item, idx) => {
                  if (!item) return null;
                  return (
                    <div key={item?.id || idx} className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                            {item?.category || 'General'}
                          </span>
                          <p className="font-bold text-slate-800 mt-2 text-base md:text-lg">{item?.description || item?.name || 'Performance goal'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium text-slate-500">Weight</span>
                          <p className="font-bold text-slate-700">{item?.weight || 0}%</p>
                        </div>
                      </div>

                      {/* Progress Bar Area */}
                      <div className="bg-slate-50 p-3 rounded-lg mt-2">
                        <div className="flex justify-between text-xs md:text-sm mb-1">
                          <span className="text-slate-500 font-medium">Progress</span>
                          <span className="font-bold text-slate-700">
                            {item?.actualValue || 0} <span className="text-slate-400 font-normal">/ {item?.targetValue || 0}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${((item?.actualValue || 0) / (item?.targetValue || 1)) >= 1 ? 'bg-green-500' : 'bg-nexus-500'
                                }`}
                              style={{ width: `${Math.min(((item?.actualValue || 0) / (item?.targetValue || 1)) * 100, 100)}%` }}
                            />
                          </div>
                          <div className="text-sm font-bold text-nexus-600 min-w-[40px] text-right">
                            {item?.score ? item.score.toFixed(1) : 0} pts
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-end gap-3 bg-white rounded-b-xl">
              {selectedSheet.isLocked ? (
                <div className="flex items-center text-slate-500 text-sm bg-slate-100 px-4 py-2 rounded-lg">
                  <Lock size={16} className="mr-2" />
                  {selectedSheet.status === 'LOCKED' ? 'Approved & Locked' : 'Sheet is locked by policy.'}
                </div>
              ) : selectedSheet.status === 'PENDING_APPROVAL' ? (
                <div className="flex items-center text-amber-600 text-sm bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                  <AlertTriangle size={16} className="mr-2" />
                  Waiting for Manager Approval
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditOpen(true)}
                    className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-lg font-bold transition-all"
                  >
                    Update Progress
                  </button>

                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to submit this for review? You won't be able to edit it until your manager approves or rejects it.")) {
                        try {
                          await api.patch('/kpi/update-progress', { sheetId: selectedSheet.id, items: [], submit: true });
                          fetchMyPerformance();
                        } catch (error) {
                          console.error(error);
                          toast.info("Failed to submit");
                        }
                      }
                    }}
                    className="w-full sm:w-auto bg-nexus-600 hover:bg-nexus-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-nexus-500/30 transition-all active:scale-95 flex items-center justify-center"
                  >
                    Submit for Review
                  </button>
                </>
              )}
            </div>

            {/* THE MODAL POPUP */}
            {isEditOpen && (
              <UpdateProgressModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                sheet={selectedSheet}
                onSuccess={() => {
                  fetchMyPerformance(); // Refresh data to see new scores immediately
                }}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Target size={64} className="mb-4 opacity-10" />
            <p className="font-medium">Select a performance sheet to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Performance;
