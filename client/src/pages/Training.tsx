import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, X, Loader2, CheckCircle, Download, BookOpen, Users, Clock, Award, Target, LayoutGrid, List } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const statusTheme: Record<string, string> = {
  ENROLLED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  DROPPED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  PLANNED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  ONGOING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
};

const Training = () => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEnroll, setShowEnroll] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState({ title: '', description: '', provider: '', startDate: '', endDate: '', durationHours: '', maxSeats: '', cost: '' });
  const [enrollForm, setEnrollForm] = useState({ employeeId: '' });

  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const isAdmin = ['MD', 'HR_ADMIN'].includes(user.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([api.get('/training'), api.get('/training/my')]);
      setPrograms(pRes.data);
      setMyEnrollments(mRes.data);
      if (isAdmin) {
        const eRes = await api.get('/users');
        setEmployees(eRes.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/training', form);
      setShowCreate(false); setForm({ title: '', description: '', provider: '', startDate: '', endDate: '', durationHours: '', maxSeats: '', cost: '' });
      fetchData();
    } catch (err: any) { setError(err?.response?.data?.error || 'Failed to add program'); }
    finally { setSaving(false); }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/training/enroll', { programId: showEnroll.id, employeeId: enrollForm.employeeId || undefined });
      setShowEnroll(null); setEnrollForm({ employeeId: '' }); fetchData();
    } catch (err: any) { alert(err?.response?.data?.error || 'Employee already enrolled'); }
    finally { setSaving(false); }
  };

  const selfEnroll = async (programId: string) => {
    try {
      await api.post('/training/enroll', { programId });
      fetchData();
    } catch (err: any) { alert(err?.response?.data?.error || 'Already enrolled'); }
  };

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Training</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <GraduationCap size={14} className="text-primary-light" />
            Company Training Programs
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex p-1 rounded-2xl gap-1 bg-white/[0.02] border border-white/5 shadow-inner hidden sm:flex">
             <button onClick={() => setViewMode('grid')} className={cn("px-4 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white")}>
                <LayoutGrid size={14} /> Grid
             </button>
             <button onClick={() => setViewMode('list')} className={cn("px-4 py-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'list' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white")}>
                <List size={14} /> Matrix
             </button>
          </div>
          {isAdmin && (
            <>
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => window.open('/api/training/export/csv', '_blank')} 
                className="glass px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white border-white/[0.05] flex items-center gap-2"
              >
                <Download size={14} /> Export Catalog
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px]" 
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} /> Add Program
              </motion.button>
            </>
          )}
        </div>
      </div>

      {loading ? (
         <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={32} className="animate-spin text-primary-light" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading programs...</p>
         </div>
      ) : (
        <div className="space-y-12">
           {/* Active Personal Development */}
           {myEnrollments.length > 0 && (
             <div className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                   <Target size={18} className="text-primary-light" />
                   <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">My Training Programs</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {myEnrollments.map((e, idx) => (
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={e.id} 
                        className="glass p-6 md:p-8 rounded-[2rem] border-white/[0.05] hover:bg-[#0a0f1e]/40 transition-colors relative overflow-hidden group"
                     >
                        <div className="absolute -right-4 -top-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                           <Award size={140} className="text-white" />
                        </div>
                        <div className="flex items-start justify-between mb-6 relative z-10">
                           <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg text-primary-light">
                              <BookOpen size={24} />
                           </div>
                           <span className={cn("px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] border", statusTheme[e.status])}>{e.status}</span>
                        </div>
                        <div className="relative z-10 space-y-2">
                           <h3 className="font-display font-black text-xl text-white tracking-tight line-clamp-2">{e.program.title}</h3>
                           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{e.program.provider || 'Internal'}</p>
                        </div>
                        {e.completedAt && (
                          <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between relative z-10 text-emerald-400">
                             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <CheckCircle size={14} /> Completed
                             </div>
                             {e.score && <span className="font-display font-black text-xl">{e.score}%</span>}
                          </div>
                        )}
                     </motion.div>
                   ))}
                </div>
             </div>
           )}

           <div className="space-y-6">
              <div className="flex items-center gap-3 ml-2">
                 <BookOpen size={18} className="text-primary-light" />
                 <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">All Programs</h2>
              </div>
              
              {programs.length === 0 ? (
                <div className="glass p-20 text-center border-white/[0.05] rounded-[2rem]">
                   <GraduationCap size={48} className="mx-auto mb-6 opacity-10 text-slate-300" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No programs available</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {programs.map((p, idx) => {
                     const enrolled = myEnrollments.find(e => e.programId === p.id);
                     return (
                       <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={p.id} 
                          className="glass p-6 md:p-8 rounded-[2rem] border-white/[0.05] bg-[#0a0f1e]/20 hover:bg-[#0a0f1e]/40 transition-colors flex flex-col h-full"
                       >
                          <div className="mb-4 flex flex-wrap gap-2">
                             <span className={cn("px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border", statusTheme[p.status] || 'bg-white/5 text-slate-400 border-white/10')}>{p.status}</span>
                             {p.maxSeats && p.enrollments?.length >= p.maxSeats && <span className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border border-rose-500/20 text-rose-400 bg-rose-500/10">Full Capacity</span>}
                          </div>
                          
                          <div className="space-y-2 mb-6 flex-grow">
                             <h3 className="font-display font-black text-lg text-white leading-tight">{p.title}</h3>
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{p.provider || 'Internal'}</p>
                             {p.description && <p className="text-xs font-medium text-slate-400 line-clamp-3 mt-3">{p.description}</p>}
                          </div>
                          
                          <div className="space-y-4 pt-6 border-t border-white/[0.05] mt-auto">
                             <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <div className="flex items-center gap-1.5"><Clock size={12} /> {p.durationHours ? `${p.durationHours} HRS` : 'FLEXIBLE'}</div>
                                <div className="flex items-center gap-1.5"><Users size={12} /> {p.enrollments?.length || 0}{p.maxSeats ? `/${p.maxSeats}` : ''}</div>
                             </div>
                             
                             {enrolled ? (
                               <div className="w-full py-4 text-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                  <CheckCircle size={14} /> Enrolled
                               </div>
                             ) : isAdmin ? (
                               <motion.button 
                                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                  onClick={() => setShowEnroll(p)} 
                                  className="w-full py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors border border-white/5"
                               >
                                 Manage Enrollments
                               </motion.button>
                             ) : (
                               <motion.button 
                                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                  onClick={() => selfEnroll(p.id)} 
                                  disabled={p.maxSeats && p.enrollments?.length >= p.maxSeats}
                                  className={cn(
                                    "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors",
                                    p.maxSeats && p.enrollments?.length >= p.maxSeats ? "bg-white/[0.02] text-slate-600 cursor-not-allowed" : "bg-primary/20 hover:bg-primary/30 text-primary-light shadow-[0_0_15px_rgba(99,102,241,0.2)] border border-primary/30"
                                  )}
                               >
                                 {p.maxSeats && p.enrollments?.length >= p.maxSeats ? 'Capacity Reached' : 'Enroll'}
                               </motion.button>
                             )}
                          </div>
                       </motion.div>
                     );
                   })}
                </div>
              ) : (
                <div className="glass overflow-hidden border-white/[0.05]">
                   <div className="overflow-x-auto custom-scrollbar">
                      <table className="nx-table">
                         <thead>
                            <tr className="bg-white/[0.01]">
                               <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Operation Protocol</th>
                               <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Vendor / Body</th>
                               <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Horizon</th>
                               <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">State</th>
                               <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Roster Load</th>
                               <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Access</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/[0.03]">
                            {programs.map((p) => {
                              const enrolled = myEnrollments.find(e => e.programId === p.id);
                              return (
                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                   <td className="px-8 py-5">
                                      <p className="font-bold text-sm text-white">{p.title}</p>
                                      {p.description && <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 truncate max-w-[250px] mt-1">{p.description}</p>}
                                   </td>
                                   <td className="px-6 py-5 text-xs font-bold text-slate-400">{p.provider || 'Internal'}</td>
                                   <td className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                     {p.startDate ? `${new Date(p.startDate).toLocaleDateString()} - ${p.endDate ? new Date(p.endDate).toLocaleDateString() : 'TBD'}` : 'FLEXIBLE HORIZON'}
                                   </td>
                                   <td className="px-6 py-5">
                                      <span className={cn("px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border", statusTheme[p.status])}>{p.status}</span>
                                   </td>
                                   <td className="px-6 py-5 text-[10px] font-black text-slate-300">
                                      {p.enrollments?.length || 0} <span className="text-slate-600">/</span> {p.maxSeats || '∞'}
                                   </td>
                                   <td className="px-8 py-5 text-right">
                                      {enrolled ? (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Assigned</span>
                                      ) : isAdmin ? (
                                        <button onClick={() => setShowEnroll(p)} className="text-[10px] font-black uppercase tracking-widest text-primary-light hover:text-white transition-colors">Manage</button>
                                      ) : (
                                        <button onClick={() => selfEnroll(p.id)} disabled={p.maxSeats && p.enrollments?.length >= p.maxSeats} className="text-[10px] font-black uppercase tracking-widest text-primary-light hover:text-white transition-colors disabled:text-slate-600">Opt-in</button>
                                      )}
                                   </td>
                                </tr>
                              )
                            })}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Init Program Modal Architecture */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="glass w-full max-w-2xl bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-primary/20 max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg text-primary-light">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">Add Program</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Create a new training program</p>
                  </div>
                </div>
                <button onClick={() => setShowCreate(false)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={20} /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-grow space-y-8">
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</div>
                )}
                <form id="create-training-form" onSubmit={handleCreate} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Program Title</label>
                    <input className="nx-input p-4 font-bold" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Advanced AI Integration" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Provider</label>
                      <input className="nx-input p-4 font-bold" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="Internal / Coursera etc." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cost</label>
                      <input type="number" className="nx-input p-4 font-bold text-primary-light" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Start Date</label>
                      <input type="date" className="nx-input p-4 font-bold text-slate-300" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">End Date</label>
                      <input type="date" className="nx-input p-4 font-bold text-slate-300" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Duration (Hours)</label>
                      <input type="number" className="nx-input p-4 font-bold" value={form.durationHours} onChange={e => setForm({ ...form, durationHours: e.target.value })} placeholder="Length in hours" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Max Capacity</label>
                      <input type="number" className="nx-input p-4 font-bold" value={form.maxSeats} onChange={e => setForm({ ...form, maxSeats: e.target.value })} placeholder="No limit if blank" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Description</label>
                    <textarea className="nx-input p-4 text-xs font-medium resize-none min-h-[120px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Provide a description of the program..." />
                  </div>
                </form>
              </div>
              
              <div className="p-8 border-t border-white/[0.05] bg-white/[0.01] flex justify-end gap-4 flex-shrink-0">
                <button type="button" onClick={() => setShowCreate(false)} className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} form="create-training-form" type="submit" className="btn-primary px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/30 flex items-center gap-3" disabled={saving}>
                   {saving ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                   {saving ? 'Saving...' : 'Save Program'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Roster Assignment Modal */}
      <AnimatePresence>
        {showEnroll && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEnroll(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
               className="glass w-full max-w-lg bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-emerald-500/10"
            >
              <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg text-emerald-400">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">Enroll Employee</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Assign an employee to this program</p>
                  </div>
                </div>
                <button onClick={() => setShowEnroll(null)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              
              <div className="p-8 space-y-8">
                 <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Program</p>
                    <p className="text-lg font-black text-white">{showEnroll.title}</p>
                 </div>
                 
                 <form onSubmit={handleEnroll} className="space-y-8">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Select Employee</label>
                     <div className="relative">
                       <select className="nx-input p-4 font-bold text-sm appearance-none pr-10" required value={enrollForm.employeeId} onChange={e => setEnrollForm({ employeeId: e.target.value })}>
                         <option value="">Awaiting selection...</option>
                         {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                       </select>
                       <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                     </div>
                   </div>
                   
                   <div className="flex justify-end gap-4 pt-6 border-t border-white/[0.05]">
                      <button type="button" onClick={() => setShowEnroll(null)} className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-emerald-500/20 flex items-center gap-3" disabled={saving}>
                         {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                         {saving ? 'Enrolling...' : 'Enroll'}
                      </motion.button>
                   </div>
                 </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Training;
