import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: 'sarah@nexus.com', // Pre-filled for easy testing
    password: 'nexus123'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-400 to-emerald-200 animate-in fade-in duration-500">
        <div className="bg-white/90 p-10 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-tr from-blue-500 to-purple-500 p-4 rounded-xl mb-2">
              <Lock className="text-white" size={40} />
            </div>
            <h1 className="text-4xl font-extrabold text-blue-700 mt-2 drop-shadow">Sign In</h1>
            <p className="text-slate-500 mt-1 text-lg">Access your Nexus HRM account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-blue-700 font-semibold mb-1">Email</label>
              <input
                type="email"
                className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 text-lg"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-blue-700 font-semibold mb-1">Password</label>
              <input
                type="password"
                className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 text-lg"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl shadow-lg text-lg transition-all duration-200 animate-pulse"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          {error && <p className="text-red-500 text-center mt-6">{error}</p>}
        </div>
      </div>
    );

        {/* Form Section */}
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