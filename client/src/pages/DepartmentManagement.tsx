import React, { useEffect, useState } from 'react';
import { Building2, Plus, X, Loader2, Users, Edit2, ShieldCheck, Trash2, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { getRankFromRole, getStoredUser } from '../utils/session';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [managingMembers, setManagingMembers] = useState<any>(null);
  const [managingSubUnits, setManagingSubUnits] = useState<any>(null);
  const [subUnits, setSubUnits] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ name: '', managerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentUser = getStoredUser();
  const canDelete = (getRankFromRole(currentUser.role) >= 80);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, eRes, sRes] = await Promise.all([
        api.get('/departments'), 
        api.get('/users'),
        api.get('/sub-units')
      ]);
      setDepartments(Array.isArray(dRes.data) ? dRes.data : []);
      setEmployees(eRes.data || []);
      setSubUnits(Array.isArray(sRes.data) ? sRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', managerId: '' }); setError(''); setShowModal(true); };
  const openEdit = (dept: any) => { setEditing(dept); setForm({ name: dept.name, managerId: dept.managerId || '' }); setError(''); setShowModal(true); };

  const handleDelete = async (dept: any) => {
    if (!confirm(`Are you sure you want to delete the ${dept.name} department?`)) return;
    
    setSaving(true);
    try {
      await api.delete(`/departments/${dept.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete department');
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (userId: string, deptId: number | null) => {
    try {
      await api.patch(`/users/${userId}`, { departmentId: deptId });
      fetchData();
    } catch (err: any) {
      alert('Failed to transfer employee');
    }
  };

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
      setError(err?.response?.data?.message || 'Department assignment failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-8 page-enter min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight">Department <span className="text-[var(--primary)]">Management</span></h1>
          <p className="text-[14px] font-medium text-[var(--text-secondary)] mt-2 flex items-center gap-2">
            <Building2 size={14} className="text-[var(--primary)]" />
            {departments.length} Active Departments
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={openCreate}
        >
          <Plus size={18} /> Add Department
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
          <p className="text-[12px] font-medium text-[var(--text-muted)]">Loading departments...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {departments.map((dept: any, idx) => (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="nx-card p-6 group h-full"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] text-[var(--primary)] group-hover:border-[var(--primary)]/30 transition-colors">
                    <Building2 size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(dept)}
                      className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all hover:border-[var(--primary)]/30"
                    >
                      <Edit2 size={14} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(dept)}
                        className="w-8 h-8 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500/50 hover:text-rose-500 transition-all hover:bg-rose-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight mb-6">{dept.name}</h3>

                <div className="space-y-4">
                  {dept.manager ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/20 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center text-xs font-bold text-white">
                        {dept.manager.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Manager</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{dept.manager.fullName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-600">
                      <ShieldCheck size={18} className="opacity-50" />
                      <p className="text-[11px] font-bold uppercase tracking-wider">No Manager Assigned</p>
                    </div>
                  )}

                   <div className="flex items-center justify-between gap-4 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border-subtle)] group-hover:border-[var(--primary)]/30 transition-all">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      <Users size={14} className="text-[var(--primary)]" />
                      <span>{dept.memberCount || 0} Members</span>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setManagingSubUnits(dept)}
                        className="text-[10px] font-bold text-[var(--primary)] hover:underline"
                      >
                        Sub-Units
                      </button>
                      <button
                        onClick={() => setManagingMembers(dept)}
                        className="text-[10px] font-bold text-[var(--primary)] hover:underline"
                      >
                        Team
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {departments.length === 0 && (
            <div className="col-span-full text-center py-20 nx-card border-dashed">
              <Building2 size={40} className="mx-auto mb-4 text-[var(--text-muted)] opacity-20" />
              <p className="text-lg font-bold text-[var(--text-primary)]">No Departments Found</p>
              <p className="text-[13px] text-[var(--text-secondary)]">Start by creating your first department.</p>
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="nx-card w-full max-w-lg bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl shadow-black/20"
            >
              <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {editing ? 'Edit Department' : 'Create Department'}
                  </h2>
                  <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">Define department name and leadership</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={16} /></button>
              </div>

              <div className="p-8 space-y-6">
                {error && <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[12px] font-bold uppercase tracking-wider">{error}</div>}
                <form id="dept-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Department Name *</label>
                    <input type="text" className="nx-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Assign Manager</label>
                    <div className="relative">
                      <select className="nx-input appearance-none pr-10" value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}>
                        <option value="">-- No Manager Assigned --</option>
                        {employees.filter(e => getRankFromRole(e.role) >= 70).map(e => (
                          <option key={e.id} value={e.id}>{e.fullName} / {e.jobTitle}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
                <button form="dept-form" type="submit" className="btn-primary min-w-[120px]" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>{saving ? 'Saving...' : 'Save Department'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Members Modal */}
      <AnimatePresence>
        {managingMembers && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setManagingMembers(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="nx-card w-full max-w-5xl max-h-[85vh] bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl shadow-black/30"
            >
              <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex justify-between items-center text-[var(--text-primary)]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] text-[var(--primary)]">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Management: {managingMembers.name}</h2>
                    <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">{managingMembers.memberCount || 0} Team Members</p>
                  </div>
                </div>
                <button onClick={() => setManagingMembers(null)} className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={16} /></button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                <div className="w-1/2 p-8 border-r border-[var(--border-subtle)] flex flex-col gap-6">
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] mb-4 ml-1">Add Members</h4>
                    <input 
                      type="text" 
                      className="nx-input" 
                      placeholder="Search employees..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {employees
                      .filter(e => e.departmentId !== managingMembers.id && e.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[11px] font-bold text-[var(--text-muted)]">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[var(--text-primary)]">{emp.fullName}</p>
                              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{emp.jobTitle}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleTransfer(emp.id, managingMembers.id)}
                            className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="w-1/2 p-8 flex flex-col gap-6 bg-[var(--bg-elevated)]/20">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 ml-1">Current Team</h4>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {employees
                      .filter(e => e.departmentId === managingMembers.id)
                      .map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--primary)]/20 group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[11px] font-bold">
                              {emp.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[var(--text-primary)]">{emp.fullName}</p>
                              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{emp.jobTitle}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleTransfer(emp.id, null)}
                            className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Sub-Units Modal */}
      <AnimatePresence>
        {managingSubUnits && (
          <SubUnitModal 
            department={managingSubUnits}
            subUnits={subUnits.filter(su => su.departmentId === managingSubUnits.id)}
            employees={employees}
            onClose={() => setManagingSubUnits(null)}
            onRefresh={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const SubUnitModal = ({ department, subUnits, employees, onClose, onRefresh }: any) => {
  const [localSubUnits, setLocalSubUnits] = useState(subUnits);
  const [editingSU, setEditingSU] = useState<any>(null);
  const [form, setForm] = useState({ name: '', managerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/sub-units', { ...form, departmentId: department.id });
      setForm({ name: '', managerId: '' });
      onRefresh();
      // Refetch local
      const res = await api.get('/sub-units', { params: { departmentId: department.id } });
      setLocalSubUnits(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create sub-unit');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.patch(`/sub-units/${editingSU.id}`, form);
      setEditingSU(null);
      setForm({ name: '', managerId: '' });
      onRefresh();
      const res = await api.get('/sub-units', { params: { departmentId: department.id } });
      setLocalSubUnits(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update sub-unit');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/sub-units/${id}`);
      onRefresh();
      const res = await api.get('/sub-units', { params: { departmentId: department.id } });
      setLocalSubUnits(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete');
    }
  };

  const startEdit = (su: any) => {
    setEditingSU(su);
    setForm({ name: su.name, managerId: su.managerId || '' });
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="nx-card w-full max-w-5xl max-h-[85vh] bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl shadow-black/30"
      >
        <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 flex justify-between items-center text-[var(--text-primary)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--border-subtle)] text-[var(--primary)]">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {department.name} <span className="text-[var(--primary)]">Sub-Units</span>
              </h2>
              <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">{localSubUnits.length} Organizational Units</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={16} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 p-8 border-r border-[var(--border-subtle)] overflow-y-auto custom-scrollbar space-y-3">
            {localSubUnits.map((su: any) => (
              <div key={su.id} className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] group hover:border-[var(--primary)]/30 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-[var(--text-primary)]">{su.name}</h4>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => startEdit(su)} className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)]"><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(su.id)} className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <div className="px-2 py-0.5 rounded-lg bg-[var(--primary)]/5 text-[var(--primary)] border border-[var(--primary)]/10">
                    {su.memberCount} MEMBERS
                  </div>
                  {su.manager && <span className="opacity-60">• Manager: {su.manager.fullName}</span>}
                </div>
              </div>
            ))}
            {localSubUnits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                <Building2 size={40} className="mb-2" />
                <p className="text-[11px] font-bold uppercase tracking-wider">No units defined</p>
              </div>
            )}
          </div>

          <div className="w-1/2 p-8 bg-[var(--bg-elevated)]/20">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] mb-6 ml-1">
              {editingSU ? 'Edit Sub-Unit' : 'Create Sub-Unit'}
            </h3>
            {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[12px] font-bold">{error}</div>}
            <form onSubmit={editingSU ? handleUpdate : handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Unit Name</label>
                <input type="text" className="nx-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Frontend Team" />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Unit Manager</label>
                <div className="relative">
                  <select className="nx-input appearance-none pr-10" value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})}>
                    <option value="">-- No Manager Assigned --</option>
                    {employees.filter((e: any) => e.departmentId === department.id).map((e: any) => (
                      <option key={e.id} value={e.id}>{e.fullName} ({e.jobTitle})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                {editingSU && (
                  <button type="button" onClick={() => { setEditingSU(null); setForm({name: '', managerId: ''}); }} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
                )}
                <button type="submit" disabled={saving} className="btn-primary flex-[2] min-h-[44px]">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>{saving ? 'Saving...' : 'Save Unit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DepartmentManagement;
