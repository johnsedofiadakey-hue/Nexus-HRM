import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mail, Phone, Briefcase, Calendar, 
  Shield, Edit2, ChevronLeft, Download, FileText,
  Activity, Target, Zap, Building
} from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser } from '../utils/session';
import { toast } from '../utils/toast';

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history'>('overview');

    const currentUser = getStoredUser();

    const fetchEmployee = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/employees/${id}`);
            setEmployee(res.data);
        } catch (e) {
            console.error(e);
            toast.error('Identity protocol failure: Record not found');
            navigate('/employees');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchEmployee();
    }, [fetchEmployee]);

    if (loading) {
        return (
            <div className="py-40 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/10 border-t-[var(--primary)] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">Accessing Personnel Dossier</p>
            </div>
        );
    }

    const StatMini = ({ icon: Icon, label, value, color }: any) => (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)]/50">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border-subtle)]", color || 'text-[var(--primary)] bg-[var(--primary)]/5')}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">{label}</p>
                <p className="text-sm font-black text-[var(--text-primary)]">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 pb-32 print:pb-0 print:space-y-6">
            {/* Navigation & Actions */}
            <div className="flex items-center justify-between print:hidden">
                <button onClick={() => navigate('/employees')} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--primary)] transition-all">
                    <ChevronLeft size={18} /> Back to Directory
                </button>
                <div className="flex gap-4">
                    <motion.button onClick={() => window.print()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-6 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2">
                        <Download size={14} /> Export PDF
                    </motion.button>
                    {currentUser.role === 'MD' || currentUser.role === 'DEV' || currentUser.id === employee.id ? (
                        <motion.button onClick={() => navigate('/employees?edit=' + employee.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-8 py-3 rounded-xl bg-[var(--primary)] text-[var(--text-inverse)] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 flex items-center gap-2">
                            <Edit2 size={14} /> Synchronize
                        </motion.button>
                    ) : null}
                </div>
            </div>

            {/* Profile Hero section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="nx-card p-10 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border-[var(--border-subtle)] relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-1/2 h-full bg-[var(--primary)]/5 blur-[120px] skew-x-12 translate-x-1/2 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row gap-10 items-center md:items-start relative z-10">
                    <div className="relative group">
                        {employee.avatarUrl ? (
                            <img src={employee.avatarUrl} alt={employee.fullName} className="w-44 h-44 rounded-3xl object-cover ring-8 ring-[var(--border-subtle)]/30 shadow-2xl transition-transform group-hover:scale-[1.02]" />
                        ) : (
                            <div className="w-44 h-44 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-6xl font-black text-[var(--text-inverse)] shadow-2xl">
                                {employee.fullName[0]}
                            </div>
                        )}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] whitespace-nowrap">
                            RANK: {employee.role}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-6">
                        <div className="space-y-2">
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                                <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tighter uppercase leading-tight">{employee.fullName}</h1>
                                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[9px] font-black tracking-widest">VERIFIED</span>
                            </div>
                            <p className="text-lg font-bold text-[var(--text-secondary)] opacity-80 flex items-center justify-center md:justify-start gap-3">
                                <Briefcase className="text-[var(--primary)]" size={20} />
                                {employee.jobTitle} · <span className="text-[11px] uppercase tracking-[0.2em] font-black opacity-60 italic">{employee.employeeCode}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatMini icon={Mail} label="Email Address" value={employee.email} />
                            <StatMini icon={Phone} label="Phone Number" value={employee.contactNumber || 'None'} />
                            <StatMini icon={Building} label="Department" value={employee.departmentObj?.name || 'Grand Staff'} />
                            <StatMini icon={Calendar} label="Join Date" value={new Date(employee.joinDate).toLocaleDateString([], { month: 'long', year: 'numeric' })} />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Matrix Tabs */}
            <div className="flex border-b border-[var(--border-subtle)]/30 gap-10 print:hidden">
                {(['overview', 'documents', 'history'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        className={cn("pb-6 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative",
                        activeTab === t ? "text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]")}>
                        {t}
                        {activeTab === t && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]" />}
                    </button>
                ))}
            </div>

            {/* Dashboard Content Matrix */}
            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-10"
                    >
                        <div className="lg:col-span-2 space-y-10">
                            <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] group">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)] mb-8 flex items-center gap-3">
                                    <Target className="text-[var(--primary)]" size={16} /> Performance Summary
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Status</p>
                                        <p className="text-[15px] font-black text-[var(--text-primary)]">Active</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Grade</p>
                                        <p className="text-[15px] font-black text-[var(--text-primary)]">Management</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Rank</p>
                                        <p className="text-[15px] font-black text-[var(--text-primary)] italic underline decoration-[var(--primary)]/30 underline-offset-4">{employee.role}</p>
                                    </div>
                                </div>
                                <div className="mt-10 p-6 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] italic text-sm text-[var(--text-secondary)] leading-relaxed">
                                    "Overall performance is consistent and aligns with organizational goals."
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border-[var(--border-subtle)] space-y-6">
                                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] flex items-center gap-3">
                                         <Shield className="text-[var(--primary)] opacity-60" size={14} /> Identification & Bio
                                     </h4>
                                     <div className="space-y-4">
                                         {[
                                             { label: 'Employee ID', value: employee.id.slice(0, 12).toUpperCase() },
                                             { label: 'Gender', value: employee.gender || 'Not Specified' },
                                             { label: 'Date of Birth', value: employee.dob ? new Date(employee.dob).toLocaleDateString() : 'Classified' },
                                             { label: 'Residential Address', value: employee.address || 'Confidential' },
                                             { label: 'Hometown / Town', value: employee.hometown || 'Unspecified' },
                                             { label: 'Marital Status', value: employee.maritalStatus || 'Unspecified' },
                                             { label: 'National ID', value: employee.nationalId || 'None' }
                                         ].map((item, i) => (
                                             <div key={i} className="flex flex-col gap-1 px-4 py-2.5 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)]">
                                                 <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">{item.label}</span>
                                                 <span className="text-[11px] font-bold text-[var(--text-secondary)]">{item.value}</span>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                                 
                                 <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border-[var(--border-subtle)] space-y-6 group">
                                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] flex items-center gap-3 transition-colors group-hover:text-[var(--primary)]">
                                         <Zap size={14} /> Performance Pulse
                                     </h4>
                                     <div className="space-y-8 py-4">
                                         <div className="space-y-3">
                                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                 <span>Strategic Output</span>
                                                 <span className="text-[var(--primary)]">88%</span>
                                             </div>
                                             <div className="h-2 w-full bg-[var(--bg-card)] rounded-full overflow-hidden p-0.5">
                                                 <motion.div initial={{ width: 0 }} animate={{ width: '88%' }} className="h-full bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
                                             </div>
                                         </div>
                                         <div className="space-y-3">
                                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                                 <span>Registry Attendance</span>
                                                 <span className="text-emerald-500">96.5%</span>
                                             </div>
                                             <div className="h-2 w-full bg-[var(--bg-card)] rounded-full overflow-hidden p-0.5">
                                                 <motion.div initial={{ width: 0 }} animate={{ width: '96.5%' }} className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="nx-card p-8 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-[var(--text-inverse)] border-transparent relative overflow-hidden print:!text-[var(--text-primary)] print:!bg-none print:break-inside-avoid">
                                <Activity className="absolute -bottom-6 -right-6 text-white/10 print:hidden" size={120} />
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-8 relative z-10 text-[var(--text-inverse)]/60 print:text-[var(--primary)]">Employment Info</h4>
                                <div className="space-y-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Contract Type</p>
                                            <p className="text-sm font-black">{employee.employmentType || 'Standard'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                            <Zap size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Salary</p>
                                            <p className="text-sm font-black italic">{employee.currency} {Number(employee.salary || 0).toLocaleString()}/yr</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/10 space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-inverse)]/50">Bank Details</p>
                                        <p className="text-[11px] font-bold">{employee.bankName || 'Awaiting Details'}</p>
                                        <p className="text-[11px] opacity-70 break-all">{employee.bankAccountNumber || 'No Account Number'} ({employee.bankBranch || '?'})</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="nx-card p-8 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-primary)]">Reporting Hierarchy</h4>
                                <div className="space-y-6">
                                     {employee.supervisorObj ? (
                                         <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] group hover:border-[var(--primary)]/30 transition-all cursor-pointer" onClick={() => navigate(`/employees/${employee.supervisorObj.id}`)}>
                                             {employee.supervisorObj.avatarUrl ? (
                                                 <img src={employee.supervisorObj.avatarUrl} alt={employee.supervisorObj.fullName} className="w-12 h-12 rounded-xl object-cover ring-2 ring-[var(--border-subtle)]/30" />
                                             ) : (
                                                 <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-black">{employee.supervisorObj.fullName[0]}</div>
                                             )}
                                             <div>
                                                 <p className="text-[11px] font-bold text-[var(--text-primary)]">{employee.supervisorObj.fullName}</p>
                                                 <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">Primary Manager</p>
                                             </div>
                                         </div>
                                     ) : (
                                         <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] text-center">
                                             <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">No Direct Reporting Protocol</p>
                                         </div>
                                     )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'documents' && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                        className="nx-card p-10 bg-[var(--bg-elevated)]/20 border border-[var(--border-subtle)] min-h-[400px] flex flex-col items-center justify-center text-center opacity-40 italic"
                    >
                        <FileText size={48} className="mb-6" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">Document Vault Encrypted</h4>
                        <p className="text-xs mt-2 text-[var(--text-muted)] font-medium">Registry synchronization active. Asset matrix will resolve shortly.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EmployeeProfile;
