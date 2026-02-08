import React, { useState } from 'react';
import api from '../services/api';
import { X, Save, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sheet: any;
  onSuccess: () => void;
}

const UpdateProgressModal = ({ isOpen, onClose, sheet, onSuccess }: Props) => {
  if (!isOpen || !sheet) return null;

  const [loading, setLoading] = useState(false);
  // We copy the items into state so we can edit them
  const [formData, setFormData] = useState(
    sheet.items.map((item: any) => ({
      id: item.id,
      description: item.description,
      target: item.targetValue,
      weight: item.weight,
      actualValue: item.actualValue
    }))
  );

  const handleChange = (index: number, val: string) => {
    const newData = [...formData];
    newData[index].actualValue = val;
    setFormData(newData);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.patch('/kpi/update-progress', {
        sheetId: sheet.id,
        items: formData.map((f: any) => ({
          id: f.id,
          actualValue: Number(f.actualValue)
        }))
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to save progress");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-nexus-700 p-6 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold">Update Progress</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            {formData.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-slate-700">{item.description}</p>
                  <p className="text-xs text-slate-500 mt-1">Target: {item.target} (Weight: {item.weight}%)</p>
                </div>
                
                <div className="w-32">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Your Result</label>
                  <input 
                    type="number"
                    value={item.actualValue}
                    onChange={(e) => handleChange(index, e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-nexus-500 focus:ring-0 font-bold text-slate-800 text-right"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">Cancel</button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-nexus-600 text-white font-bold rounded-lg hover:bg-nexus-700 transition-all flex items-center"
          >
            {loading ? 'Saving...' : <><Save size={18} className="mr-2" /> Save Updates</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UpdateProgressModal;