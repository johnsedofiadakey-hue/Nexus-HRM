import React, { useState, useEffect } from 'react';
import { Shield, Clock, Search, FileText } from 'lucide-react';
import api from '../services/api';

type AuditDetails = Record<string, unknown> | string | number | null;

interface AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    details: AuditDetails;
    ipAddress: string;
    createdAt: string;
    user?: { fullName: string; email: string };
}

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get('/audit');
            setLogs(res.data || []);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDetails = (details: AuditDetails) => {
        if (!details) return "-";
        try {
            return <pre className="text-xs bg-slate-100 p-2 rounded overflow-x-auto max-w-sm">{JSON.stringify(details, null, 2)}</pre>;
        } catch {
            return String(details);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500 space-y-10">
            {/* Gradient Header */}
            <div className="rounded-2xl bg-brand-gradient p-8 shadow-xl mb-8 flex items-center gap-6">
                <div className="p-4 bg-white/10 rounded-xl text-white">
                    <Shield size={40} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-white mb-1 drop-shadow flex items-center gap-2">System Audit Logs</h1>
                    <p className="text-white/80 text-lg">Track system activity and changes for compliance.</p>
                </div>
            </div>

            {/* Animated Card for Search */}
            <div className="bg-brand-surface rounded-2xl shadow-xl p-8 border-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                    <input
                        type="text"
                        placeholder="Search logs by action, user, or entity..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border rounded-lg text-lg shadow-sm focus:ring-2 focus:ring-nexus-500 font-mono"
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Actor</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Entity</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} />
                                        {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold font-mono text-nexus-700">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-700">
                                    {log.user ? log.user.fullName : <span className="text-slate-400 italic">System</span>}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {log.entity}
                                    {log.entityId && (
                                        <span className="text-xs text-slate-400"> ({log.entityId.substring(0, 6)}...)</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {formatDetails(log.details)}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                                    {log.ipAddress || "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredLogs.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-400">
                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                        No logs found matching criteria.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogs;
