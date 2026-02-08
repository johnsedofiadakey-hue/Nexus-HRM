import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Briefcase, DollarSign, FileText, Upload, Shield, AlertTriangle, Calendar, ArrowLeft, Camera, Edit2 } from 'lucide-react';

interface EmployeeProfile {
    id: string;
    fullName: string;
    email: string;
    role: string;
    department: string;
    jobTitle: string;
    employeeCode?: string;
    status: string;

    // Personal
    dob?: string;
    gender?: string;
    nationalId?: string;
    contactNumber?: string;
    address?: string;
    profilePhotoUrl?: string;

    // Next of Kin
    nextOfKinName?: string;
    nextOfKinRelation?: string;
    nextOfKinContact?: string;

    // Digital File
    salary?: string; // Only if MD
    currency?: 'USD' | 'GHS' | 'GNF';
    nationalIdDocUrl?: string;

    riskScore?: number;
}

const EmployeeProfile = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    // @ts-ignore
    const currentUser = JSON.parse(localStorage.getItem('nexus_user') || '{}');
    const [activeTab, setActiveTab] = useState('OVERVIEW');
    const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit & Upload State
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [id]);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('nexus_token');
            // 1. Get User Data
            const res = await fetch(`http://localhost:5000/api/users/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            // 2. Get Risk Data (if admin/hr)
            if (['HR_ADMIN', 'MD', 'SUPERVISOR'].includes(currentUser.role)) {
                try {
                    const riskRes = await fetch(`http://localhost:5000/api/users/${id}/risk-profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (riskRes.ok) {
                        const riskData = await riskRes.json();
                        data.riskScore = riskData.riskScore;
                    }
                } catch (e) { console.error("Risk fetch failed", e); }
            }

            setEmployee(data);
            setFormData(data); // Pre-fill form
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('nexus_token');
            const res = await fetch(`http://localhost:5000/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert("Profile Updated Successfully");
                setShowEditModal(false);
                fetchProfile();
            } else {
                alert("Failed to update profile");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setUploading(true);
            try {
                const token = localStorage.getItem('nexus_token');
                const res = await fetch(`http://localhost:5000/api/users/${id}/image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ image: base64 })
                });
                if (res.ok) {
                    fetchProfile();
                } else {
                    alert("Values to upload image");
                }
            } catch (err) {
                console.error(err);
                alert("Error uploading image");
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Digital File...</div>;
    if (!employee) return <div className="p-8 text-center text-red-500">Employee not found.</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

            {/* BACK BUTTON */}
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-nexus-600 transition-colors font-medium">
                <ArrowLeft size={20} className="mr-2" /> Back to List
            </button>

            {/* --- HEADER CARD --- */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-nexus-900 to-nexus-700 opacity-90"></div>

                <div className="relative pt-12 px-4 flex flex-col md:flex-row items-end md:items-center gap-6">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-slate-200 overflow-hidden flex-shrink-0 relative">
                            {employee.profilePhotoUrl ? (
                                <img src={employee.profilePhotoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400 bg-slate-100">
                                    {employee.fullName[0]}
                                </div>
                            )}
                            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">Uploading...</div>}
                        </div>
                        {/* UPLOAD TRIGGER */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md text-slate-600 hover:text-nexus-600 hover:scale-110 transition-all border border-slate-200"
                            title="Upload Photo"
                        >
                            <Camera size={18} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>

                    <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-bold text-slate-800">{employee.fullName}</h1>
                            {/* RISK FLAG */}
                            {employee.riskScore && employee.riskScore >= 50 && (
                                <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center border border-red-200">
                                    <AlertTriangle size={12} className="mr-1" /> HIGH RISK ({employee.riskScore})
                                </div>
                            )}
                        </div>
                        <p className="text-lg text-slate-500 font-medium">{employee.jobTitle} • {employee.department}</p>
                        <div className="flex gap-4 mt-3 text-sm text-slate-500">
                            <span className="flex items-center"><Mail size={14} className="mr-1" /> {employee.email}</span>
                            <span className="flex items-center"><Briefcase size={14} className="mr-1" /> {employee.employeeCode || 'N/A'}</span>
                        </div>
                    </div>

                    {/* QUICK ACTIONS */}
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-50 flex items-center">
                            <FileText size={16} className="mr-2" /> Print File
                        </button>
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-50 flex items-center"
                        >
                            <Edit2 size={16} className="mr-2" /> Edit Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* --- EDIT MODAL --- */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <h2 className="text-xl font-bold text-slate-800">Edit Employee Profile</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                                    <input type="text" value={formData.fullName || ''} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Job Title</label>
                                    <input type="text" value={formData.jobTitle || ''} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Department</label>
                                    <input type="text" value={formData.department || ''} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone</label>
                                    <input type="text" value={formData.contactNumber || ''} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Address</label>
                                    <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                            </div>

                            {currentUser.role === 'MD' && (
                                <div className="border-t border-slate-100 pt-4 mt-4">
                                    <h3 className="text-sm font-bold text-slate-400 mb-2">Compensation (MD Only)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Salary</label>
                                            <input type="number" value={formData.salary || ''} onChange={e => setFormData({ ...formData, salary: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Currency</label>
                                            <select value={formData.currency || 'GHS'} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                                                <option value="GHS">GHS</option>
                                                <option value="USD">USD</option>
                                                <option value="GNF">GNF</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-nexus-600 text-white rounded-lg font-bold hover:bg-nexus-700 shadow-md">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- TABS --- */}
            <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2">
                {['OVERVIEW', 'PROFESSIONAL', 'DOCUMENTS', 'ASSETS', 'HISTORY'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-nexus-600 text-nexus-800' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 shadow-sm p-8 min-h-[400px]">

                {/* TAB: OVERVIEW */}
                {activeTab === 'OVERVIEW' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Personal Information</h3>
                            <div className="space-y-4">
                                <InfoRow label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString() : 'N/A'} icon={<Calendar size={16} />} />
                                <InfoRow label="Gender" value={employee.gender} icon={<User size={16} />} />
                                <InfoRow label="National ID" value={employee.nationalId} icon={<Shield size={16} />} />
                                <InfoRow label="Address" value={employee.address} icon={<MapPin size={16} />} />
                                <InfoRow label="Phone" value={employee.contactNumber} icon={<Phone size={16} />} />
                            </div>
                        </section>
                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Next of Kin</h3>
                            <div className="space-y-4">
                                <InfoRow label="Name" value={employee.nextOfKinName} />
                                <InfoRow label="Relationship" value={employee.nextOfKinRelation} />
                                <InfoRow label="Contact" value={employee.nextOfKinContact} />
                            </div>
                        </section>
                    </div>
                )}

                {/* TAB: PROFESSIONAL (Salary Here) */}
                {activeTab === 'PROFESSIONAL' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <section>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Employment Details</h3>
                                <div className="space-y-4">
                                    <InfoRow label="Department" value={employee.department} />
                                    <InfoRow label="Role" value={employee.role} />
                                    <InfoRow label="Status" value={employee.status} />
                                </div>
                            </section>

                            {/* SALARY - MD ONLY */}
                            <section>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center justify-between">
                                    Compensation
                                    {currentUser.role !== 'MD' && <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded">Restricted</span>}
                                </h3>

                                {employee.salary ? (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                                        <div className="text-sm text-green-700 font-bold mb-1 flex items-center">
                                            <DollarSign size={16} className="mr-1" /> Monthly Salary
                                        </div>
                                        <div className="text-3xl font-bold text-green-900">
                                            {employee.currency} {parseFloat(employee.salary).toLocaleString()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400">
                                        {currentUser.role === 'MD' ? 'Salary not set' : 'Access Restricted to Managing Director'}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                )}

                {/* TAB: DOCUMENTS */}
                {activeTab === 'DOCUMENTS' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800">Digital Documents</h3>
                            <button className="flex items-center text-sm font-bold text-nexus-600 bg-nexus-50 px-4 py-2 rounded-lg hover:bg-nexus-100">
                                <Upload size={16} className="mr-2" /> Upload Document
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* NATIONAL ID CARD */}
                            <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
                                        <Shield size={24} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">ID CARD</span>
                                </div>
                                <h4 className="font-bold text-slate-700 mb-2">National ID</h4>
                                {employee.nationalIdDocUrl ? (
                                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-300 relative group cursor-pointer">
                                        <img src={employee.nationalIdDocUrl} alt="ID" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-sm">
                                            View Full
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
                                        <FileText size={24} className="mb-2 opacity-50" />
                                        <span className="text-xs">No file uploaded</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: ASSETS (Placeholder for now) */}
                {activeTab === 'ASSETS' && (
                    <div className="text-center py-12 text-slate-400">
                        <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Asset List integration coming soon...</p>
                        <button className="mt-4 text-nexus-600 font-bold text-sm">View in Asset Module &rarr;</button>
                    </div>
                )}

            </div>

        </div>
    );
};

const InfoRow = ({ label, value, icon }: { label: string, value?: string, icon?: React.ReactNode }) => (
    <div className="flex items-start group">
        <div className="w-8 pt-1 text-slate-400 mr-2 group-hover:text-nexus-500 transition-colors">
            {icon || <div className="w-4 h-4 rounded-full bg-slate-100" />}
        </div>
        <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
            <div className="text-slate-800 font-medium">{value || 'N/A'}</div>
        </div>
    </div>
);

export default EmployeeProfile;
