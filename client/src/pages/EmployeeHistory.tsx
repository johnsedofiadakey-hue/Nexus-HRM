import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Clock, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

interface HistoryRecord {
    id: string;
    type: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
    loggedBy: { fullName: string };
}

const EmployeeHistory = () => {
    // Ideally this comes from route params or context. For now, assuming current user viewing their own or manager viewing one.
    // Let's implement getting records for a specific employee ID passed in URL or defaulting to "my-history".
    const { employeeId } = useParams();
    const isSelf = !employeeId;
    const currentUser = JSON.parse(localStorage.getItem('nexus_user') || '{}');
    const userId = currentUser?.id;

    // For demo, if strictly "portal" for logged in user to see their own history:
    // But request asked for "reports can be inputed by supervisor". So it's a management view too.

    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // New Record Form State
    const [showForm, setShowForm] = useState(false);
    const [newRecord, setNewRecord] = useState({
        type: 'GENERAL_NOTE',
        title: '',
        description: '',
        severity: 'LOW'
    });

    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem('nexus_user') || '{}');
        const targetId = employeeId || currentUser?.id;
        if (targetId) {
            fetchHistory(targetId);
        } else {
            setLoading(false);
        }
    }, [employeeId]);

    const fetchHistory = async (id: string) => {
        try {
            const token = localStorage.getItem('nexus_token');
            const res = await fetch(`http://localhost:5000/api/history/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            } else {
                setRecords([]);
            }
        } catch (error) {
            console.error(error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('nexus_token');
            const payload = { ...newRecord, employeeId: employeeId || userId };

            const res = await fetch('http://localhost:5000/api/history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Record added successfully");
                setShowForm(false);
                setNewRecord({ type: 'GENERAL_NOTE', title: '', description: '', severity: 'LOW' });
                if (employeeId) fetchHistory(employeeId);
            } else {
                alert("Failed to add record");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'DISCIPLINARY': return <AlertTriangle className="text-red-500" />;
            case 'QUERY': return <FileText className="text-orange-500" />;
            case 'COMMENDATION': return <CheckCircle className="text-green-500" />;
            default: return <Clock className="text-slate-400" />;
        }
    };

    if (loading) {
        return <div className="p-6 text-slate-400">Loading history...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-nexus-600" />
                        Employee History Portal
                    </h1>
                    <p className="text-slate-500">Track queries, disciplinary actions, and notes.</p>
                </div>
                {!isSelf && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-nexus-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-nexus-700 transition">
                        + Add Record
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-8 animate-fade-in-down">
                    <h3 className="font-bold text-lg mb-4">Log New Record</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700">Type</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={newRecord.type}
                                    onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                                >
                                    <option value="GENERAL_NOTE">General Note</option>
                                    <option value="QUERY">Query</option>
                                    <option value="DISCIPLINARY">Disciplinary</option>
                                    <option value="COMMENDATION">Commendation</option>
                                    <option value="ISSUE">Issue</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700">Severity</label>
                                <select
                                    className="w-full p-2 border rounded"
                                    value={newRecord.severity}
                                    onChange={(e) => setNewRecord({ ...newRecord, severity: e.target.value })}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Title of Incident/Note</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={newRecord.title}
                                onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Description</label>
                            <textarea
                                className="w-full p-2 border rounded h-24"
                                value={newRecord.description}
                                onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-nexus-600 text-white rounded font-bold">Save Record</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {records.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        No history records found.
                    </div>
                ) : (
                    records.map(record => (
                        <div key={record.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex gap-4">
                            <div className="mt-1">{getIcon(record.type)}</div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-800">{record.title}</h4>
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold
                                        ${record.status === 'OPEN' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {record.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">
                                    {record.type} • {new Date(record.createdAt).toLocaleDateString()} • Logged by {record.loggedBy?.fullName}
                                </p>
                                <p className="text-slate-700">{record.description}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EmployeeHistory;
