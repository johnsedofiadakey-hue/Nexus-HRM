import React, { useEffect, useState } from 'react';
import { Package, Plus, X, Loader2, Laptop, Smartphone, Monitor, Car, Search, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const statusBadge: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ASSIGNED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  MAINTENANCE: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  RETIRED: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
};
const typeIcon: Record<string, React.ElementType> = {
  LAPTOP: Laptop, PHONE: Smartphone, MONITOR: Monitor, VEHICLE: Car
};

const emptyAsset = {
  name: '', serialNumber: '', type: 'LAPTOP', make: '', model: '',
  description: '', isCompanyProperty: true
};

const AssetManagement = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<any>(null);
  const [form, setForm] = useState(emptyAsset);
  const [assignForm, setAssignForm] = useState({ userId: '', condition: 'Good' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([api.get('/assets'), api.get('/users')]);
      setAssets(aRes.data);
      setEmployees(eRes.data.filter((e: any) => e.status === 'ACTIVE'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAssets(); }, []);

  const filtered = assets.filter(a => `${a.name} ${a.serialNumber} ${a.type} ${a.make} ${a.model}`.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/assets', form);
      setShowCreate(false); setForm(emptyAsset); fetchAssets();
    } catch (err: any) { setError(err?.response?.data?.message || 'Initialization Failed'); }
    finally { setSaving(false); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/assets/assign', { assetId: showAssign.id, ...assignForm });
      setShowAssign(null); setAssignForm({ userId: '', condition: 'Good' }); fetchAssets();
    } catch (err: any) { setError(err?.response?.data?.message || 'Assignment Failed'); }
    finally { setSaving(false); }
  };

  const handleReturn = async (assetId: string) => {
    if (!confirm('Execute asset return protocol?')) return;
    try {
      await api.post('/assets/return', { assetId, condition: 'Good' });
      fetchAssets();
    } catch (err: any) { alert(err?.response?.data?.message || 'Return protocol failed'); }
  };

  const stats = {
    total: assets.length,
    available: assets.filter(a => a.status === 'AVAILABLE').length,
    assigned: assets.filter(a => a.status === 'ASSIGNED').length,
    maintenance: assets.filter(a => a.status === 'MAINTENANCE').length,
  };

  return (
    <div className="space-y-10 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Assets</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <Package size={14} className="text-primary-light" />
            Company Assets ({stats.total} Tracked)
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[10px]" 
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} /> Add Asset
        </motion.button>
      </div>

      {/* Telemetry Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Assets', value: stats.total, color: 'text-primary-light', bg: 'bg-primary/5', border: 'border-primary/20' },
          { label: 'Available', value: stats.available, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
          { label: 'Assigned', value: stats.assigned, color: 'text-cyan-400', bg: 'bg-cyan-500/5', border: 'border-cyan-500/20' },
          { label: 'In Maintenance', value: stats.maintenance, color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
        ].map((s, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={s.label} 
            className={cn("p-6 md:p-8 rounded-[2rem] border relative overflow-hidden group", s.bg, s.border, "hover:bg-white/[0.05] transition-colors")}
          >
            <div className="absolute -right-4 -top-8 opacity-[0.03] group-hover:scale-110 transition-transform">
               <Package size={120} className="text-white" />
            </div>
            <div className="relative z-10">
              <div className={cn("font-display font-black text-4xl sm:text-5xl mb-2 drop-shadow-lg", s.color)}>{s.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Ledger */}
      <div className="glass overflow-hidden border-white/[0.05] flex flex-col min-h-[500px]">
        <div className="p-6 md:p-8 border-b border-white/[0.05] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
             <ShieldCheck size={18} className="text-primary-light" />
             <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Asset List</h2>
          </div>
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
               type="text" 
               className="nx-input pl-10 py-3 text-xs w-full bg-white/[0.03] border-white/5 font-bold" 
               placeholder="Search by serial or name..." 
               value={search} 
               onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-primary-light" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar flex-grow">
            <table className="nx-table w-full">
              <thead>
                <tr className="bg-white/[0.01]">
                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Asset</th>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Type</th>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Serial No.</th>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">State</th>
                   <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Assignment</th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map((asset: any) => {
                  const Icon = typeIcon[asset.type] || Package;
                  const latestAssignment = asset.assignments?.[0];
                  const assignee = latestAssignment?.user?.fullName;
                  return (
                    <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary-light shadow-lg">
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white group-hover:text-primary-light transition-colors">{asset.name}</p>
                            {asset.make && <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{asset.make} {asset.model}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5"><span className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest bg-white/5 text-slate-400 border border-white/10">{asset.type}</span></td>
                      <td className="px-6 py-5 font-mono text-[10px] font-bold text-slate-500 tracking-wider bg-white/[0.02] rounded px-2">{asset.serialNumber}</td>
                      <td className="px-6 py-5"><span className={cn("px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border", statusBadge[asset.status] || 'bg-white/5 text-slate-400 border-white/10')}>{asset.status}</span></td>
                      <td className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{assignee || '—'}</td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 text-[10px] font-black uppercase tracking-widest">
                          {asset.status === 'AVAILABLE' && (
                            <button onClick={() => { setShowAssign(asset); setError(''); }} className="px-4 py-2 rounded-xl text-primary-light hover:bg-primary/20 hover:text-white transition-colors bg-primary/10">
                              Deploy
                            </button>
                          )}
                          {asset.status === 'ASSIGNED' && (
                            <button onClick={() => handleReturn(asset.id)} className="px-4 py-2 rounded-xl text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 transition-colors bg-amber-500/10">
                              Recover
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-20 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 opacity-50">No assets found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Init Hardware Modal */}
      <AnimatePresence>
        {showCreate && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreate(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass w-full max-w-2xl bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-primary/20 max-h-[90vh]"
             >
               <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center flex-shrink-0">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary-light shadow-lg"><Package size={24} /></div>
                   <div>
                     <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">Add Asset</h2>
                     <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Enter asset details</p>
                   </div>
                 </div>
                 <button onClick={() => setShowCreate(false)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={20} /></button>
               </div>
               
               <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
                 {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</div>}
                 <form id="create-asset-form" onSubmit={handleCreate} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {[
                       { k: 'name', l: 'Asset Name / Tag *' }, 
                       { k: 'serialNumber', l: 'Serial No. *' }, 
                       { k: 'make', l: 'Manufacturer' }, 
                       { k: 'model', l: 'Model' }
                     ].map(({ k, l }) => (
                       <div key={k}>
                         <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">{l}</label>
                         <input type="text" className="nx-input p-4 font-bold" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} required={l.includes('*')} />
                       </div>
                     ))}
                   </div>
                   <div>
                     <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Asset Type</label>
                     <select className="nx-input p-4 font-bold appearance-none" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                       {['LAPTOP','DESKTOP','MONITOR','PHONE','TABLET','VEHICLE','PERIPHERAL','OTHER'].map(t => <option key={t}>{t}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Description</label>
                     <textarea className="nx-input p-4 text-xs font-medium resize-none min-h-[100px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                   </div>
                 </form>
               </div>
               
               <div className="p-8 border-t border-white/[0.05] bg-white/[0.01] flex justify-end gap-4 flex-shrink-0">
                 <button type="button" onClick={() => setShowCreate(false)} className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                 <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} form="create-asset-form" type="submit" className="btn-primary px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-primary/30 flex items-center gap-3" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                    {saving ? 'Saving...' : 'Save Asset'}
                 </motion.button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Deploy Modal */}
      <AnimatePresence>
        {showAssign && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssign(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                className="glass w-full max-w-lg bg-[#0a0f1e]/95 border-white/[0.05] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/20"
             >
               <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 shadow-lg"><UserSearch size={24} /></div>
                   <div>
                     <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">Assign Asset</h2>
                     <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Assign this asset to an employee</p>
                   </div>
                 </div>
                 <button onClick={() => setShowAssign(null)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={20} /></button>
               </div>
               
               <div className="p-8 space-y-8">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Asset</p>
                     <p className="text-lg font-black text-white">{showAssign.name}</p>
                     <p className="text-[10px] font-mono tracking-widest text-slate-500">SN: {showAssign.serialNumber}</p>
                  </div>
                  
                  {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</div>}
                  
                  <form onSubmit={handleAssign} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Employee *</label>
                      <select className="nx-input p-4 font-bold text-sm appearance-none" required value={assignForm.userId} onChange={e => setAssignForm({ ...assignForm, userId: e.target.value })}>
                        <option value="">Awaiting Selection...</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} — {e.jobTitle}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Condition</label>
                      <select className="nx-input p-4 font-bold text-sm appearance-none" value={assignForm.condition} onChange={e => setAssignForm({ ...assignForm, condition: e.target.value })}>
                        {['New', 'Excellent', 'Good', 'Fair', 'Poor'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    
                    <div className="flex justify-end gap-4 pt-6 border-t border-white/[0.05]">
                       <button type="button" onClick={() => setShowAssign(null)} className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                       <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-cyan-500/20 flex items-center gap-3" disabled={saving}>
                          {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                          {saving ? 'Processing...' : 'Assign'}
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

// Lucide icon missing in import, adding a local mockup for UserSearch if needed or we can swap it
const UserSearch = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="10" cy="7" r="4"></circle>
    <path d="M10 15c-3.1 0-5.7 2.1-6.6 5"></path>
    <circle cx="17" cy="17" r="3"></circle>
    <line x1="19.5" y1="19.5" x2="22" y2="22"></line>
  </svg>
);

export default AssetManagement;
