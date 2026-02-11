import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus } from 'lucide-react';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (e) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/departments', { name });
      setName('');
      fetchDepartments();
    } catch (e) {
      setError('Failed to create department');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-0 space-y-10 animate-in fade-in duration-500">
      {/* Gradient Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 p-8 shadow-xl mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-1 drop-shadow">Department Management</h1>
        <p className="text-white/80 text-lg">Create and manage company departments.</p>
      </div>
      {/* Animated Card for Form and List */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-100 rounded-2xl shadow-xl p-8 border-0">
        <form onSubmit={handleCreate} className="flex gap-2 mb-8">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Department Name"
            className="border px-4 py-3 rounded-lg flex-1 text-lg shadow-sm focus:ring-2 focus:ring-blue-300"
            required
          />
          <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-rose-500 text-white rounded-lg font-bold shadow-lg hover:scale-105 transition-transform text-lg">
            <Plus size={20} /> Add
          </button>
        </form>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="bg-white rounded-xl shadow-lg border-0">
          {loading ? (
            <div className="p-6 text-center text-slate-400">Loading...</div>
          ) : departments.length === 0 ? (
            <div className="p-6 text-center text-slate-400">No departments found.</div>
          ) : (
            <ul>
              {departments.map((dept) => (
                <li key={dept.id} className="p-5 border-b last:border-b-0 flex justify-between items-center animate-in fade-in zoom-in">
                  <span className="font-bold text-slate-700 text-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></span>
                    {dept.name}
                  </span>
                  {/* Future: Add edit/delete/assign manager UI here */}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentManagement;
