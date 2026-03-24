import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, Edit2, Trash2, Camera,
  X, Loader2, CheckCircle, RotateCcw,
  Eye, Filter, Activity, Archive, ShieldCheck, Mail, Phone, Briefcase, MapPin
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { toast } from '../utils/toast';

const ROLES = ['DEV', 'MD', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'STAFF', 'CASUAL'];
// ROLE_LABELS is now handled by i18n in the render

const ROLE_THEMES: Record<string, string> = {
  DEV: 'text-emerald-600 bg-emerald-500/5 border-emerald-500/10',
  MD: 'text-rose-600 bg-rose-500/5 border-rose-500/10',
  DIRECTOR: 'text-purple-600 bg-purple-500/5 border-purple-500/10',
  MANAGER: 'text-blue-600 bg-blue-500/5 border-blue-500/10',
  SUPERVISOR: 'text-cyan-600 bg-cyan-500/5 border-cyan-500/10',
  STAFF: 'text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
  CASUAL: 'text-amber-600 bg-amber-500/5 border-amber-500/10'
};

const STATUS_THEMES: Record<string, string> = {
  ACTIVE: 'text-emerald-600 bg-emerald-500/5 border-emerald-500/10',
  PROBATION: 'text-amber-600 bg-amber-500/5 border-amber-500/10',
  NOTICE_PERIOD: 'text-blue-600 bg-blue-500/5 border-blue-500/10',
  TERMINATED: 'text-rose-600 bg-rose-500/5 border-rose-500/10'
};

const EMPTY_FORM = {
  fullName: '', email: '', password: '', role: 'STAFF', jobTitle: '',
  departmentId: null as number | null, subUnitId: '', supervisorId: '', secondarySupervisorId: '', employmentType: 'Permanent', gender: '',
  contactNumber: '', employeeCode: '', joinDate: '', salary: '', currency: 'GHS',
  nationalId: '', address: '', dob: ''
};

const Avatar = ({ user, size = 12 }: { user: any; size?: number }) => (
  user?.avatarUrl
    ? <img src={user.avatarUrl} alt={user.fullName} className={cn(`w-${size} h-${size} rounded-2xl object-cover ring-4 ring-white/5 shadow-xl`)} />
    : <div className={cn(`w-${size} h-${size} rounded-2xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-2xl transition-transform group-hover:scale-105`)}
      style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', fontSize: size * 1.8 }}>
      {(user?.fullName || '?')[0]}
    </div>
);

const FormField = ({ label, type = 'text', required = false, value, onChange, children, placeholder }: any) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">{label}{required && ' *'}</label>
    {children || <input type={type} className="nx-input" required={required} placeholder={placeholder}
      value={value || ''} onChange={onChange} />}
  </div>
);

export default function EmployeeManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subUnits, setSubUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modal, setModal] = useState<'create' | 'edit' | 'role' | 'archive' | 'hard_delete' | 'view' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const user = getStoredUser();
  const isAdmin = getRankFromRole(user.role) >= 80;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, supRes, depRes, subRes] = await Promise.all([
        api.get('/employees'),
        api.get('/employees/supervisors'),
        api.get('/departments'),
        api.get('/sub-units')
      ]);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setSupervisors(Array.isArray(supRes.data) ? supRes.data : []);
      setDepartments(Array.isArray(depRes.data) ? depRes.data : []);
      setSubUnits(Array.isArray(subRes.data) ? subRes.data : []);
    } catch (e) { 
        console.error(e);
        toast.error(t('common.error_sync'));
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openEdit = (emp: any) => {
    setSelected(emp);
    const secondary = emp.employeeReportingLines?.find((r: any) => !r.isPrimary && r.type === 'DOTTED')?.managerId || '';
    setForm({
      fullName: emp.fullName || '', email: emp.email || '', password: '',
      role: emp.role || 'STAFF', jobTitle: emp.jobTitle || '',
      departmentId: emp.departmentId || null, subUnitId: emp.subUnitId || '', 
      supervisorId: emp.supervisorId || '',
      secondarySupervisorId: secondary,
      employmentType: emp.employmentType || 'Permanent', gender: emp.gender || '',
      contactNumber: emp.contactNumber || '', employeeCode: emp.employeeCode || '',
      joinDate: emp.joinDate ? emp.joinDate.split('T')[0] : '',
      salary: emp.salary || '', currency: emp.currency || 'GHS',
      nationalId: emp.nationalId || '', address: emp.address || '',
      dob: emp.dob ? emp.dob.split('T')[0] : ''
    });
    setModal('edit');
  };

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setError(''); setModal('create'); };
  const openView = (emp: any) => navigate(`/employees/${emp.id}`);
  const openArchive = (emp: any) => { setSelected(emp); setModal('archive'); };
  const openHardDelete = (emp: any) => { setSelected(emp); setModal('hard_delete'); };

  const handleSave = async (submittedForm: any) => {
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        await api.post('/employees', submittedForm);
        toast.success(t('employees.personnel_deployment_success'));
      } else {
        await api.put(`/employees/${selected.id}`, submittedForm);
        toast.success(t('employees.dossier_updated_success'));
      }
      setModal(null); fetchAll();
    } catch (err: any) { 
        const msg = err?.response?.data?.message || 'Protocol failure during sync';
        setError(msg); 
        toast.error(msg);
    } finally { setSaving(false); }
  };

  const handlePasswordReset = async (empId: string, name: string) => {
    if (!confirm(`Reset security protocol for ${name}?`)) return;
    setResettingId(empId);
    try {
      const res = await api.post(`/it/users/${empId}/reset-password`);
      toast.success(`Protocol reset for ${name}`);
    } catch (err: any) { toast.error('Security protocol failure'); }
    finally { setResettingId(null); }
  };

  const handleArchive = async () => {
    setSaving(true);
    try {
      await api.delete(`/employees/${selected.id}`);
      toast.success('Personnel record retired');
      setModal(null); fetchAll();
    } catch (err: any) { toast.error('Archival failure'); }
    finally { setSaving(false); }
  };

  const handleHardDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/employees/${selected.id}/hard`);
      toast.success('Personnel purged from registry');
      setModal(null); fetchAll();
    } catch (err: any) { toast.error('Purge sequence failure'); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (empId: string, file: File) => {
    setUploading(empId);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await api.post(`/employees/${empId}/avatar`, { image: reader.result });
          fetchAll();
          toast.success('Visual uplink verified');
        } catch { toast.error('Uplink failure'); }
        finally { setUploading(null); }
      };
      reader.readAsDataURL(file);
    } catch { setUploading(null); }
  };

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const q = search.toLowerCase();
      const matchSearch = !q || [emp.fullName, emp.email, emp.jobTitle, emp.employeeCode].some(f => f?.toLowerCase().includes(q));
      const matchRole = !filterRole || emp.role === filterRole;
      const matchStatus = !filterStatus || emp.status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [employees, search, filterRole, filterStatus]);

  return (
    <div className="space-y-12 pb-32">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">{t('employees.title')}</h1>
          <p className="text-[var(--text-secondary)] mt-3 font-medium flex items-center gap-2">
            <Users size={18} className="text-[var(--primary)] opacity-60" />
            {t('employees.subtitle')}
          </p>
        </motion.div>
        
        <div className="flex items-center gap-4">
             <div className="flex bg-[var(--bg-elevated)]/50 p-1 rounded-xl border border-[var(--border-subtle)]">
                {(['grid', 'table'] as const).map(m => (
                    <button key={m} onClick={() => setViewMode(m)}
                        className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        viewMode === m ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm border border-[var(--border-subtle)]" : "text-[var(--text-muted)]")}>
                        {m}
                    </button>
                ))}
             </div>
             {isAdmin && (
                <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="px-8 h-[52px] rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-3"
                    onClick={openCreate}
                >
                    <Plus size={18} /> {t('employees.deploy_button')}
                </motion.button>
             )}
        </div>
      </div>

      {/* Global Filter Matrix */}
      <div className="nx-card p-2 flex flex-wrap items-center gap-2 bg-[var(--bg-elevated)]/30 border-[var(--border-subtle)]">
        <div className="relative flex-1 min-w-[300px] group">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" />
          <input type="text" className="w-full bg-transparent border-none outline-none pl-14 pr-6 py-4 text-[13px] font-medium text-[var(--text-primary)]" placeholder={t('employees.search_placeholder')}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="h-6 w-[2px] bg-[var(--border-subtle)] opacity-20 hidden md:block" />
        <select className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest px-6 py-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">{t('employees.all_ranks')}</option>
          {ROLES.map(r => <option key={r} value={r}>{t(`employees.roles.${r}`)}</option>)}
        </select>
        <div className="h-6 w-[2px] bg-[var(--border-subtle)] opacity-20 hidden md:block" />
        <select className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest px-6 py-4 text-[var(--text-secondary)] hover:text(--text-primary)] cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{t('employees.all_statuses')}</option>
          {['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED'].map(s => <option key={s} value={s}>{t(`employees.statuses.${s}`)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] animate-pulse">Synchronizing Personnel Ledger</p>
        </div>
      ) : (
        <div className="space-y-10">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {(filtered || []).map((emp, i) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="nx-card group relative overflow-hidden bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30 hover:shadow-2xl transition-all duration-500"
                >
                   <div className="p-8 pb-32">
                      <div className="flex justify-between items-start mb-6">
                         <div className="relative group/avatar">
                            <Avatar user={emp} size={16} />
                            {isAdmin && (
                                <button className="absolute inset-0 rounded-2xl bg-[var(--primary)]/60 opacity-0 group-hover/avatar:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px] text-white"
                                    onClick={() => fileInputRefs.current[emp.id]?.click()}>
                                    {uploading === emp.id ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                                </button>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                                ref={el => { fileInputRefs.current[emp.id] = el; }}
                                onChange={e => e.target.files?.[0] && handleAvatarUpload(emp.id, e.target.files[0])} />
                         </div>
                         <div className={cn("px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border", ROLE_THEMES[emp.role])}>
                            {t(`employees.roles.${emp.role}`)}
                         </div>
                      </div>
                      
                      <div className="space-y-1">
                         <h3 className="text-lg font-black text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">{emp.fullName}</h3>
                         <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2 opacity-60">
                            <Briefcase size={10} /> {emp.jobTitle}
                         </p>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                         <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-bold border border-[var(--border-subtle)]">
                            {emp.departmentObj?.name || t('common.global')}
                         </div>
                         <div className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", STATUS_THEMES[emp.status])}>
                            {t(`employees.statuses.${emp.status}`)}
                         </div>
                      </div>
                   </div>

                   {/* Action Footer overlay */}
                   <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-elevated)] to-transparent border-t border-[var(--border-subtle)]/50 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="flex items-center justify-between gap-2">
                         <button onClick={() => openView(emp)} className="flex-1 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all font-black text-[9px] uppercase tracking-widest">
                            {t('employees.view_dossier')}
                         </button>
                         {isAdmin && (
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(emp)} className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all flex items-center justify-center">
                                    <Edit2 size={14} />
                                </button>
                                {getRankFromRole(user.role) >= 90 && (
                                    <button onClick={() => openArchive(emp)} className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-rose-500 text-[var(--text-muted)] hover:text-rose-500 transition-all flex items-center justify-center">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                         )}
                      </div>
                   </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="nx-card overflow-hidden border-[var(--border-subtle)]">
               <div className="overflow-x-auto">
                  <table className="nx-table">
                     <thead>
                        <tr className="bg-[var(--bg-elevated)]/20">
                           <th className="px-8">{t('employees.personnel')}</th>
                           <th>{t('employees.rank_dept')}</th>
                           <th>{t('employees.operational_status')}</th>
                           <th className="text-right px-8">{t('common.actions')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[var(--border-subtle)]/50">
                        {filtered.map((emp) => (
                           <tr key={emp.id} className="hover:bg-[var(--bg-elevated)]/30 transition-all group">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <Avatar user={emp} size={10} />
                                    <div>
                                       <p className="font-bold text-[14px] text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">{emp.fullName}</p>
                                       <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60 italic">{emp.email}</p>
                                    </div>
                                 </div>
                              </td>
                              <td>
                                 <div className="space-y-1.5">
                                    <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border", ROLE_THEMES[emp.role])}>
                                       {t(`employees.roles.${emp.role}`)}
                                    </span>
                                    <p className="text-[11px] font-medium text-[var(--text-secondary)]">{emp.jobTitle} · {emp.departmentObj?.name || t('common.global')}</p>
                                 </div>
                              </td>
                              <td>
                                 <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm", STATUS_THEMES[emp.status])}>
                                    {t(`employees.statuses.${emp.status}`)}
                                 </span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => openView(emp)} className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all flex items-center justify-center">
                                       <Eye size={16} />
                                    </button>
                                    {isAdmin && (
                                       <button onClick={() => openEdit(emp)} className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-subtle)] transition-all flex items-center justify-center">
                                          <Edit2 size={16} />
                                       </button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Initialize Form Modal Architecture */}
      <AnimatePresence>
        {(modal === 'create' || modal === 'edit') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="w-full max-w-4xl bg-[var(--bg-card)] rounded-[3rem] border border-[var(--border-subtle)] shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="px-10 py-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-between items-center">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 shadow-lg">
                       <ShieldCheck className="text-[var(--primary)]" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase">{modal === 'create' ? t('employees.personnel_deployment') : t('employees.edit_dossier')}</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mt-1 opacity-60">{t('employees.config_sequence')}</p>
                    </div>
                 </div>
                 <button onClick={() => setModal(null)} className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSave(form); }} id="emp-form" className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                 {error && <div className="px-5 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] font-black uppercase tracking-widest">{error}</div>}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] border-b border-[var(--primary)]/10 pb-4">{t('employees.ident')}</h3>
                       <FormField label={t('employees.full_name')} value={form.fullName} onChange={(e: any) => setForm({ ...form, fullName: e.target.value })} required placeholder={t('employees.legal_full_name')} />
                       <FormField label={t('employees.sys_email')} type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} required placeholder="personnel@nexus-hrm.com" />
                       <FormField label={t('employees.job_title')} value={form.jobTitle} onChange={(e: any) => setForm({ ...form, jobTitle: e.target.value })} required placeholder="e.g. Senior Strategist" />
                       <div className="grid grid-cols-2 gap-6">
                          <FormField label={t('employees.base_salary')} type="number" value={form.salary} onChange={(e: any) => setForm({ ...form, salary: e.target.value })} />
                          <FormField label={t('employees.currency')}>
                             <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                                <option value="GHS">GHS</option>
                                <option value="GNF">GNF</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                             </select>
                          </FormField>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--primary)] border-b border-[var(--primary)]/10 pb-4">{t('employees.rank_assign')}</h3>
                       <FormField label={t('employees.sys_rank')}>
                          <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[13px] font-black uppercase tracking-widest focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                             {ROLES.map(r => <option key={r} value={r}>{t(`employees.roles.${r}`)}</option>)}
                          </select>
                       </FormField>
                       <FormField label={t('employees.dept')}>
                          <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.departmentId || ''} onChange={e => setForm({ ...form, departmentId: e.target.value ? parseInt(e.target.value) : null })}>
                             <option value="">{t('common.global')}</option>
                             {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                       </FormField>
                       <FormField label={t('employees.primary_mgr')}>
                          <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[13px] font-bold focus:border-[var(--primary)] outline-none appearance-none cursor-pointer" value={form.supervisorId} onChange={e => setForm({ ...form, supervisorId: e.target.value })}>
                             <option value="">{t('common.independent')}</option>
                             {supervisors.filter((s: any) => s.id !== selected?.id).map((s: any) => (
                                <option key={s.id} value={s.id}>{s.fullName} ({t(`employees.roles.${s.role}`)})</option>
                             ))}
                          </select>
                       </FormField>
                       <FormField label={t('employees.deploy_date')} type="date" value={form.joinDate} onChange={(e: any) => setForm({ ...form, joinDate: e.target.value })} />
                    </div>
                 </div>
              </form>

              <div className="px-10 py-10 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/30 flex justify-end gap-5">
                 <button onClick={() => setModal(null)} className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">{t('employees.abort')}</button>
                 <button type="submit" form="emp-form" disabled={saving} className="px-12 py-4 rounded-2xl bg-[var(--primary)] text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all">
                    {saving ? t('common.syncing') : (modal === 'create' ? t('employees.execute_deploy') : t('employees.commit_dossier'))}
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {modal === 'archive' && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setModal(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg bg-[var(--bg-card)] rounded-[3rem] border border-[var(--border-subtle)] p-12 text-center relative z-10 shadow-2xl">
                 <div className="w-20 h-20 mx-auto bg-rose-500/10 text-rose-600 rounded-[2rem] flex items-center justify-center mb-8 border border-rose-500/20">
                    <Archive size={32} />
                 </div>                  <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-4">{t('employees.retire_personnel')}</h3>
                  <p className="text-[var(--text-secondary)] text-sm mb-10 leading-relaxed font-medium">
                     {t('employees.retirement_desc', { name: selected?.fullName })}
                  </p>
                  <div className="flex gap-4">
                     <button onClick={() => setModal(null)} className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-all">{t('common.cancel')}</button>
                     <button onClick={handleArchive} disabled={saving} className="flex-[2] py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-rose-600 text-white shadow-2xl shadow-rose-600/30 hover:bg-rose-500 transition-all">
                        {saving ? t('common.syncing') : t('employees.confirm_retirement')}
                     </button>
                  </div> 
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
