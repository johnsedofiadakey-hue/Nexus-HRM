import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Calendar, Plus, CheckCircle, XCircle, Clock, Users, Briefcase } from 'lucide-react';
import TeamLeaveRequests from '../components/TeamLeaveRequests'; // <--- Import the new component

const Leave = () => {
  // 1. Check User Role
  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const isManager = user.role === 'SUPERVISOR' || user.role === 'MD';

  // 2. Tab State
  const [activeTab, setActiveTab] = useState<'MY_HISTORY' | 'TEAM_REQUESTS'>('MY_HISTORY');

  const [leaves, setLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    if (activeTab === 'MY_HISTORY') {
      fetchLeaves();
    }
  }, [activeTab]);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leave/my-history');
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leave/apply', formData);
      setShowForm(false);
      fetchLeaves();
      setFormData({ startDate: '', endDate: '', reason: '' });
    } catch (err) {
      alert("Failed to apply");
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'APPROVED') return 'bg-green-100 text-green-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Management</h1>
          <p className="text-slate-500">Manage time off and approvals.</p>
        </div>

        {/* Action Button (Only show on My History tab) */}
        {activeTab === 'MY_HISTORY' && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-nexus-600 hover:bg-nexus-700 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-nexus-500/30 transition-all"
          >
            <Plus size={18} className="mr-2" /> New Request
          </button>
        )}
      </div>

      {/* --- MANAGER TABS --- */}
      {isManager && (
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab('MY_HISTORY')}
            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${
              activeTab === 'MY_HISTORY' 
                ? 'bg-white text-nexus-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase size={16} className="mr-2" /> My History
          </button>
          <button
            onClick={() => setActiveTab('TEAM_REQUESTS')}
            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${
              activeTab === 'TEAM_REQUESTS' 
                ? 'bg-white text-nexus-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={16} className="mr-2" /> Team Approvals
            {/* Optional: Add a red dot if pending requests exist? */}
          </button>
        </div>
      )}

      {/* --- VIEW 1: TEAM REQUESTS (Manager Only) --- */}
      {activeTab === 'TEAM_REQUESTS' && (
        <TeamLeaveRequests />
      )}

      {/* --- VIEW 2: MY HISTORY (Everyone) --- */}
      {activeTab === 'MY_HISTORY' && (
        <>
          {showForm && (
            <div className="bg-white p-6 rounded-xl border border-nexus-200 shadow-lg mb-8 animate-in slide-in-from-top-4">
              <h3 className="font-bold text-lg mb-4 text-nexus-800">Request Time Off</h3>
              <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" required className="w-full border p-2 rounded-lg" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" required className="w-full border p-2 rounded-lg" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea required className="w-full border p-2 rounded-lg" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 font-bold px-4">Cancel</button>
                  <button className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold">Submit Request</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-sm font-bold text-slate-600">Requested</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Dates</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Reason</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400">No leave history found.</td></tr>
                ) : (
                  leaves.map((leave: any) => (
                    <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm text-slate-500">{new Date(leave.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-sm font-bold text-slate-700">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-slate-600">{leave.reason}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center w-fit ${getStatusColor(leave.status)}`}>
                          {leave.status === 'APPROVED' && <CheckCircle size={12} className="mr-1" />}
                          {leave.status === 'REJECTED' && <XCircle size={12} className="mr-1" />}
                          {leave.status === 'PENDING_MANAGER' && <Clock size={12} className="mr-1" />}
                          {leave.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Leave;