import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Award, ChevronRight, Clock, Plus } from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import PageHeader from '../components/common/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import EmptyState from '../components/common/EmptyState';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getStoredUser, getRankFromRole } from '../utils/session';

const Appraisals: React.FC = () => {
  const { t } = useTranslation();
  const [packets, setPackets] = useState<any[]>([]);
  const [finalPackets, setFinalPackets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const navigate = useNavigate();
  const user = getStoredUser();
  const rank = getRankFromRole(user?.role);

  useEffect(() => { 
    fetchPackets(); 
    if (rank >= 90) fetchFinalPackets();
  }, []);

  const fetchPackets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appraisals/my-packets');
      setPackets(Array.isArray(res.data) ? res.data.filter((p: any) => p.status !== 'CANCELLED') : []);
    } catch {
      toast.error(t('appraisals.sync_error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchFinalPackets = async () => {
    try {
      setLoadingFinal(true);
      const res = await api.get('/appraisals/final-sign-off-list');
      setFinalPackets(Array.isArray(res.data) ? res.data : []);
    } catch {
      console.error('Failed to fetch final verdict list');
    } finally {
      setLoadingFinal(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      <p className="text-[12px] font-medium text-[var(--text-muted)]">{t('appraisals.loading')}</p>
    </div>
  );

  return (
    <div className="space-y-8 page-enter pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader
          title={t('appraisals.title')}
          description={t('appraisals.subtitle')}
          icon={Award}
        />

        {rank >= 90 && (
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/reviews/cycles')}
            className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs flex-shrink-0"
          >
            <Plus size={18} /> {t('appraisals.initiate_cycle')}
          </motion.button>
        )}
      </div>
      
      {rank >= 90 && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/5">
                <Award size={20} />
             </div>
             <div>
                <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">{t('appraisals.executive_threshold')}</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{t('appraisals.awaiting_verdict')}</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
               {finalPackets.length > 0 ? (
                 finalPackets.map((packet) => (
                    <motion.div
                     key={`final-${packet.id}`}
                     layout
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     onClick={() => navigate(`/reviews/packet/${packet.id}`)}
                     className="nx-card p-6 cursor-pointer group hover:border-[var(--primary)]/30 bg-[var(--bg-card)] border-[var(--border-subtle)] transition-all relative overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 px-4 py-2 bg-[var(--primary)] text-white text-[8px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg">{t('appraisals.verdict_pending')}</div>
                     
                     <div className="flex items-center gap-4 mb-6">
                       <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center shadow-sm border border-[var(--border-subtle)]">
                          {packet.employee?.avatarUrl ? (
                            <img src={packet.employee.avatarUrl} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-[var(--primary)]">{packet.employee?.fullName?.[0]}</div>
                          )}
                       </div>
                       <div>
                          <p className="text-sm font-black text-[var(--text-primary)]">{packet.employee?.fullName}</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{packet.cycle?.title}</p>
                       </div>
                     </div>

                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                        <span>{t('appraisals.open_review')}</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                   </motion.div>
                 ))
               ) : !loadingFinal && (
                 <div className="col-span-full p-12 rounded-[2.5rem] bg-[var(--bg-elevated)] border border-dashed border-[var(--border-subtle)] text-center">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{t('appraisals.queue_clear')}</p>
                 </div>
               )}
            </AnimatePresence>
          </div>
        </section>
      )}

      <div className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20">
                <ClipboardCheck size={20} />
             </div>
             <div>
                <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">{t('appraisals.staff_reviews')}</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{t('appraisals.role_reviews')}</p>
             </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {packets.length > 0 ? (
            packets.map((packet) => (
              <motion.div
                key={packet.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate(`/reviews/packet/${packet.id}`)}
                className="nx-card p-8 cursor-pointer group hover:border-[var(--primary)]/30 transition-all"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 text-[var(--primary)]">
                    <ClipboardCheck size={24} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border",
                    packet.status === 'COMPLETED'
                      ? "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20"
                      : "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20"
                  )}>
                    {packet.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight group-hover:text-[var(--primary)] transition-colors">
                  {packet.cycle?.title}
                </h3>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">
                  {packet.cycle?.startDate ? new Date(packet.cycle.startDate).toLocaleDateString() : ''} - {packet.cycle?.endDate ? new Date(packet.cycle.endDate).toLocaleDateString() : ''}
                </p>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-6">
                  {t('appraisals.stage')}: {t(`appraisals.stages.${packet.currentStage}`, { defaultValue: packet.currentStage.replace(/_/g, ' ') })}
                </p>

                <div className="pt-6 border-t border-[var(--border-subtle)] flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <Clock size={14} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                      {format(new Date(packet.createdAt), 'MMM yyyy')}
                    </span>
                  </div>
                  <div className="text-[var(--primary)] group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                title={rank >= 80 ? t('appraisals.no_active_admin') : t('appraisals.no_active_title')}
                description={rank >= 80 
                  ? t('appraisals.no_active_admin_desc')
                  : t('appraisals.no_active_desc')}
                icon={Award}
                action={rank >= 90 ? {
                  label: t('appraisals.initiate_primary'),
                  onClick: () => navigate('/reviews/cycles')
                } : undefined}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
     </div>
    </div>
  );
};

export default Appraisals;
