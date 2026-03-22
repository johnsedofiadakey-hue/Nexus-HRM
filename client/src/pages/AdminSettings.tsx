import React, { useEffect, useState } from 'react';
import { toast } from '../utils/toast';
import { Settings, Shield, Save, Loader2, Key, Eye, EyeOff, Mail, Users, Download, CreditCard, CheckCircle, Edit3, Trash2, Zap, Camera, AlertTriangle } from 'lucide-react';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { getStoredUser, getRankFromRole } from '../utils/session';

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
  const user = getStoredUser();
  const isDEV = user.role === 'DEV';

  React.useEffect(() => {
    api.get('/payment/status').then(r => { setSub(r.data && typeof r.data === "object" ? r.data : null); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handlePay = async (plan: 'MONTHLY' | 'ANNUALLY') => {
    setPaying(true);
    try {
      const res = await api.post('/payment/initialize', { plan });
      if (res.data?.data?.authorization_url) {
        window.location.href = res.data.data.authorization_url;
      } else {
        toast.error('Could not initialize payment header.');
      }
    } catch (err: any) {
      toast.error(String(err?.response?.data?.error || 'Payment gateway initialization failed.'));
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

          {isDEV && !sub?.paystackConfigured && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
              <AlertTriangle size={16} /> Payment gateway is unconfigured. Requires Developer Ops.
            </div>
          )}

          {!isDEV && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  plan: 'MONTHLY' as const,
                  label: 'Nexus Pro (Monthly)',
                  price: sub?.monthlyPrice ? `GHS ${Number(sub.monthlyPrice).toLocaleString()}/mo` : '—',
                  desc: 'Full access to all HRM modules.',
                  highlight: false
                },
                {
                  plan: 'ANNUALLY' as const,
                  label: 'Enterprise (Annual)',
                  price: sub?.annualPrice ? `GHS ${Number(sub.annualPrice).toLocaleString()}/yr` : '—',
                  desc: 'Priority support + 20% Discount.',
                  highlight: true
                },
              ].map(opt => (
                <div key={opt.plan} className={cn("p-8 rounded-[2rem] relative border transition-colors",
                  opt.highlight ? "bg-primary/5 border-primary/20 hover:bg-primary/10" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                )}>
                  {opt.highlight && <span className="absolute -top-3 left-8 px-3 py-1 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/30">Most Popular</span>}
                  <p className="text-2xl font-black text-white font-display mb-1">{opt.label}</p>
                  <p className={cn("text-3xl font-black tracking-tighter mb-2", opt.highlight ? 'text-primary-light' : 'text-slate-300')}>{opt.price}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8">{opt.desc}</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handlePay(opt.plan)}
                    disabled={paying}
                    className={cn("w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg transition-all",
                      opt.highlight ? "bg-primary hover:bg-primary-light text-white shadow-primary/25" : "bg-white/[0.05] hover:bg-white/10 text-white border border-white/10"
                    )}
                  >
                    {paying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    {sub?.plan === opt.plan ? 'Current Plan' : 'Select Plan'}
                  </motion.button>
                </div>
              ))}
            </div>
          )}

          {isDEV && (
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gateway Status (Developer Only)</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                     <p className="text-[10px] text-slate-500 uppercase font-black">Configured</p>
                     <p className="text-sm font-bold text-white">{sub?.paystackConfigured ? 'YES' : 'NO'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                     <p className="text-[10px] text-slate-500 uppercase font-black">Currency</p>
                     <p className="text-sm font-bold text-white">GHS</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
};

const AdminSettings = () => {
  const { settings, refreshSettings, setLanguage, setTheme } = useTheme();
  const { t } = useTranslation();
  const [form, setForm] = useState<any>({
    companyName: '',
    companyLogoUrl: '',
    primaryColor: '#6366f1',
    secondaryColor: '#1E293B',
    accentColor: '#06b6d4',
    themePreset: 'ocean-deep',
    language: 'en',
    currency: 'GHS',
    accountCreatedBy: 'BOTH'
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);

  const user = getStoredUser();
  const isAdmin = getRankFromRole(user.role) >= 80;
  const isMD = user.role === 'MD';
  const isDEV = user.role === 'DEV';

  useEffect(() => {
    if (settings && Object.keys(form).length === 0) {
      setForm({ ...settings });
    }
  }, [settings, form]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put('/settings', form);
      
      // Update context immediately for local feedback
      if (form.language) setLanguage(form.language);
      if (form.themePreset) setTheme(form.themePreset);
      
      refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success(t('settings.saved_success') || 'Settings saved successfully');
    } catch (err: any) {
 console.error(err); }
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
          <Section title={t('settings.appearance')} desc={t('settings.theme')} icon={Settings} color="var(--primary)">
            <div className="space-y-8">
              {/* Language Selector */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-3">
                  {t('settings.language')}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'en', label: 'English', flag: '🇺🇸' },
                    { id: 'fr', label: 'Français', flag: '🇫🇷' }
                  ].map(lang => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setForm((f: any) => ({ ...f, language: lang.id }))}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex items-center gap-3",
                        form.language === lang.id 
                          ? "bg-primary/20 border-primary text-white shadow-lg shadow-primary/20" 
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]"
                      )}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span className="font-bold">{lang.label}</span>
                      {form.language === lang.id && <div className="ml-auto w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Grid */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-3">
                  Select Theme Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {THEMES.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setForm((f: any) => ({ ...f, themePreset: preset.id }))}
                      className={cn(
                        "p-5 rounded-3xl border transition-all text-left relative overflow-hidden group",
                        form.themePreset === preset.id 
                          ? "bg-primary/10 border-primary text-white" 
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <span className="text-2xl">{preset.emoji}</span>
                        <div>
                          <p className="font-black text-sm">{t(`settings.${preset.id.replace(/-/g, '_')}`)}</p>
                          <p className="text-[9px] uppercase tracking-widest opacity-60">
                            {preset.dark ? t('settings.midnight_ebony').split('(')[1]?.replace(')', '') : t('settings.pure_ivory').split('(')[1]?.replace(')', '')}
                          </p>
                        </div>
                        {form.themePreset === preset.id && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                        style={{ background: preset.dark ? 'white' : 'black' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-8 space-y-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Company Logo</label>
                <div className="flex items-center gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  {form.companyLogoUrl ? (
                    <img src={form.companyLogoUrl} alt="Logo Preview" className="h-12 w-auto object-contain rounded-lg" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/5 flex items-center justify-center text-slate-600">
                      <Camera size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 transition-all"
                    >
                      Upload Local File
                    </button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => setForm((f: any) => ({ ...f, companyLogoUrl: reader.result }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Theme Color Architecture */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { key: 'primaryColor', label: 'Primary Color', color: form.primaryColor || '#6366f1' },
                  { key: 'secondaryColor', label: 'Secondary Color', color: form.secondaryColor || '#1E293B' },
                  { key: 'accentColor', label: 'Accent Color', color: form.accentColor || '#06b6d4' },
                ].map((c) => (
                  <div key={c.key} className="space-y-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{c.label}</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer p-0"
                        value={c.color}
                        onChange={(e) => setForm((f: any) => ({ ...f, [c.key]: e.target.value }))}
                      />
                      <input
                        type="text"
                        className="nx-input p-2 font-mono text-[10px] uppercase flex-1"
                        value={c.color}
                        onChange={(e) => setForm((f: any) => ({ ...f, [c.key]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2">Global Currency</label>
                  <select
                    className="nx-input p-4 font-bold appearance-none bg-white/[0.02]"
                    value={form.currency || 'GHS'}
                    onChange={e => setForm((f: any) => ({ ...f, currency: e.target.value }))}
                  >
                      <option value="GHS">{t('settings.ghs')}</option>
                      <option value="GNF">{t('settings.gnf')}</option>
                      <option value="USD">{t('settings.usd')}</option>
                      <option value="EUR">{t('settings.eur')}</option>
                      <option value="GBP">{t('settings.gbp')}</option>
                    </select>
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
                  { value: 'DIRECTOR', label: 'Director', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
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
          {isDEV && (
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
          {isDEV && <LoginCustomSection form={form} setForm={setForm} handleSave={handleSave} saving={saving} saved={saved} />}

          {/* Paystack / Sub */}
          {(isDEV || isMD) && <SubscriptionSection />}
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Maintenance Mode */}
          {isDEV && (
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
