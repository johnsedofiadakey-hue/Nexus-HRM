import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Lock, Mail, ArrowRight, Loader2, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { toast } from '../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getLogoUrl } from '../utils/logo';

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { settings } = useTheme();
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    if (localStorage.getItem('nexus_auth_token')) navigate('/dashboard');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', formData);
      const { token, refreshToken, user } = res.data;
      
      localStorage.setItem('nexus_auth_token', token);
      if (refreshToken) localStorage.setItem('nexus_refresh_token', refreshToken);
      localStorage.setItem('nexus_user', JSON.stringify(user || {}));

      // --- PINNACLE WARMUP: Fetch and cache theme before redirect ---
      try {
        const settingsRes = await api.get('/settings');
        const s = settingsRes.data;
        const orgId = user?.organizationId || 'default';
        
        // Extract core tokens for the early-boot script
        const tokens = {
          'primary': s.primaryColor,
          'bg-main': s.bgMain,
          'bg-card': s.bgCard,
          'bg-sidebar': s.sidebarBg,
          'text-primary': s.textPrimary,
          'text-secondary': s.textSecondary
        };
        
        // Save Scoped Identity Data (v1.4 Perfect Scoping)
        localStorage.setItem(`nexus_theme_custom_colors_${orgId}`, JSON.stringify(tokens));
        localStorage.setItem(`nexus_theme_preference_${orgId}`, s.themePreset || 'premium-monolith');
        
        // Save legacy global keys for login page stability
        localStorage.setItem('nexus_theme_custom_colors', JSON.stringify(tokens));
        localStorage.setItem('nexus_theme_preference', s.themePreset || 'premium-monolith');
      } catch (warmupErr) {
        console.warn('[Warmup] Theme pre-fetch failed, falling back to defaults', warmupErr);
      }

      if (user?.role === 'DEV') {
        navigate('/dev/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Authentication failure. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-main)] relative overflow-hidden font-sans">
      {/* ── Dynamic Atmospheric Background ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 90, 180, 270, 360],
            x: [0, 100, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-[var(--primary)]/5 blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 270, 180, 90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--accent)]/5 blur-[100px] pointer-events-none"
        />
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '200px' }} />
      </div>

      {/* ── Login Architecture ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[480px] px-6 relative z-10"
      >
        {/* Logo Branding */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[var(--accent)] p-[2px] shadow-lg mb-6"
          >
            <div className="w-full h-full rounded-[2.4rem] bg-white flex items-center justify-center overflow-hidden shadow-inner">
              {getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) ? (
                <img 
                  src={getLogoUrl(settings?.logoUrl || settings?.companyLogoUrl) as string} 
                  key={settings?.logoUrl || settings?.companyLogoUrl}
                  alt="Logo" 
                  className="w-12 h-12 object-contain" 
                />
              ) : (
                <Shield size={32} className="text-[var(--primary)]" />
              )}
            </div>
          </motion.div>

          <h1 className="text-4xl font-black text-[var(--text-primary)] font-display tracking-tight text-center leading-none">
            {settings?.companyName || 'Enterprise HR System'}
          </h1>
          <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{settings?.subtitle || 'Secure Authentication'}</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="nx-card p-8 md:p-12 border-[var(--border-subtle)] relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--primary)]/10 blur-[50px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black text-[var(--text-primary)] font-display tracking-tight mb-2">{t('login.welcome')}</h2>
            <p className="text-sm font-medium text-[var(--text-muted)]">{t('login.subtitle')}</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-4 rounded-2xl bg-[var(--error)]/10 border border-rose-500/20 flex items-center gap-4 text-rose-400 overflow-hidden"
              >
                <AlertCircle size={18} className="flex-shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-widest leading-relaxed">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] ml-1">{t('login.email_label')}</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-all duration-300">
                  <Mail size={18} strokeWidth={2.5} />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  className="nx-input nx-input-l py-5 border-[var(--border-subtle)] bg-[var(--bg-main)] focus:bg-[var(--bg-card)] focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 transition-all font-medium"
                  placeholder="name@organization.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-3">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">{t('login.password_label')}</label>
                <button type="button" onClick={() => toast.info(t('login.forgot_help'))} className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:brightness-110 transition-colors">{t('login.forgot')}</button>
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-all duration-300">
                  <Lock size={18} strokeWidth={2.5} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                   className="nx-input nx-input-lr py-5 border-[var(--border-subtle)] bg-[var(--bg-main)] focus:bg-[var(--bg-card)] focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 transition-all font-medium tracking-[0.3em]"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98, y: 0 }}
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden bg-[var(--primary)] py-5 rounded-2xl flex items-center justify-center font-black uppercase tracking-[0.3em] text-[11px] text-[var(--text-inverse)] shadow-lg transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('login.loading')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span>{t('login.button')}</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              )}
            </motion.button>
          </form>

          {/* IT Support Recovery Hint */}
          <div className="mt-8 pt-8 border-t border-[var(--border-subtle)] text-center">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              {t('login.having_trouble', 'Cannot access your account?')}
            </p>
            <button 
              onClick={() => toast.info(`${t('login.contact_it', 'Please contact the IT Manager or HR to manually reset your access.')}`)}
              className="mt-2 flex items-center justify-center gap-2 mx-auto text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] hover:brightness-110 transition-all group"
            >
              <Shield size={12} className="group-hover:rotate-12 transition-transform" />
              <span>Contact IT Support</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center space-y-4"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)]">
            {settings?.companyName || 'HR'} Operating System
          </p>
          <div className="flex items-center justify-center gap-6">
            <a href="#" className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Privacy Policy</a>
            <div className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
            <a href="#" className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">Terms of Service</a>
          </div>
        </motion.div>
      </motion.div>

      {/* Decorative Branding Elements */}
      <div className="hidden xl:block absolute left-12 bottom-12 z-10">
        <div className="flex items-center gap-4 opacity-30 grayscale hover:grayscale-0 transition-all duration-700 cursor-default">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center">
            <div className="text-[var(--primary)] font-black text-xl italic uppercase">
              {(settings?.companyName || 'H')[0]}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">{settings?.companyName || 'CORE HR'}</p>
            <p className="text-[8px] font-medium text-[var(--text-muted)]">Personnel Operations Interface</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
