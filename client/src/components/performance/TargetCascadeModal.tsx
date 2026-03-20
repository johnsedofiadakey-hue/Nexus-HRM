import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, Save } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

interface Props {
  target: any;
  onClose: () => void;
  onSuccess: () => void;
}

const TargetCascadeModal: React.FC<Props> = ({ target, onClose, onSuccess }) => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/team/staff');
      setStaff(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load team roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleCascade = async () => {
    const activeAssignments = Object.entries(assignments)
      .filter(([_, weight]) => weight > 0)
      .map(([id, weight]) => ({ staffId: id, weightRatio: weight / 100 }));

    if (activeAssignments.length === 0) {
      toast.error('Select at least one staff member to cascade.');
      return;
    }

    try {
      await api.post(`/targets/${target.id}/cascade`, { assignments: activeAssignments });
      toast.success('Strategy cascaded to operational levels.');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Cascade failed');
    }
  };

  const filteredStaff = staff.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-[#0d1225] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-white/5 bg-primary/5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 text-primary-light">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">Cascade Strategy</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Operational Decomposition: {target.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
               type="text" 
               placeholder="Search staff members..." 
               className="glass-input w-full pl-12"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-slate-500 animate-pulse text-[10px] uppercase font-black tracking-widest">Syncing Roster...</div>
            ) : filteredStaff.map(member => (
              <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 font-black text-[10px]">
                   {member.fullName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{member.fullName}</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{member.jobTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                   <input 
                     type="number" 
                     placeholder="%" 
                     className="w-16 h-10 glass-input text-center text-xs"
                     value={assignments[member.id] || ''}
                     onChange={(e) => setAssignments({ ...assignments, [member.id]: parseFloat(e.target.value) || 0 })}
                   />
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">% Weight</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-white/5 flex gap-4">
           <button 
             onClick={onClose}
             className="flex-1 py-4 rounded-2xl bg-white/5 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10"
           >
             Abort
           </button>
           <button 
             onClick={handleCascade}
             className="flex-1 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-primary-light shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
           >
             <Save size={16} /> Deploy Cascade
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TargetCascadeModal;
