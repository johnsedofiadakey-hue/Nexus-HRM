import React, { useEffect, useState } from 'react';
import { Settings, Shield, Save, Loader2, Key, Eye, EyeOff, Mail, Moon, Sun, Users, Download, CreditCard, CheckCircle, ExternalLink, Edit3, Trash2, Plus, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const Section = ({ title, desc, icon: Icon, children, color = 'var(--primary)' }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="glass p-8 rounded-[2rem] border border-white/[0.05] relative overflow-hidden"
  >
    <div className="absolute right-0 top-0 w-32 h-32 opacity-20 blur-3xl rounded-full" style={{ background: color, pointerEvents: 'none' }} />
    <div className="flex items-start gap-4 mb-8">
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg flex-shrink-0" 
        style={{ 
          background: `color-mix(in srgb, ${color} 15%, transparent)`, 
          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
          color: color,
          boxShadow: `0 10px 30px -10px ${color}`
        }}
      >
        <Icon size={24} />
      </div>
      <div>
         <h2 className="text-2xl font-black text-white font-display tracking-tight">{title}</h2>
         {desc && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">{desc}</p>}
      </div>
    </div>
    <div className="relative z-10">
      {children}
    </div>
  </motion.div>
);

// ─── Login Page Customisation Component ────────────────────────────────────
const LoginCustomSection = ({ form, setForm, handleSave, saving, saved }: any) => {
  const [bullets, setBullets] = React.useState<string[]>(() => {
    try { return JSON.parse(form.loginBullets || '[]'); } catch { return []; }
  });
  const [newBullet, setNewBullet] = React.useState('');

  React.useEffect(() => {
    setForm((f: any) => ({ ...f, loginBullets: JSON.stringify(bullets) }));
  }, [bullets]);

  const addBullet = () => {
    if (!newBullet.trim()) return;
    setBullets((b: string[]) => [...b, newBullet.trim()]);
    setNewBullet('');
  };
  const removeBullet = (i: number) => setBullets((b: string[]) => b.filter((_: any, idx: number) => idx !== i));

  return (
    <Section title="Login Page Settings" desc="Customize the login screen" icon={Edit3} color="#06b6d4">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">
              Announcement Notification
            </label>
            <textarea
              className="nx-input p-4 font-bold resize-none min-h-[80px]"
              placeholder="e.g. System upgrade scheduled for tonight"
              value={form.loginNotice || ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f: any) => ({ ...f, loginNotice: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">
              Subtitle
            </label>
            <input
              type="text"
              className="nx-input p-4 font-bold"
              placeholder="Manage your workforce efficiently."
              value={form.loginSubtitle || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, loginSubtitle: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-3">
              Features List
            </label>
            <div className="space-y-2 mb-4">
              {bullets.map((b: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-sm font-bold text-white flex-1">{b}</span>
                  <button type="button" onClick={() => removeBullet(i)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/20">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 relative">
              <input
                type="text"
                className="nx-input p-4 font-bold text-sm flex-1 pr-24"
                placeholder="Add a feature..."
                value={newBullet}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBullet(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); addBullet(); } }}
              />
              <button type="button" onClick={addBullet} className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-cyan-500/30 transition-colors">
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2"><CheckCircle size={14} /> Saved</span>}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-cyan-500/10 flex items-center gap-3 ml-auto" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Login Settings
          </motion.button>
        </div>
      </form>
    </Section>
  );
};

// ─── Subscription Section Component ────────────────────────────────────────
const SubscriptionSection = () => {
  const [sub, setSub] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [paying, setPaying] = React.useState(false);
  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');

  React.useEffect(() => {
    api.get('/payment/status').then(r => { setSub(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handlePay = async (plan: 'monthly' | 'annually') => {
    setPaying(true);
    try {
      const res = await api.post('/payment/initialize', { plan, email: user.email });
      if (res.data.authorizationUrl) {
        window.open(res.data.authorizationUrl, '_blank');
      }
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Payment gateway initialization failed.');
    }
    setPaying(false);
  };

  return (
    <Section title="Subscription" desc="Manage your billing and plan" icon={CreditCard} color="#8b5cf6">
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Current Plan</p>
              <p className="text-xl font-black text-white">
                {sub?.currentSubscription?.currentPeriodEnd
                  ? `Active until ${new Date(sub.currentSubscription.currentPeriodEnd).toLocaleDateString()}`
                  : 'No active subscription'}
              </p>
            </div>
            <span className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border", 
              sub?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
              sub?.status === 'TRIAL' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
              'bg-slate-500/10 text-slate-400 border-slate-500/20'
            )}>
              {sub?.plan || 'UNLICENSED'} / {sub?.status || 'OFFLINE'}
            </span>
          </div>

          {!sub?.paystackConfigured && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
              <AlertTriangle size={16} /> Payment gateway is unconfigured. Requires Developer Ops.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                plan: 'monthly' as const,
                label: 'Monthly Plan',
                price: sub?.monthlyPrice ? `GHS ${Number(sub.monthlyPrice).toLocaleString()}/mo` : '—',
                desc: 'Billed every month.',
                highlight: false
              },
              {
                plan: 'annually' as const,
                label: 'Annual Plan',
                price: sub?.annualPrice ? `GHS ${Number(sub.annualPrice).toLocaleString()}/yr` : '—',
                desc: 'Billed once a year.',
                highlight: true
              },
            ].map(opt => (
              <div key={opt.plan} className={cn("p-8 rounded-[2rem] relative border transition-colors", 
                opt.highlight ? "bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
              )}>
                {opt.highlight && <span className="absolute -top-3 left-8 px-3 py-1 bg-purple-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/30">Recommended</span>}
                <p className="text-2xl font-black text-white font-display mb-1">{opt.label}</p>
                <p className={cn("text-3xl font-black tracking-tighter mb-2", opt.highlight ? 'text-purple-400' : 'text-slate-300')}>{opt.price}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">{opt.desc}</p>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => handlePay(opt.plan)}
                  disabled={!sub?.paystackConfigured || paying}
                  className={cn("w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg transition-all",
                    opt.highlight ? "bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/25" : "bg-white/[0.05] hover:bg-white/10 text-white border border-white/10"
                  )}
                >
                  {paying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  Subscribe
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
};

// Adding simple AlertTriangle component that was missing
const AlertTriangle = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const AdminSettings = () => {
  const { settings, refreshSettings, isDark, toggleTheme } = useTheme();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);

  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const isAdmin = ['MD', 'HR_ADMIN', 'SUPER_ADMIN'].includes(user.role);
  const isMD = user.role === 'MD';

  useEffect(() => {
    if (settings) {
      setForm({ ...settings });
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put('/settings', form);
      await refreshSettings();
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setPwError(''); setPwSuccess('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('Security key mismatch'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('Insufficient entropy (Min 8 chars)'); return; }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwSuccess('Security Key Updated');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) { setPwError(err?.response?.data?.error || 'Protocol Failed'); }
    finally { setPwSaving(false); }
  };

  return (
    <div className="space-y-8 page-enter max-w-5xl">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-white font-display tracking-tight">Settings</h1>
        <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
          <Settings size={14} className="text-primary-light" />
          Manage your system settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* Visual OS Toggle */}
            <Section title="Theme" desc="Appearance settings" icon={isDark ? Moon : Sun} color={isDark ? '#6366f1' : '#f59e0b'}>
              <div className="flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-5">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg", isDark ? "bg-primary/10 border-primary/20 text-primary-light shadow-primary/20" : "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-500/20")}>
                    {isDark ? <Moon size={24} /> : <Sun size={24} />}
                  </div>
                  <div>
                    <p className="text-xl font-black text-white">{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                      {isDark ? 'Easy on the eyes' : 'Bright and clear'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={toggleTheme}
                  className="relative w-16 h-8 rounded-full transition-all duration-300 flex-shrink-0 border"
                  style={{ background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)', borderColor: isDark ? 'rgba(99,102,241,0.4)' : 'rgba(245,158,11,0.4)' }}
                  aria-label="Toggle theme">
                  <div className={cn("absolute top-1 w-6 h-6 rounded-full shadow-md transition-all duration-300", isDark ? "left-1 bg-primary-light" : "left-9 bg-amber-400")} />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Company Name</label>
                    <input type="text" className="nx-input p-4 font-bold" value={form.companyName || ''} onChange={e => setForm((f: any) => ({ ...f, companyName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Company Logo URL</label>
                    <input type="url" className="nx-input p-4 font-bold" placeholder="https://..." value={form.companyLogoUrl || ''} onChange={e => setForm((f: any) => ({ ...f, companyLogoUrl: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="btn-primary px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 shadow-lg shadow-primary/20" disabled={saving}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
                  </motion.button>
                </div>
              </form>
            </Section>

            {/* Account Creation Policy */}
            {isMD && (
              <Section title="Account Creation" desc="Who can create accounts?" icon={Users} color="#f43f5e">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { value: 'HR_ADMIN', label: 'HR Admin', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
                    { value: 'MD', label: 'MD Only', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
                    { value: 'BOTH', label: 'HR and MD', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
                  ].map(opt => {
                    const active = form.accountCreatedBy === opt.value;
                    return (
                      <label key={opt.value} className={cn("p-6 rounded-2xl cursor-pointer transition-all border relative overflow-hidden", 
                        active ? `${opt.bg} ${opt.border}` : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                      )}>
                        <input type="radio" name="accountCreatedBy" value={opt.value} checked={active} onChange={e => setForm((f: any) => ({ ...f, accountCreatedBy: e.target.value }))} className="hidden" />
                        {active && <div className={cn("absolute top-3 right-3 w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]", opt.text, `bg-${opt.text.replace('text-', '')}`)} />}
                        <p className={cn("text-sm font-black uppercase tracking-widest mt-2", active ? 'text-white' : 'text-slate-400')}>{opt.label}</p>
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                   <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3" disabled={saving}>
                     {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Save Preferences
                   </motion.button>
                </div>
              </Section>
            )}

            {/* Email Config */}
            {isAdmin && (
              <Section title="Email Settings" desc="Configure outgoing emails" icon={Mail} color="#10b981">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                  <Shield size={16} /> Secure SMTP connection
                </div>
                
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">SMTP Host</label>
                      <input type="text" className="nx-input p-4 font-bold" placeholder="smtp.provider.com" value={form.smtpHost || ''} onChange={e => setForm((f: any) => ({ ...f, smtpHost: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">SMTP Port</label>
                      <input type="number" className="nx-input p-4 font-bold font-mono" placeholder="587" value={form.smtpPort || ''} onChange={e => setForm((f: any) => ({ ...f, smtpPort: parseInt(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">SMTP Username</label>
                      <input type="text" className="nx-input p-4 font-bold" value={form.smtpUser || ''} onChange={e => setForm((f: any) => ({ ...f, smtpUser: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">SMTP Password</label>
                      <input type="password" className="nx-input p-4 font-bold tracking-[0.3em]" value={form.smtpPass || ''} onChange={e => setForm((f: any) => ({ ...f, smtpPass: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">From Email Address</label>
                    <input type="email" className="nx-input p-4 font-bold" placeholder="nexus@company.com" value={form.smtpFrom || ''} onChange={e => setForm((f: any) => ({ ...f, smtpFrom: e.target.value }))} />
                  </div>
                  <div className="flex justify-end">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-emerald-500/10 flex items-center gap-3" disabled={saving}>
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Email Settings
                    </motion.button>
                  </div>
                </form>
              </Section>
            )}

            {/* Login Config */}
            {isMD && <LoginCustomSection form={form} setForm={setForm} handleSave={handleSave} saving={saving} saved={saved} />}
            
            {/* Paystack / Sub */}
            {isMD && <SubscriptionSection />}
         </div>

         <div className="lg:col-span-4 space-y-8">
            {/* Maintenance Mode */}
            {isAdmin && (
              <Section title="Maintenance Mode" desc="Temporarily disable the system for everyone" icon={Shield} color="#ef4444">
                <div className={cn("flex flex-col gap-4 p-6 rounded-2xl border transition-colors relative overflow-hidden", 
                  form.isMaintenanceMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/[0.02] border-white/5'
                )}>
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="font-black text-white text-lg">Maintenance</p>
                      <p className={cn("text-[8px] font-black uppercase tracking-[0.3em] mt-1", form.isMaintenanceMode ? 'text-rose-400' : 'text-slate-500')}>Status</p>
                    </div>
                    <button type="button" onClick={() => setForm((f: any) => ({ ...f, isMaintenanceMode: !f.isMaintenanceMode }))}
                      className={cn("relative w-14 h-7 rounded-full transition-all duration-300 border flex-shrink-0", form.isMaintenanceMode ? 'bg-rose-500 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-slate-800 border-slate-700')}>
                      <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300", form.isMaintenanceMode ? 'translate-x-[26px]' : 'translate-x-1')} />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-rose-500/20 text-rose-400 border border-rose-500/30 px-6 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3" disabled={saving}>
                    Toggle Mode
                  </motion.button>
                </div>
              </Section>
            )}

            {/* Change Password */}
            <Section title="Change Password" desc="Update your password" icon={Key} color="#3b82f6">
              <form onSubmit={handlePasswordChange} className="space-y-5">
                {pwError && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> {pwError}</div>}
                {pwSuccess && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><CheckCircle size={14} /> {pwSuccess}</div>}
                
                {[{ key: 'currentPassword', label: 'Current Password' }, { key: 'newPassword', label: 'New Password' }, { key: 'confirm', label: 'Confirm Password' }].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">{label}</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} className="nx-input p-4 font-bold tracking-widest text-sm"
                        value={(pwForm as any)[key]} onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))} required />
                      {key === 'confirm' && (
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/30 px-6 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3" disabled={pwSaving}>
                  {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} Update Password
                </motion.button>
              </form>
            </Section>

            {/* Data Exports */}
            {isAdmin && (
              <Section title="Data Export" desc="Export system data to CSV" icon={Download} color="#a855f7">
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Employee List (CSV)', url: '/api/export/employees/csv' },
                    { label: 'Leave History (CSV)', url: '/api/export/leave/csv' },
                    { label: 'Performance Reviews (CSV)', url: '/api/export/performance/csv' },
                  ].map(exp => (
                    <button key={exp.label} onClick={() => window.open(exp.url, '_blank')}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-purple-500/30 transition-all group">
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-300 group-hover:text-purple-400 transition-colors">{exp.label}</span>
                      <Download size={14} className="text-slate-600 group-hover:text-purple-400 transition-colors" />
                    </button>
                  ))}
                </div>
              </Section>
            )}
         </div>
      </div>
    </div>
  );
};

export default AdminSettings;
