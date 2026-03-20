import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Award, Target, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { toast } from '../utils/toast';
import PageHeader from '../components/common/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import EmptyState from '../components/common/EmptyState';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Appraisals: React.FC = () => {
  const [packets, setPackets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPackets();
  }, []);

  const fetchPackets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appraisals/my-packets');
      setPackets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to sync appraisal history.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-500">Synchronizing Personal Performance...</div>;

  return (
    <div className="space-y-8 page-enter pb-20">
      <PageHeader 
        title="Performance History"
        description="Track your personal growth and historical appraisal cycles."
        icon={Award}
        variant="purple"
      />

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
                className="glass p-6 rounded-[2rem] border-white/5 bg-slate-900/40 hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary-light">
                    <ClipboardCheck size={20} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                    packet.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {packet.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{packet.cycle?.title}</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Stage: {packet.currentStage.replace(/_/g, ' ')}</p>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {format(new Date(packet.createdAt), 'MMM yyyy')}
                    </span>
                  </div>
                  <div className="text-primary-light group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState 
                title="No Active Appraisal Identified"
                description="You are currently not part of an active evaluation cycle. You will be notified when one begins."
                icon={Target}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Appraisals;
