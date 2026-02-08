import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Calendar, Plus, Play, Clock } from 'lucide-react';

interface Cycle {
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    status: string;
    appraisals?: any[];
}

const CycleManagement = () => {
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'QUARTERLY',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchCycles();
    }, []);

    const fetchCycles = async () => {
        try {
            const res = await api.get('/cycles');
            setCycles(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/cycles', formData);
            setShowModal(false);
            setFormData({ name: '', type: 'QUARTERLY', startDate: '', endDate: '' });
            fetchCycles();
            alert("Cycle Created!");
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to create cycle");
        }
    };

    const initiateAppraisals = async (cycleId: string) => {
        if (!confirm("Are you sure? This will generate appraisal forms for all eligible employees.")) return;

        try {
            const res = await api.post('/appraisals/init', {
                cycleId,
                employeeIds: [] // Empty array means ALL employees
            });
            alert(res.data.message);
            fetchCycles();
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to initiate");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Cycles...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Appraisal Cycles</h1>
                    <p className="text-slate-500">Manage performance review periods and initiate appraisals.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-nexus-600 hover:bg-nexus-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg"
                >
                    <Plus size={18} /> Create New Cycle
                </button>
            </div>

            <div className="grid gap-6">
                {cycles.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                        <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No cycles found. Create one to get started.</p>
                    </div>
                ) : (
                    cycles.map(cycle => (
                        <div key={cycle.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-slate-800">{cycle.name}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${cycle.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                        cycle.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {cycle.status}
                                    </span>
                                </div>
                                <div className="flex gap-6 text-sm text-slate-500">
                                    <span className="flex items-center gap-1"><Calendar size={14} /> Start: {new Date(cycle.startDate).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Clock size={14} /> End: {new Date(cycle.endDate).toLocaleDateString()}</span>
                                    <span className="font-medium bg-slate-50 px-2 rounded-md border border-slate-200">{cycle.type}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Initiate Button */}
                                <button
                                    onClick={() => initiateAppraisals(cycle.id)}
                                    // Disable if already active or archived? Depending on business logic. 
                                    // For now, allow re-triggering for new employees (backend should handle dups).
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                                >
                                    <Play size={16} /> Initiate Appraisals
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* CREATE MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Create Appraisal Cycle</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Cycle Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Q1 2026 Performance Review"
                                    className="w-full border rounded-lg p-2"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
                                <select
                                    className="w-full border rounded-lg p-2"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="QUARTERLY">Quarterly</option>
                                    <option value="ANNUAL">Annual</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full border rounded-lg p-2"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">End Date</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full border rounded-lg p-2"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-nexus-600 hover:bg-nexus-700 text-white rounded-lg font-bold"
                                >
                                    Create Cycle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CycleManagement;
