import React, { useEffect, useState } from 'react';
import { Building2, Plus, X, Loader2, Users, Edit2, ShieldCheck, Zap } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', managerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, eRes] = await Promise.all([api.get('/departments'), api.get('/users')]);
      setDepartments(dRes.data);
      setEmployees(eRes.data.filter((e: any) => ['SUPERVISOR', 'MD', 'HR_ADMIN'].includes(e.role)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', managerId: '' }); setError(''); setShowModal(true); };
  const openEdit = (dept: any) => { setEditing(dept); setForm({ name: dept.name, managerId: dept.managerId || '' }); setError(''); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/departments/${editing.id}`, form);
      } else {
        await api.post('/departments', form);
      }
      setShowModal(false); fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Protocol Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Structural Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Departments</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <Building2 size={14} className="text-accent" />
            {departments.length} Departments Configured
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="bg-accent/20 text-accent border border-accent/30 flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-accent/20 font-black uppercase tracking-widest text-[10px]" 
          onClick={openCreate}
        >
          <Plus size={16} /> Add Department
        </motion.button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 size={32} className="animate-spin text-accent" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {departments.map((dept: any, idx) => (
              <motion.div 
                key={dept.id} 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass p-8 rounded-[2rem] border border-white/[0.05] hover:border-accent/30 transition-all group relative overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute -right-8 -top-8 opacity-[0.02] group-hover:scale-110 group-hover:opacity-[0.05] transition-all group-hover:-rotate-12 duration-700">
                  <Building2 size={160} className="text-white" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 text-accent shadow-lg shadow-accent/10">
                      <Zap size={24} />
                    </div>
                    <button 
                      onClick={() => openEdit(dept)} 
                      className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-white transition-all hover:bg-white/10"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  
                  <h3 className="text-3xl font-black text-white font-display tracking-tight mb-4">{dept.name}</h3>
                  
                  <div className="space-y-4">
                    {dept.manager ? (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                          {dept.manager.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Director</p>
                          <p className="text-sm font-bold text-white">{dept.manager.fullName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-400">
                        <ShieldCheck size={20} className="opacity-50" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Manager Assigned</p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/[0.02] w-fit px-4 py-2 rounded-lg border border-white/5 group-hover:border-white/10 transition-colors">
                      <Users size={14} className="text-accent" />
                      <span>{dept.employees?.length || 0} Employees</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {departments.length === 0 && (
            <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-20 px-4 glass rounded-[3rem] border-white/[0.02]">
              <div className="w-24 h-24 rounded-3xl bg-white/[0.02] flex items-center justify-center mx-auto mb-6 border border-white/5">
                 <Building2 size={40} className="text-slate-600" />
              </div>
              <p className="text-2xl font-black text-white font-display tracking-tight mb-2">No Departments</p>
              <p className="text-xs font-medium text-slate-500">Add a department to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="glass w-full max-w-lg bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-accent/20"
            >
              <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20 text-accent shadow-lg"><Zap size={24} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">
                      {editing ? 'Edit Department' : 'Add Department'}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">
                      Department Details
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              
              <div className="p-8">
                {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</div>}
                <form id="dept-form" onSubmit={handleSubmit} className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Department Name *</label>
                    <input type="text" className="nx-input p-4 font-bold text-lg" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales, Marketing..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Manager</label>
                    <select className="nx-input p-4 font-bold text-sm appearance-none" value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}>
                      <option value="">-- No Manager Assigned --</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} / {e.jobTitle}</option>)}
                    </select>
                  </div>
                </form>
              </div>
              
              <div className="p-8 border-t border-white/[0.05] bg-white/[0.01] flex justify-end gap-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} form="dept-form" type="submit" className="bg-accent/20 text-accent border border-accent/30 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-accent/20 flex items-center gap-3" disabled={saving}>
                   {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                   {saving ? 'Processing...' : 'Save Department'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DepartmentManagement;
