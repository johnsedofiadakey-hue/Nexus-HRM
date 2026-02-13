import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings, refreshSettings } = useTheme();
  
  const [formData, setFormData] = useState({
    email: 'sarah@nexus.com', // Pre-filled for easy testing
    password: 'nexus123'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', formData);
      localStorage.setItem('nexus_token', res.data.token);
      localStorage.setItem('nexus_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {settings.companyLogoUrl ? (
              <img
                src={settings.companyLogoUrl}
                alt={settings.companyName || 'Company Logo'}
                className="w-12 h-12 rounded-lg object-contain bg-slate-50 p-2"
              />
            ) : (
              <div className="bg-nexus-600 p-3 rounded-lg">
                <Lock className="text-white" size={22} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Sign In</h1>
              <p className="text-sm text-slate-500">Access your {settings.companyName || 'Nexus HRM'} account</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center animate-pulse">
                <span className="font-bold mr-2">!</span> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Corporate ID</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="email" 
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-nexus-500 focus:border-nexus-500 outline-none transition-all"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-nexus-500 focus:border-nexus-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-nexus-600 hover:bg-nexus-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : (
                <>
                  Secure Login <ArrowRight className="ml-2" size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Protected by Nexus Security &copy; 2026
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;