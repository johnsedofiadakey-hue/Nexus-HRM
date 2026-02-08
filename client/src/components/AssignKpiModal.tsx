import React, { useState } from 'react';
import api from '../services/api'; // Our messenger
import { X, Plus, Trash2, Save, Target, AlertCircle } from 'lucide-react';

interface AssignKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void; // To refresh the list after saving
}

const AssignKpiModal = ({ isOpen, onClose, employeeId, employeeName, onSuccess }: AssignKpiModalProps) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState(`Performance Goals - ${new Date().toLocaleString('default', { month: 'long' })}`);
  const [month, setMonth] = useState(new Date().getMonth() + 1); // Current Month
  const [year, setYear] = useState(new Date().getFullYear());

  // Dynamic List of Targets
  const [items, setItems] = useState([
    { category: 'Financial', description: 'Achieve Monthly Sales Target', weight: 40, target: 50000 },
    { category: 'Operational', description: 'Resolve tickets within 24h', weight: 30, target: 95 },
    { category: 'Behavioral', description: 'Team collaboration and punctuality', weight: 30, target: 10 },
  ]);

  // Helper: Calculate total weight (Should be 100%)
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);

  // Add a new blank row
  const addItem = () => {
    setItems([...items, { category: 'General', description: '', weight: 0, target: 0 }]);
  };

  // Remove a row
  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  // Update a specific row
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    // @ts-ignore
    newItems[index][field] = value;
    setItems(newItems);
  };

  // SUBMIT TO SERVER
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (totalWeight !== 100) {
      setError(`Total Weight must be exactly 100%. Currently: ${totalWeight}%`);
      return;
    }

    setLoading(true);

    try {
      await api.post('/kpi/assign', {
        title,
        employeeId,
        month,
        year,
        items
      });
      
      onSuccess(); // Refresh parent
      onClose();   // Close modal
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to assign goals.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-nexus-700 p-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <Target className="mr-2" /> Assign Goals
            </h2>
            <p className="text-nexus-100 text-sm opacity-90">Targeting for: <span className="font-bold text-white">{employeeName}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center border border-red-200">
              <AlertCircle className="mr-2" size={20} /> {error}
            </div>
          )}

          <form id="kpi-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Sheet Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-nexus-500 outline-none" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                <select 
                  value={month} 
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-nexus-500 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input 
                  type="number" 
                  value={year} 
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed" 
                  readOnly
                />
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Dynamic Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-800">Key Performance Indicators (KPIs)</h3>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  Total Weight: {totalWeight}%
                </span>
              </div>
              
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-200 group hover:border-nexus-300 transition-colors">
                    
                    {/* Category */}
                    <div className="w-full md:w-1/4">
                      <input 
                        placeholder="Category (e.g., Sales)"
                        value={item.category}
                        onChange={(e) => updateItem(index, 'category', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-nexus-500 outline-none text-sm font-medium"
                      />
                    </div>

                    {/* Description */}
                    <div className="w-full md:w-2/4">
                      <input 
                        placeholder="Description of the goal..."
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-nexus-500 outline-none text-sm"
                      />
                    </div>

                    {/* Stats Row for Mobile / Columns for Desktop */}
                    <div className="flex w-full md:w-1/4 gap-2">
                      <div className="relative w-1/2">
                         <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
                         <input 
                          type="number" 
                          placeholder="Weight"
                          value={item.weight}
                          onChange={(e) => updateItem(index, 'weight', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-nexus-500 outline-none text-sm"
                        />
                      </div>
                      <div className="w-1/2">
                        <input 
                          type="number" 
                          placeholder="Target"
                          value={item.target}
                          onChange={(e) => updateItem(index, 'target', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-nexus-500 outline-none text-sm"
                        />
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                type="button"
                onClick={addItem}
                className="mt-4 flex items-center text-sm font-bold text-nexus-600 hover:text-nexus-700 hover:bg-nexus-50 px-4 py-2 rounded-lg transition-colors border border-dashed border-nexus-300 w-full justify-center"
              >
                <Plus size={16} className="mr-2" /> Add KPI Goal
              </button>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-nexus-600 hover:bg-nexus-700 text-white rounded-lg font-bold shadow-lg shadow-nexus-500/30 transition-all flex items-center"
          >
            {loading ? 'Saving...' : (
              <>
                <Save size={18} className="mr-2" /> Assign Goals
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AssignKpiModal;