import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Users, Mail, Phone, MapPin, Briefcase, DollarSign, FileText, Upload, Shield, AlertTriangle, Calendar, ArrowLeft, Camera, Edit2, ShieldCheck, Activity, Globe, Package, History, X, Save, Building, Hash, Loader2 } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import DocumentVault from '../components/employee/DocumentVault';
import QueryManager from '../components/employee/QueryManager';

interface EmployeeProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  jobTitle: string;
  employeeCode?: string;
  status: string;
  dob?: string;
  gender?: string;
  nationalId?: string;
  contactNumber?: string;
  address?: string;
  avatarUrl?: string;
  nextOfKinName?: string;
  nextOfKinRelation?: string;
  nextOfKinContact?: string;
  salary?: string;
  currency?: 'USD' | 'GHS' | 'EUR' | 'GBP' | 'GNF';
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  ssnitNumber?: string;
  nationalIdDocUrl?: string;
  riskScore?: number;
}

const EmployeeProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('nexus_user') || '{}') as { role?: string };
  const isAdmin = ['ADMIN', 'HR_ADMIN', 'MD', 'IT_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'SUPERVISOR'].includes(currentUser?.role || '');
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<Partial<EmployeeProfile>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get(`/users/${id}`);
      const data = res.data;
      if (data?.id) {
        try {
          const riskRes = await api.get(`/users/${data.id}/risk-profile`);
          data.riskScore = riskRes.data?.score ?? data.riskScore;
        } catch (e) {
          console.error('Telemetric risk sync failed', e);
        }
      }
      setEmployee(data);
      setFormData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Note: handleUpdateProfile was moved directly into the EditProfileModal onSave prop

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setUploading(true);
      try {
        await api.post(`/users/${id}/avatar`, { image: base64 });
        fetchProfile();
      } catch (err) {
        console.error(err);
      } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleArchiveEmployee = async () => {
    if (!isAdmin) return;
    const confirmResult = window.confirm(
      `Are you sure you want to archive ${employee?.fullName}? \n\nThis will remove them from the active directory and revoke their access, but permanently save their records.`
    );
    if (!confirmResult) return;

    try {
      await api.delete(`/users/${id}`);
      navigate(-1);
    } catch (err) {
      console.error('Failed to archive employee:', err);
      alert('Failed to archive employee. Please try again.');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Loading profile...</p>
    </div>
  );

  if (!employee) return <div className="p-8 text-center text-rose-500 font-black uppercase tracking-widest">Error: Employee Not Found</div>;

  const tabs = [
    { id: 'OVERVIEW', label: 'Overview', icon: Activity },
    { id: 'PROFESSIONAL', label: 'Professional', icon: Globe },
    { id: 'DOCUMENTS', label: 'Documents', icon: FileText },
    { id: 'QUERIES', label: 'Disciplinary', icon: AlertTriangle },
    { id: 'ASSETS', label: 'Assets', icon: Package },
    { id: 'HISTORY', label: 'History', icon: History },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 page-enter pb-32">
      <button onClick={() => navigate(-1)} className="group flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary-light transition-all">
        <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Directory
      </button>

      {/* Premium Header Architecture */}
      <div className="glass rounded-[2rem] border-white/[0.05] relative overflow-hidden bg-[#0a0f1e]/80">
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-b border-white/[0.03]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative pt-24 pb-12 px-12 flex flex-col md:flex-row items-end md:items-center gap-10">
          <div className="relative group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="w-44 h-44 rounded-[2.5rem] border-4 border-[#0a0f1e] shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-slate-900 overflow-hidden flex-shrink-0 relative group-hover:border-primary/50 transition-all duration-500"
            >
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt={employee.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white bg-gradient-to-br from-primary to-accent">
                  {employee.fullName[0]}
                </div>
              )}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
                  >
                    <Loader2 size={24} className="animate-spin text-primary-light" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Uploading...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 w-12 h-12 bg-primary text-white p-3 rounded-2xl shadow-2xl hover:bg-primary-light hover:scale-110 transition-all border border-white/20"
            >
              <Camera size={20} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>

          <div className="flex-1 pb-4">
            <div className="flex items-center gap-4 mb-3">
              <h1 className="text-5xl font-black text-white font-display tracking-tight">{employee.fullName}</h1>
              {employee.riskScore && employee.riskScore >= 50 && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-amber-500/30 flex items-center"
                >
                  <AlertTriangle size={14} className="mr-2" /> Needs Attention
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-5 text-slate-400">
              <p className="text-xl font-medium tracking-tight whitespace-nowrap">{employee.jobTitle} <span className="text-primary-light mx-2">/</span> {employee.department}</p>
              <div className="w-px h-5 bg-white/10 hidden md:block" />
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">{employee.status}</span>
                <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary-light">{employee.role}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => window.print()}
              className="glass px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white border-white/[0.05] border hover:border-white/10"
            >
              <FileText size={16} className="mb-1 block mx-auto" /> Print File
            </motion.button>
            {isAdmin && employee.status !== 'ARCHIVED' && (
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleArchiveEmployee}
                className="glass px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 transition-all"
              >
                <X size={16} className="mb-1 block mx-auto" /> Archive
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowEditModal(true)}
              className="btn-primary px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
            >
              <Edit2 size={16} className="mb-1 block mx-auto" /> Edit Profile
            </motion.button>
          </div>
        </div>

        {/* Tab Navigation Architecture */}
        <div className="px-12 flex gap-10 border-t border-white/[0.03] bg-white/[0.01]">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] border-t-2 transition-all relative overflow-hidden",
                  activeTab === tab.id ? "border-primary text-primary-light" : "border-transparent text-slate-500 hover:text-slate-300"
                )}
              >
                <Icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="tab-underline" className="absolute top-0 left-0 right-0 h-0.5 bg-primary-light" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Architecture */}
      <div className="grid grid-cols-1 gap-10">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-12 border-white/[0.05] bg-[#0a0f1e]/40"
        >
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
              <section className="space-y-8">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-primary-light" />
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Personal Information</h3>
                </div>
                <div className="space-y-6">
                  <InfoField label="Employee ID" value={employee.employeeCode || 'UNASSIGNED'} icon={Briefcase} />
                  <InfoField label="Email Address" value={employee.email} icon={Mail} />
                  <InfoField label="Phone Number" value={employee.contactNumber || 'N/A'} icon={Phone} />
                  <InfoField label="Address" value={employee.address || 'N/A'} icon={MapPin} />
                  <InfoField label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString() : 'N/A'} icon={Calendar} />
                  <InfoField label="National ID (Ghana Card)" value={employee.nationalId || 'N/A'} icon={FileText} />
                  <InfoField label="SSNIT Number" value={employee.ssnitNumber || 'N/A'} icon={Hash} />
                </div>
              </section>
              <section className="space-y-8">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-primary-light" />
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Emergency Contact</h3>
                </div>
                <div className="space-y-6 p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.03]">
                  <InfoField label="Name" value={employee.nextOfKinName} />
                  <InfoField label="Relationship" value={employee.nextOfKinRelation} />
                  <InfoField label="Contact Number" value={employee.nextOfKinContact} />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'PROFESSIONAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
              <section className="space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Job Details</h3>
                <div className="space-y-6">
                  <InfoField label="Department" value={employee.department} />
                  <InfoField label="Role" value={employee.role} />
                  <InfoField label="Status" value={employee.status} />
                </div>
              </section>
              <section className="space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white flex items-center gap-3"><Building size={18} className="text-primary-light" /> Banking Details</h3>
                <div className="space-y-6">
                  <InfoField label="Bank Name" value={employee.bankName} />
                  <InfoField label="Account Number" value={employee.bankAccountNumber} />
                  <InfoField label="Branch" value={employee.bankBranch} />
                </div>
              </section>
              <section className="space-y-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Compensation</h3>
                {employee.salary ? (
                  <div className="space-y-4">
                    <div className="p-10 rounded-[2.5rem] bg-primary/5 border border-primary/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <DollarSign size={80} className="text-primary-light" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary-light mb-4">Monthly Base Salary</p>
                      <div className="text-5xl font-black text-white font-display tracking-tight">
                        <span className="text-2xl text-primary-light mr-2">{employee.currency}</span>
                        {parseFloat(employee.salary).toLocaleString()}
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => navigate('/payroll')} className="w-full py-4 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2">
                        <Activity size={14} /> Manage Bonuses & Deductions
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/10 text-center">
                    <Shield size={40} className="mx-auto mb-4 text-slate-700" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Manager or HR access is required to view salary.</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'DOCUMENTS' && (
            <DocumentVault employeeId={employee.id} isAdmin={isAdmin} />
          )}

          {activeTab === 'QUERIES' && (
            <QueryManager employeeId={employee.id} isAdmin={isAdmin} />
          )}
        </motion.div>
      </div>

      {/* ── Edit Profile Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal
            initialData={employee}
            onSave={async (updatedData) => {
              try {
                await api.put(`/users/${id}`, updatedData);
                setShowEditModal(false);
                fetchProfile();
              } catch (err) {
                console.error(err);
              }
            }}
            onCancel={() => setShowEditModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const EditProfileModal = ({ initialData, onSave, onCancel }: { initialData: any, onSave: (d: any) => Promise<void>, onCancel: () => void }) => {
  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass w-full max-w-4xl bg-[#0a0f1e]/90 border-white/[0.05] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-white/[0.05] bg-white/[0.02] flex justify-between items-center">
          <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">Edit Profile</h2>
          <button onClick={onCancel} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
          <form onSubmit={handleSubmit} id="edit-profile-form" className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

              {/* Personal Details */}
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-light border-b border-primary/20 pb-2">Personal Information</p>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
                  <input type="text" className="nx-input" value={formData.contactNumber || ''} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Gender</label>
                  <select className="nx-input appearance-none" value={formData.gender || ''} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="">Unspecified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Date of Birth</label>
                  <input type="date" className="nx-input" value={formData.dob ? formData.dob.split('T')[0] : ''} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Address / Hometown</label>
                  <input type="text" className="nx-input" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Ghana Card (National ID)</label>
                  <input type="text" className="nx-input" value={formData.nationalId || ''} onChange={e => setFormData({ ...formData, nationalId: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">SSNIT Number</label>
                  <input type="text" className="nx-input" value={formData.ssnitNumber || ''} onChange={e => setFormData({ ...formData, ssnitNumber: e.target.value })} />
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 border-b border-emerald-500/20 pb-2">Banking Details</p>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Bank Name</label>
                  <input type="text" className="nx-input" value={formData.bankName || ''} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Account Number</label>
                  <input type="text" className="nx-input" value={formData.bankAccountNumber || ''} onChange={e => setFormData({ ...formData, bankAccountNumber: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Branch</label>
                  <input type="text" className="nx-input" value={formData.bankBranch || ''} onChange={e => setFormData({ ...formData, bankBranch: e.target.value })} />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-6 md:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 border-b border-cyan-500/20 pb-2">Emergency Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Name</label>
                    <input type="text" className="nx-input" value={formData.nextOfKinName || ''} onChange={e => setFormData({ ...formData, nextOfKinName: e.target.value })} />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Relationship</label>
                    <input type="text" className="nx-input" value={formData.nextOfKinRelation || ''} onChange={e => setFormData({ ...formData, nextOfKinRelation: e.target.value })} />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Contact Number</label>
                    <input type="text" className="nx-input" value={formData.nextOfKinContact || ''} onChange={e => setFormData({ ...formData, nextOfKinContact: e.target.value })} />
                  </div>
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="p-8 border-t border-white/[0.05] bg-white/[0.02] flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancel</button>
          <button form="edit-profile-form" type="submit" disabled={saving} className="btn-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const InfoField = ({ label, value, icon: Icon }: { label: string, value?: string, icon?: any }) => (
  <div className="group flex items-start gap-4">
    {Icon && (
      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-slate-600 group-hover:bg-primary/10 group-hover:text-primary-light transition-all">
        <Icon size={16} />
      </div>
    )}
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-300 tracking-tight group-hover:text-white transition-colors">{value || 'N/A'}</p>
    </div>
  </div>
);

export default EmployeeProfilePage;
