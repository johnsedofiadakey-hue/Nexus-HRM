import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff, Shield, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { settings } = useTheme();
  const [formData, setFormData] = useState({ email: '', password: '' });

  const bullets: string[] = (() => {
    try {
      if ((settings as any).loginBullets) return JSON.parse((settings as any).loginBullets);
    } catch {}
    return [
      'Manage employee profiles and records',
      'Leave and payroll management',
      'Track role-based access and audit logs',
      'Set goals and review performance',
    ];
  })();

  const subtitle = (settings as any).loginSubtitle || 'Your HR platform.';
  const notice   = (settings as any).loginNotice;

  useEffect(() => {
    if (localStorage.getItem('nexus_token')) navigate('/dashboard');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', formData);
      localStorage.setItem('nexus_token', res.data.token);
      localStorage.setItem('nexus_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Authentication failure. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface overflow-hidden main-glow-bg">
      
      {/* ── Left Branding Architecture (lg screens) ──────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="hidden lg:flex flex-col justify-between p-16 relative w-1/2 bg-[#080c16]"
      >
        <div className="absolute inset-0 bg-surface-glow opacity-30 pointer-events-none" />
        
        {/* Dynamic Blobs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" 
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" 
        />

        {/* Logo Section */}
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-3"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-accent shadow-2xl shadow-primary/30">
              {settings.companyLogoUrl ? (
                <img src={settings.companyLogoUrl} alt="Logo" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <Shield size={24} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white font-display tracking-tighter leading-none">
                {settings.companyName || 'Nexus'} <span className="text-primary-light">HRM</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">HR & Payroll Platform</p>
            </div>
          </motion.div>
        </div>

        {/* Hero Experience */}
        <div className="relative z-10 max-w-lg">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-6xl font-black text-white font-display leading-[1.05] tracking-tight mb-8"
          >
            {subtitle.includes(',') ? (
              <>
                {subtitle.split(',')[0]}<span className="text-slate-500">,</span><br />
                <span className="gradient-text italic">{subtitle.split(',').slice(1).join(',').trim()}</span>
              </>
            ) : (
              <span className="gradient-text">{subtitle}</span>
            )}
          </motion.h2>
          
          <div className="space-y-4">
            {bullets.map((b, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + (i * 0.1) }}
                className="flex items-center gap-4"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={12} className="text-primary-light" />
                </div>
                <span className="text-slate-400 font-medium tracking-tight text-lg">{b}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
          className="relative z-10 text-[11px] font-black uppercase tracking-widest text-slate-500"
        >
          © {new Date().getFullYear()} {settings.companyName || 'Nexus HRM'} · All rights reserved
        </motion.div>
      </motion.div>

      {/* ── Right Authentication Panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface relative">
        <div className="absolute inset-0 bg-surface-glow opacity-10 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "circOut" }}
          className="w-full max-w-[440px] relative z-10"
        >
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center gap-4 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-white font-display tracking-tight leading-none">
              Nexus <span className="text-primary-light">HRM</span>
            </h2>
          </div>

          <div className="glass p-10 border-white/[0.05] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full pointer-events-none" />
            
            <div className="mb-10">
              <h3 className="text-3xl font-black text-white font-display tracking-tight mb-2">Welcome Back</h3>
              <p className="text-sm font-medium text-slate-500">Sign in to your account</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4 text-rose-400"
                >
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {notice && (
              <div className="mb-8 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                <Info size={16} className="text-primary-light mt-0.5" />
                <p className="text-xs font-semibold text-slate-400 leading-relaxed">{notice}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    className="nx-input pl-14 py-4 border-white/5 bg-white/[0.03] focus:bg-white/[0.05] transition-all"
                    placeholder="email@nexus-system.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Password</label>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                    className="nx-input pl-14 pr-14 py-4 border-white/5 bg-white/[0.03] focus:bg-white/[0.05] transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 rounded-2xl justify-center font-black uppercase tracking-[0.25em] text-xs shadow-2xl shadow-primary/40 group active:translate-y-0"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>Sign In</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </motion.button>
            </form>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-10 text-center"
          >
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
               Nexus HRM v3.1
             </p>
          </motion.div>
        </motion.div>
      </div>

    </div>
  );
};

export default Login;
