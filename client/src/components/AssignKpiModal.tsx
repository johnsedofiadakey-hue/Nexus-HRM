import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Plus, Trash2, Save, Target, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser } from '../utils/session';

interface AssignKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}

type KpiItem = {
  category: string;
  description: string;
  weight: number;
  target: number;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

const AssignKpiModal = ({ isOpen, onClose, employeeId, employeeName, onSuccess }: AssignKpiModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState(`Performance Targets - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const year = new Date().getFullYear();

  const [items, setItems] = useState<KpiItem[]>([]);

  const [deptKpis, setDeptKpis] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) fetchDeptKpis();
  }, [isOpen]);

  const fetchDeptKpis = async () => {
    try {
      const u = getStoredUser();
      if (u.departmentId) {
        const res = await api.get('/kpis/department', { params: { departmentId: u.departmentId } });
        setDeptKpis(Array.isArray(res.data?.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('[AssignKpiModal] Failed to fetch strategic reference:', err);
    }
  };

  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);

  const addItem = () => {
    setItems([...items, { category: 'New Initiative', description: '', weight: 0, target: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof KpiItem, value: string) => {
    const newItems = [...items];
    const parsedValue = (field === 'weight' || field === 'target') ? Number(value) : value;
    newItems[index] = { ...newItems[index], [field]: parsedValue } as KpiItem;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Removed 100% cumulative weight restriction as per new 1-10 scale guidelines

    setLoading(true);
    try {
      await api.post('/kpis/assign', { title, employeeId, month, year, items });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to deploy targets. Check backend logs.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass w-full max-w-6xl bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-primary/20"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Target className="text-primary-light" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase tracking-widest">Strategy Alignment</h2>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">Defining individual mission for <span className="text-primary-light font-bold underline decoration-primary decoration-2 underline-offset-4">{employeeName}</span></p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Form Section */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-xs font-black uppercase tracking-widest"
                    >
                      <AlertCircle size={18} /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Period Label</label>
                    <input 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                      className="nx-input bg-white/5 border-white/10 text-white" 
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Strategic Month</label>
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="nx-input bg-white/5 border-white/10 appearance-none text-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1} className="bg-slate-900">{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Strategic Year</label>
                    <input value={year} className="nx-input bg-white/5 border-white/10 opacity-50" readOnly />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end px-1">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.25em] text-white">Execution Parameters</h3>
                      <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Assign strategic weight to each objective</p>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all bg-primary/10 border-primary/20 text-primary-light"
                    )}>
                      Total Priority Mass: {totalWeight}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={index} 
                        className="group p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-primary/20 transition-all flex flex-col md:flex-row gap-5 items-center"
                      >
                        <input 
                          placeholder="Category"
                          value={item.category}
                          onChange={(e) => updateItem(index, 'category', e.target.value)}
                          className="nx-input md:w-40 bg-white/5 border-white/5 focus:bg-white/10 text-xs font-black uppercase tracking-widest text-primary-light"
                        />
                        <input 
                          placeholder="Define the strategic objective..."
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="nx-input flex-1 bg-white/5 border-white/5 focus:bg-white/10 text-sm font-medium text-white"
                        />
                        <div className="flex items-center gap-4 w-full md:w-auto">
                           <div className="relative flex-1 md:w-28">
                             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">W</span>
                             <input 
                              type="number" 
                              min="1"
                              max="10"
                              value={item.weight}
                              onChange={(e) => updateItem(index, 'weight', e.target.value)}
                              className="nx-input text-center pr-8 w-full bg-white/5 border-white/5 text-white"
                            />
                          </div>
                          <div className="relative flex-1 md:w-28">
                            <input 
                              type="number" 
                              placeholder="Level"
                              value={item.target}
                              onChange={(e) => updateItem(index, 'target', e.target.value)}
                              className="nx-input text-center w-full bg-white/5 border-white/5 text-white"
                            />
                          </div>
                          <button 
                            onClick={() => removeItem(index)}
                            className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <button 
                    onClick={addItem}
                    className="w-full py-5 rounded-3xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 text-slate-500 hover:text-primary-light text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 group"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 
                    <span>Insert Operational Goal</span>
                  </button>
                </div>
              </div>

              {/* Strategic Reference Sidebar */}
              <div className="w-96 border-l border-white/[0.05] bg-white/[0.01] p-10 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <ShieldCheck className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Strategic Intent</h3>
                    <p className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-widest mt-0.5">Reference Mandates</p>
                  </div>
                </div>

                {deptKpis.length > 0 ? (
                  <div className="space-y-4">
                    {deptKpis.map((kpi, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={idx} 
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/30 transition-all"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 mb-2">{kpi.title}</p>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed mb-3">{kpi.content}</p>
                        <button 
                          onClick={() => {
                            setItems([...items, { category: 'Strategic', description: kpi.title + ': ' + kpi.content, weight: 0, target: 100 }]);
                          }}
                          className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Import to Mission
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 opacity-30 grayscale">
                    <Target size={40} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No departmental mandates found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-white/[0.05] bg-white/[0.02] flex justify-end gap-5">
              <button 
                onClick={onClose}
                className="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-primary/30"
              >
                {loading ? 'Processing...' : (
                  <div className="flex items-center gap-2">
                    <Save size={18} /> Deploy Mission
                  </div>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AssignKpiModal;