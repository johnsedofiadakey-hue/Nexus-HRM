import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, Edit2, Trash2, Camera, Shield,
  ChevronDown, X, Loader2, CheckCircle, UserCheck, RotateCcw,
  Mail, Phone, Building, Calendar, AlertTriangle, Eye, ArrowRight, Filter, Activity, Archive
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const ROLES = ['EMPLOYEE', 'SUPERVISOR', 'HR_ADMIN', 'IT_ADMIN', 'MD'];
const ROLE_LABELS: Record<string, string> = {
  MD: 'Managing Director', HR_ADMIN: 'HR Admin', IT_ADMIN: 'IT Admin',
  SUPERVISOR: 'Supervisor', EMPLOYEE: 'Employee', SUPER_ADMIN: 'System Admin'
};
const ROLE_COLORS: Record<string, string> = {
  MD: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  HR_ADMIN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  IT_ADMIN: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  SUPERVISOR: 'bg-primary/10 text-primary-light border-primary/20',
  EMPLOYEE: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  SUPER_ADMIN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PROBATION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  NOTICE_PERIOD: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TERMINATED: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

const EMPTY_FORM = {
  fullName: '', email: '', password: '', role: 'EMPLOYEE', jobTitle: '',
  department: '', supervisorId: '', employmentType: 'Permanent', gender: '',
  contactNumber: '', employeeCode: '', joinDate: '', salary: '', currency: 'GHS',
  nationalId: '', address: '', dob: ''
};

const Avatar = ({ user, size = 10 }: { user: any; size?: number }) => (
  user?.avatarUrl
    ? <img src={user.avatarUrl} alt={user.fullName} className={cn(`w-${size} h-${size} rounded-2xl object-cover ring-2 ring-white/5`)} />
    : <div className={cn(`w-${size} h-${size} rounded-2xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-lg`)}
      style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', fontSize: size * 1.5 }}>
      {(user?.fullName || '?')[0]}
    </div>
);

const FormField = ({ label, name, type = 'text', required = false, value, onChange, children }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}{required && ' *'}</label>
    {children || <input type={type} className="nx-input" required={required}
      value={value || ''} onChange={onChange} />}
  </div>
);

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'role' | 'archive' | 'hard_delete' | 'view' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [roleForm, setRoleForm] = useState({ role: '', supervisorId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const isMD = user.role === 'MD';
  const isAdmin = ['MD', 'HR_ADMIN', 'IT_ADMIN'].includes(user.role);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, supRes, depRes] = await Promise.all([
        api.get('/employees'),
        api.get('/employees/supervisors'),
        api.get('/departments'),
      ]);
      setEmployees(empRes.data);
      setSupervisors(supRes.data);
      setDepartments(depRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const flash = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  const openEdit = (emp: any) => {
    setSelected(emp);
    setForm({
      fullName: emp.fullName || '', email: emp.email || '', password: '',
      role: emp.role || 'EMPLOYEE', jobTitle: emp.jobTitle || '',
      department: emp.departmentId || '', supervisorId: emp.supervisorId || '',
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
  const openRole = (emp: any) => { setSelected(emp); setRoleForm({ role: emp.role, supervisorId: emp.supervisorId || '' }); setModal('role'); };
  const openView = (emp: any) => navigate(`/employees/${emp.id}`);
  const openArchive = (emp: any) => { setSelected(emp); setModal('archive'); };
  const openHardDelete = (emp: any) => { setSelected(emp); setModal('hard_delete'); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (modal === 'create') {
        await api.post('/employees', form);
        flash('Success: Employee profile created.');
      } else {
        await api.put(`/employees/${selected.id}`, form);
        flash('Success: Employee record updated.');
      }
      setModal(null); fetchAll();
    } catch (err: any) { setError(err?.response?.data?.message || 'Protocol Error: Sync failed'); }
    finally { setSaving(false); }
  };

  const handleRoleAssign = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/employees/assign-role', { userId: selected.id, ...roleForm });
      flash(`Role Updated: Employee changed to ${roleForm.role}.`);
      setModal(null); fetchAll();
    } catch (err: any) { setError(err?.response?.data?.error || 'Authorization protocol failed'); }
    finally { setSaving(false); }
  };

  const handlePasswordReset = async (empId: string, name: string) => {
    if (!confirm(`Reset password for ${name}? A new temporary password will be created.`)) return;
    setResettingId(empId);
    try {
      const res = await api.post(`/it/users/${empId}/reset-password`);
      flash(`Password reset for ${name}: ${res.data.message}`);
    } catch (err: any) { setError(err?.response?.data?.error || 'Protocol failed'); }
    finally { setResettingId(null); }
  };

  const handleArchive = async () => {
    setSaving(true);
    try {
      await api.delete(`/employees/${selected.id}`);
      flash(`Archived: Profile for ${selected.fullName} has been retired.`);
      setModal(null); fetchAll();
    } catch (err: any) { setError(err?.response?.data?.message || 'Archive failed'); }
    finally { setSaving(false); }
  };

  const handleHardDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/employees/${selected.id}/hard`);
      flash(`Deleted: Profile for ${selected.fullName} has been permanently removed.`);
      setModal(null); fetchAll();
    } catch (err: any) { setError(err?.response?.data?.message || 'Delete failed'); }
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
          flash('Profile picture updated.');
        } catch { flash('Upload failed.'); }
        finally { setUploading(null); }
      };
      reader.readAsDataURL(file);
    } catch { setUploading(null); }
  };

  const filtered = employees.filter(emp => {
    const q = search.toLowerCase();
    const matchSearch = !q || [emp.fullName, emp.email, emp.jobTitle, emp.employeeCode].some(f => f?.toLowerCase().includes(q));
    const matchRole = !filterRole || emp.role === filterRole;
    const matchStatus = !filterStatus || emp.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-8 page-enter min-h-screen">
      {/* Header Architecture */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight">Employees</h1>
          <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
            <Users size={14} className="text-primary-light" />
            Total: <span className="text-white font-bold">{employees.length}</span> ·
            Active: <span className="text-emerald-400 font-bold">{employees.filter(e => e.status === 'ACTIVE').length}</span>
          </p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs"
            onClick={openCreate}
          >
            <Plus size={18} /> Add Employee
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/5"
          >
            <CheckCircle size={18} /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telemetric Filters */}
      <div className="glass p-5 flex flex-wrap gap-4 border-white/[0.05]">
        <div className="relative flex-1 min-w-[300px] group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input type="text" className="nx-input pl-12 py-3.5 bg-white/[0.02] border-white/5 focus:bg-white/[0.05]" placeholder="Search name, email, or role..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="relative group">
          <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none" />
          <select className="nx-input pl-10 w-auto min-w-[160px] py-3.5 bg-white/[0.02] border-white/5 appearance-none text-xs font-black uppercase tracking-widest" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Global Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div className="relative group">
          <Activity size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none" />
          <select className="nx-input pl-10 w-auto min-w-[160px] py-3.5 bg-white/[0.02] border-white/5 appearance-none text-xs font-black uppercase tracking-widest" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'TERMINATED', 'ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Data Visualization Grid */}
      <div className="glass overflow-hidden border-white/[0.05]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="nx-table">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Employee</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Role</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Department</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Contact</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              <AnimatePresence>
                {filtered.map((emp, i) => (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/[0.02] transition-all group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <Avatar user={emp} size={11} />
                          {isAdmin && (
                            <div className="absolute inset-0 rounded-2xl bg-primary/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                              onClick={() => fileInputRefs.current[emp.id]?.click()}>
                              {uploading === emp.id ? <Loader2 size={16} className="animate-spin text-white" /> : <Camera size={16} className="text-white" />}
                            </div>
                          )}
                          <input type="file" accept="image/*" className="hidden"
                            ref={el => { fileInputRefs.current[emp.id] = el; }}
                            onChange={e => e.target.files?.[0] && handleAvatarUpload(emp.id, e.target.files[0])} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-primary-light transition-colors">{emp.fullName}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{emp.jobTitle} · <span className="text-slate-600">{emp.employeeCode}</span></p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", ROLE_COLORS[emp.role])}>
                        {ROLE_LABELS[emp.role] || emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-400">{emp.department || 'GLOBAL'}</td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-medium text-slate-300">{emp.email}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">{emp.contactNumber || 'NO_UPLINK'}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm", STATUS_COLORS[emp.status])}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openView(emp)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-slate-500 hover:text-white hover:border-white/10 transition-all">
                          <Eye size={16} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => openEdit(emp)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary-light hover:bg-primary/20 transition-all">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {['MD', 'HR_ADMIN'].includes(user.role) && emp.role !== 'MD' && (
                          <>
                            <button
                              onClick={() => handlePasswordReset(emp.id, emp.fullName)}
                              disabled={resettingId === emp.id}
                              title="Reset Password"
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all"
                            >
                              {resettingId === emp.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                            </button>
                            <button onClick={() => openArchive(emp)} title="Archive Employee" className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-500 hover:bg-slate-500/20 hover:text-white transition-all">
                              <Archive size={16} />
                            </button>
                            <button onClick={() => openHardDelete(emp)} title="Permanently Delete Employee" className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 hover:text-white transition-all">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Personnel Deployment Modals ──────────────────────────────────────────── */}
      <AnimatePresence>
        {(modal === 'create' || modal === 'edit') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass w-full max-w-4xl bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center">
                <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">
                  {modal === 'create' ? 'Add Employee' : `Edit Employee — ${selected?.fullName}`}
                </h2>
                <button onClick={() => setModal(null)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest">{error}</div>}

                <form onSubmit={handleSave} id="emp-form" className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-light border-b border-primary/20 pb-2">Basic Info</p>
                      <FormField label="Full Name" name="fullName" value={form.fullName} onChange={(e: any) => setForm(f => ({ ...f, fullName: e.target.value }))} required />
                      <FormField label="Email Address" name="email" type="email" value={form.email} onChange={(e: any) => setForm(f => ({ ...f, email: e.target.value }))} required />
                      {modal === 'create' && (
                        <>
                          <FormField label="Initial Password" name="password" type="password" value={form.password} onChange={(e: any) => setForm(f => ({ ...f, password: e.target.value }))} />
                        </>
                      )}
                      <FormField label="Job Title" name="jobTitle" value={form.jobTitle} onChange={(e: any) => setForm(f => ({ ...f, jobTitle: e.target.value }))} required />
                    </div>
                    <div className="space-y-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-light border-b border-primary/20 pb-2">Employment Details</p>
                      <FormField label="Employee ID" name="employeeCode" value={form.employeeCode} onChange={(e: any) => setForm(f => ({ ...f, employeeCode: e.target.value }))} />
                      <FormField label="Join Date" name="joinDate" type="date" value={form.joinDate} onChange={(e: any) => setForm(f => ({ ...f, joinDate: e.target.value }))} />
                      <FormField label="Role">
                        <select className="nx-input appearance-none" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Department">
                        <select className="nx-input appearance-none" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                          <option value="">Select department</option>
                          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </FormField>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-white/[0.05] bg-white/[0.02] flex justify-end gap-4">
                <button type="button" onClick={() => setModal(null)} className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
                <button form="emp-form" type="submit" className="btn-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20" disabled={saving}>
                  {saving ? 'Saving...' : (modal === 'create' ? 'Create Employee' : 'Save Changes')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {modal === 'archive' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass w-full max-w-md bg-[#0a0f1e]/90 p-8 text-center relative pointer-events-auto">
              <div className="w-20 h-20 mx-auto bg-slate-500/10 text-slate-500 rounded-full flex items-center justify-center mb-6 border border-slate-500/20">
                <Archive size={32} />
              </div>
              <h3 className="text-2xl font-black text-white font-display tracking-tight mb-2">Archive Employee?</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                You are about to archive the profile for <span className="text-white font-bold">{selected?.fullName}</span>. This will immediately revoke their access and hide them from the active directory, but all their records and history will be permanently retained.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setModal(null)} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-white/[0.02] transition-colors">Cancel</button>
                <button onClick={handleArchive} disabled={saving} className="flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-slate-500 text-white shadow-xl shadow-slate-500/20 hover:bg-slate-400 transition-colors">
                  {saving ? 'Archiving...' : 'Yes, Archive Profile'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {modal === 'hard_delete' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass w-full max-w-md bg-[#0a0f1e]/90 p-8 text-center relative pointer-events-auto border-rose-500/30">
              <div className="w-20 h-20 mx-auto bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-white font-display tracking-tight mb-2 text-rose-500">Permanently Delete?</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                You are about to permanently delete <span className="text-white font-bold">{selected?.fullName}</span>. This action cannot be undone and will erase all associated records, leaves, documents, and history. If you only want to hide them, use Archive instead.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setModal(null)} className="flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-white/[0.02] transition-colors">Cancel</button>
                <button onClick={handleHardDelete} disabled={saving} className="flex-[2] py-4 rounded-xl font-black uppercase tracking-widest text-[10px] bg-rose-600 text-white shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-colors">
                  {saving ? 'Deleting...' : 'Yes, Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
