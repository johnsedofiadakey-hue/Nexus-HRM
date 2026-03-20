import React, { useEffect, useState } from 'react';
import { Target, Plus } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/common/PageHeader';
import TargetCard from '../../components/performance/TargetCard';
import { AnimatePresence } from 'framer-motion';
import { getStoredUser } from '../../utils/session';
import EmptyState from '../../components/common/EmptyState';
import TargetCascadeModal from '../../components/performance/TargetCascadeModal';

const TargetDashboard: React.FC = () => {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DEPARTMENT' | 'INDIVIDUAL'>('ALL');
  const [cascadeTarget, setCascadeTarget] = useState<any | null>(null);
  const user = getStoredUser();

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/targets');
      setTargets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to sync mission targets.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (targetId: string, status: string, message?: string) => {
    try {
      await api.post(`/targets/${targetId}/acknowledge`, { status, message });
      toast.success(status === 'ACKNOWLEDGED' ? 'Mission acknowledged' : 'Clarification requested');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const handleUpdateProgress = async (targetId: string, updates: any[], submit: boolean) => {
    try {
      await api.post(`/targets/${targetId}/progress`, { updates, submit });
      toast.success(submit ? 'Progress submitted for review' : 'Progress saved');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  const handleReview = async (targetId: string, approved: boolean, feedback?: string) => {
    try {
      await api.post(`/targets/${targetId}/review`, { approved, feedback });
      toast.success(approved ? 'Target approved' : 'Target returned for correction');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Review failed');
    }
  };

  const filteredTargets = targets.filter(t => {
    if (filter === 'ALL') return true;
    return t.level === filter;
  });

  if (loading) return <div className="p-20 text-center text-slate-500 animate-pulse uppercase tracking-[0.3em] font-black text-[10px]">Synchronizing Performance Matrix...</div>;

  return (
    <div className="space-y-8 page-enter pb-20">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Mission Control" 
          description="Manage departmental goals and individual tactical targets."
          icon={Target}
          variant="indigo"
        />
        <div className="flex gap-4">
          <div className="flex bg-slate-900/40 p-1 rounded-xl border border-white/5">
             {(['ALL', 'DEPARTMENT', 'INDIVIDUAL'] as const).map(f => (
               <button
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
               >
                 {f}
               </button>
             ))}
          </div>
          {user.role === 'ADMIN' && (
             <button className="btn-primary rounded-xl px-6 py-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
               <Plus size={16} /> New Goal
             </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTargets.length > 0 ? (
            filteredTargets.map(t => (
              <TargetCard 
                key={t.id} 
                target={t} 
                onAcknowledge={(status, msg) => handleAcknowledge(t.id, status, msg)}
                onUpdateProgress={(updates, submit) => handleUpdateProgress(t.id, updates, submit)}
                onReview={(approved, fb) => handleReview(t.id, approved, fb)}
                isReviewer={t.reviewerId === user.id}
              />
            ))
          ) : (
            <div className="col-span-full">
               <EmptyState 
                 title="No Targets Identified"
                 description="No performance targets found for the selected filter. Check with HQ for mission alignment."
                 icon={Target}
               />
            </div>
          )}
        </AnimatePresence>
      </div>

      {cascadeTarget && (
        <TargetCascadeModal 
          target={cascadeTarget} 
          onClose={() => setCascadeTarget(null)} 
          onSuccess={() => { setCascadeTarget(null); fetchTargets(); }}
        />
      )}
    </div>
  );
};

export default TargetDashboard;
