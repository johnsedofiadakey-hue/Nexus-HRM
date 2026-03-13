import React, { useState } from 'react';
import api from '../services/api';
import { X, Plus, Trash2, Save, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

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

  const [title, setTitle] = useState(`Strategic Goals - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const year = new Date().getFullYear();

  const [items, setItems] = useState<KpiItem[]>([
    { category: 'Financial', description: 'Monthly Revenue Target', weight: 40, target: 100 },
    { category: 'Operational', description: 'System Up-time & Efficiency', weight: 30, target: 99 },
    { category: 'Development', description: 'Skill Acquisition & Training', weight: 30, target: 10 },
  ]);

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
    
    if (totalWeight !== 100) {
      setError(`Cumulative weight must equal 100%. Current: ${totalWeight}%`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/kpi/assign', { title, employeeId, month, year, items });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Mission critical failure: Failed to assign goals.'));
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
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass w-full max-w-4xl bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-primary/10"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Target className="text-primary-light" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-display tracking-tight">Strategy Deployment</h2>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">Defining objectives for <span className="text-primary-light font-bold">{employeeName}</span></p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Document Title</label>
                  <input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="nx-input" 
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Fiscal Month</label>
                  <select 
                    value={month} 
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="nx-input appearance-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Fiscal Year</label>
                  <input value={year} className="nx-input opacity-50 cursor-not-allowed" readOnly />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">KPI Architecture</h3>
                    <p className="text-xs text-slate-500 mt-1">Assign weights to distribute strategic focus</p>
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                    totalWeight === 100 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  )}>
                    Total Load: {totalWeight}%
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={index} 
                      className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-primary/20 transition-all flex flex-col md:flex-row gap-4 items-center"
                    >
                      <input 
                        placeholder="Category"
                        value={item.category}
                        onChange={(e) => updateItem(index, 'category', e.target.value)}
                        className="nx-input md:w-32 bg-transparent border-white/5 focus:bg-white/5 text-xs font-black uppercase tracking-widest text-primary-light"
                      />
                      <input 
                        placeholder="Define the objective..."
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="nx-input flex-1 bg-transparent border-white/5 focus:bg-white/5 text-sm font-medium"
                      />
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-24">
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">%</span>
                           <input 
                            type="number" 
                            value={item.weight}
                            onChange={(e) => updateItem(index, 'weight', e.target.value)}
                            className="nx-input text-center pr-8"
                          />
                        </div>
                        <input 
                          type="number" 
                          placeholder="Target"
                          value={item.target}
                          onChange={(e) => updateItem(index, 'target', e.target.value)}
                          className="nx-input text-center md:w-24"
                        />
                        <button 
                          onClick={() => removeItem(index)}
                          className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button 
                  onClick={addItem}
                  className="w-full py-4 rounded-2xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-primary/5 text-slate-500 hover:text-primary-light text-[10px] font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform" /> 
                  <span>Insert Strategic KPI</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-white/[0.05] bg-white/[0.01] flex justify-end gap-4">
              <button 
                onClick={onClose}
                className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20"
              >
                {loading ? 'Processing...' : (
                  <div className="flex items-center gap-2">
                    <Save size={16} /> Deploy Strategy
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