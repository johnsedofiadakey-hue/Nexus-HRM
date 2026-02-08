import React, { useState, useEffect } from 'react';
import { Users, Plus, Search } from 'lucide-react';

interface Employee {
    id: string;
    fullName: string;
    email: string;
    role: string;
    department: string;
    jobTitle: string;
    employeeCode?: string;
    status: string;
    riskScore?: number; // Add riskScore
}

import { useNavigate } from 'react-router-dom';

const EmployeeManagement = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'EMPLOYEE',
        department: '',
        jobTitle: '',
        employeeCode: '',
        password: 'nexus123',
        joinDate: '',
        employmentType: 'Permanent',
        dob: '',
        gender: '',
        nationalId: '',
        contactNumber: '',
        address: '',
        nextOfKinName: '',
        nextOfKinRelation: '',
        nextOfKinContact: ''
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('nexus_token');
            const response = await fetch('http://localhost:5000/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            // Fetch Risk Scores for each employee
            const employeesWithRisk = await Promise.all(data.map(async (emp: any) => {
                try {
                    const riskRes = await fetch(`http://localhost:5000/api/users/${emp.id}/risk-profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const riskData = await riskRes.json();
                    return { ...emp, riskScore: riskData.score };
                } catch (e) {
                    return { ...emp, riskScore: 0 };
                }
            }));

            setEmployees(employeesWithRisk);
        } catch (error) {
            console.error('Failed to load employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('nexus_token');
            const response = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('✅ Employee created successfully!');
                setShowModal(false);
                setFormData({
                    fullName: '',
                    email: '',
                    role: 'EMPLOYEE',
                    department: '',
                    jobTitle: '',
                    employeeCode: '',
                    password: 'nexus123',
                    joinDate: '',
                    employmentType: 'Permanent',
                    dob: '',
                    gender: '',
                    nationalId: '',
                    contactNumber: '',
                    address: '',
                    nextOfKinName: '',
                    nextOfKinRelation: '',
                    nextOfKinContact: ''
                });
                fetchEmployees();
            } else {
                const error = await response.json();
                alert(`❌ Error: ${error.error || 'Failed to create employee'}`);
            }
        } catch (error) {
            console.error('Error creating employee:', error);
            alert('❌ Failed to create employee');
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'MD': return 'bg-purple-100 text-purple-800';
            case 'HR_ADMIN': return 'bg-blue-100 text-blue-800';
            case 'SUPERVISOR': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-nexus-600" size={28} />
                        Employee Management
                    </h1>
                    <p className="text-slate-500 mt-1">Create and manage employee accounts</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-nexus-600 text-white rounded-lg font-bold hover:bg-nexus-700 transition-colors shadow-lg shadow-nexus-500/20"
                >
                    <Plus size={20} />
                    Add Employee
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search employees by name, email, or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-nexus-500 focus:border-nexus-500"
                    />
                </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Position</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                {emp.fullName}
                                                {emp.riskScore && emp.riskScore >= 10 && (
                                                    <span title="High Risk: Disciplinary History" className="text-red-500 cursor-help">🚩</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500">{emp.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{emp.employeeCode || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{emp.department}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{emp.jobTitle}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(emp.role)}`}>
                                            {emp.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => navigate(`/employees/${emp.id}`)}
                                            className="text-xs font-bold text-nexus-600 bg-nexus-50 hover:bg-nexus-100 border border-nexus-200 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            View Profile
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm('Are you sure you want to delete this employee?')) {
                                                    try {
                                                        const token = localStorage.getItem('nexus_token');
                                                        await fetch(`http://localhost:5000/api/users/${emp.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                                        fetchEmployees();
                                                    } catch (e) { alert('Failed to delete'); }
                                                }
                                            }}
                                            className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredEmployees.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-400">
                        <Users size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No employees found</p>
                    </div>
                )}
            </div>

            {/* Create Employee Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Plus className="text-nexus-600" size={24} />
                                Create New Employee
                            </h2>
                        </div>

                        <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Professional Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name *</label>
                                    <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Email *</label>
                                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="john@nexus.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Employee Code</label>
                                    <input type="text" value={formData.employeeCode} onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="EMP001" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Role *</label>
                                    <select required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="SUPERVISOR">Supervisor</option>
                                        <option value="HR_ADMIN">HR Admin</option>
                                        <option value="MD">Managing Director</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Department *</label>
                                    <input type="text" required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Sales" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Job Title *</label>
                                    <input type="text" required value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Sales Manager" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Join Date</label>
                                    <input type="date" value={formData.joinDate} onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Employment Type</label>
                                    <select value={formData.employmentType} onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="Permanent">Permanent</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Probation">Probation</option>
                                    </select>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 pt-4">Personal Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Date of Birth</label>
                                    <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Gender</label>
                                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">National ID</label>
                                    <input type="text" value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="ID Number" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Contact Number</label>
                                    <input type="text" value={formData.contactNumber} onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="+123..." />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Address</label>
                                    <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Full Address" />
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 pt-4">Next of Kin</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Name</label>
                                    <input type="text" value={formData.nextOfKinName} onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Relation</label>
                                    <input type="text" value={formData.nextOfKinRelation} onChange={(e) => setFormData({ ...formData, nextOfKinRelation: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Spouse, Parent..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Contact</label>
                                    <input type="text" value={formData.nextOfKinContact} onChange={(e) => setFormData({ ...formData, nextOfKinContact: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                            </div>

                            <div className="col-span-2 pt-4">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Default Password</label>
                                <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="nexus123" />
                                <p className="text-xs text-slate-500 mt-1">Leave as "nexus123" for testing</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-nexus-600 text-white rounded-lg font-bold hover:bg-nexus-700 shadow-lg">Create Employee</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;
