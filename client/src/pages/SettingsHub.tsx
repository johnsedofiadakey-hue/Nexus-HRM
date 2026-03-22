import React, { useState, useEffect } from 'react';
import { 
  Building2, Palette, Globe, Shield, Bell, 
  CreditCard, Download, Save, ChevronRight,
  Lock, Languages, RefreshCw, Check, AlertTriangle,
  Mail, Smartphone, HardDrive, ShieldCheck
} from 'lucide-react';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import api from '../services/api';
import { toast } from 'react-hot-toast';

type SettingsTab = 'company' | 'branding' | 'localization' | 'security' | 'notifications' | 'billing' | 'data';

const SettingsHub = () => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, settings, refreshSettings } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    subtitle: '',
    companyLogoUrl: '',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    bgMain: '',
    bgCard: '',
    textPrimary: '',
    textSecondary: '',
    textMuted: '',
    sidebarBg: '',
    sidebarActive: '',
    sidebarText: '',
    defaultLanguage: 'en',
    currency: 'USD',
    vatRate: 0,
    allowSelfRegistration: true
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || '',
        subtitle: settings.subtitle || '',
        companyLogoUrl: settings.companyLogoUrl || '',
        primaryColor: settings.primaryColor || '',
        secondaryColor: settings.secondaryColor || '',
        accentColor: settings.accentColor || '',
        bgMain: settings.bgMain || '',
        bgCard: settings.bgCard || '',
        textPrimary: settings.textPrimary || '',
        textSecondary: settings.textSecondary || '',
        textMuted: settings.textMuted || '',
        sidebarBg: settings.sidebarBg || '',
        sidebarActive: settings.sidebarActive || '',
        sidebarText: settings.sidebarText || '',
        defaultLanguage: settings.defaultLanguage || 'en',
        currency: settings.currency || 'USD',
        vatRate: settings.vatRate || 0,
        allowSelfRegistration: settings.allowSelfRegistration ?? true
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/settings', formData);
      toast.success(t('common.settings_updated'));
      if (formData.defaultLanguage !== i18n.language) {
        i18n.changeLanguage(formData.defaultLanguage);
      }
      await refreshSettings();
    } catch (err) {
      toast.error(t('common.error_updating_settings'));
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any; description: string }[] = [
    { id: 'company', label: t('settings.company_profile'), icon: Building2, description: 'Basic organization details and structure.' },
    { id: 'branding', label: t('settings.branding'), icon: Palette, description: 'Visual identity, logos, and theme presets.' },
    { id: 'localization', label: t('settings.localization'), icon: Globe, description: 'Language, currency, and regional formats.' },
    { id: 'security', label: t('settings.security'), icon: Shield, description: 'Authentication, roles, and access control.' },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell, description: 'Email and system alert preferences.' },
    { id: 'billing', label: t('settings.billing'), icon: CreditCard, description: 'Subscription plans and payment history.' },
    { id: 'data', label: t('settings.data_management'), icon: Download, description: 'Export history, backups, and data privacy.' },
  ];

  return (
    <div className="max-w-6xl mx-auto nx-card overflow-hidden flex flex-col md:flex-row min-h-[800px]">
      {/* Sidebar Nav */}
      <div className="w-full md:w-80 border-r border-[var(--border-subtle)] bg-[var(--bg-main)]/50 p-6 space-y-2">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('common.settings')}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Manage your enterprise environment</p>
        </div>
        
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
              activeTab === tab.id 
                ? "bg-[var(--bg-card)] shadow-sm border border-[var(--border-subtle)] text-[var(--primary)]" 
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)]/50"
            )}
          >
            <tab.icon size={18} className={cn(activeTab === tab.id ? "text-[var(--primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]")} />
            <div className="text-left flex-1">
              <p className="text-[13px] font-bold leading-none">{tab.label}</p>
            </div>
            {activeTab === tab.id && <ChevronRight size={14} className="text-[var(--primary)]" />}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-8 lg:p-12 bg-[var(--bg-card)] h-[800px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col"
          >
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-[var(--text-primary)] capitalize">{tabs.find(t => t.id === activeTab)?.label}</h3>
              <p className="text-[var(--text-secondary)] mt-2 font-medium">{tabs.find(t => t.id === activeTab)?.description}</p>
            </div>

            <div className="flex-1 space-y-12 pb-20">
              {activeTab === 'branding' && (
                <div className="space-y-10">
                  <section>
                    <h4 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest mb-6">Theme Preset</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {THEMES.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setTheme(preset.id)}
                          className={cn(
                            "p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group",
                            theme === preset.id 
                              ? "border-[var(--primary)] bg-[var(--primary)]/5" 
                              : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                          )}
                        >
                          <div className="text-2xl mb-2">{preset.emoji}</div>
                          <p className="font-bold text-[var(--text-primary)]">{preset.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter mt-1 font-black">
                            {preset.dark ? 'Dark UI System' : 'Light UI System'}
                          </p>
                          {theme === preset.id && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="p-8 rounded-3xl bg-[var(--bg-main)]/50 border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                          <Palette size={16} /> Advanced Color Palette
                        </h4>
                        <button 
                          onClick={() => setFormData({
                            ...formData,
                            primaryColor: '', secondaryColor: '', accentColor: '',
                            bgMain: '', bgCard: '', textPrimary: '', textSecondary: '', textMuted: '',
                            sidebarBg: '', sidebarActive: '', sidebarText: ''
                          })}
                          className="text-[10px] font-black p-2 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-all uppercase tracking-widest"
                        >
                          Reset to Defaults
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                       {[
                         { id: 'primaryColor', label: 'Primary Brand' },
                         { id: 'secondaryColor', label: 'Secondary UI' },
                         { id: 'accentColor', label: 'Accent Highlights' },
                         { id: 'bgMain', label: 'Main Background' },
                         { id: 'bgCard', label: 'Card Surface' },
                         { id: 'textPrimary', label: 'Primary Text' },
                         { id: 'textSecondary', label: 'Secondary Text' },
                         { id: 'textMuted', label: 'Muted Text' },
                         { id: 'sidebarBg', label: 'Sidebar Background' },
                         { id: 'sidebarActive', label: 'Sidebar Active' },
                         { id: 'sidebarText', label: 'Sidebar Active Text' },
                       ].map(color => (
                         <div key={color.id} className="space-y-3">
                           <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{color.label}</label>
                           <div className="flex gap-2">
                             <div className="relative">
                               <input 
                                 type="color" 
                                 className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0 outline-none"
                                 value={(formData as any)[color.id] || '#000000'}
                                 onChange={e => setFormData({...formData, [color.id]: e.target.value})}
                               />
                               <div 
                                 className="absolute inset-0 rounded-lg pointer-events-none border border-[var(--border-strong)]" 
                                 style={{ backgroundColor: (formData as any)[color.id] }}
                               />
                             </div>
                             <input 
                               type="text" 
                               className="nx-input flex-1 text-xs font-mono"
                               value={(formData as any)[color.id]}
                               onChange={e => setFormData({...formData, [color.id]: e.target.value})}
                               placeholder="#HEXCODE"
                             />
                           </div>
                         </div>
                       ))}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'company' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <section className="space-y-4">
                      <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">General Information</h4>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase">Company Name</label>
                        <input 
                          type="text" 
                          className="nx-input"
                          value={formData.companyName}
                          onChange={e => setFormData({...formData, companyName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase">Platform Subtitle</label>
                        <input 
                          type="text" 
                          className="nx-input"
                          value={formData.subtitle}
                          onChange={e => setFormData({...formData, subtitle: e.target.value})}
                        />
                      </div>
                    </section>
                    
                    <section className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                      <div className="flex gap-3">
                        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                        <div>
                          <p className="text-xs font-bold text-amber-700">Enterprise Registry</p>
                          <p className="text-[10px] text-amber-600/80 mt-1">Changes here affect public billing receipts and organization identifiers.</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Brand Mark</h4>
                    <div className="p-10 border-2 border-dashed border-[var(--border-subtle)] rounded-3xl flex flex-col items-center justify-center bg-[var(--bg-main)]/30 group hover:bg-[var(--bg-main)]/50 transition-colors">
                      {formData.companyLogoUrl ? (
                         <img src={formData.companyLogoUrl} className="h-20 mb-6 object-contain drop-shadow-sm" alt="Logo preview" />
                      ) : (
                        <Building2 size={40} className="text-[var(--text-muted)] mb-6 opacity-30" />
                      )}
                      <input 
                        type="text" 
                        className="nx-input text-center max-w-sm"
                        value={formData.companyLogoUrl}
                        onChange={e => setFormData({...formData, companyLogoUrl: e.target.value})}
                        placeholder="Organization Logo URL"
                      />
                      <p className="text-[10px] text-[var(--text-muted)] mt-4 font-medium uppercase tracking-tighter">Recommended: Transparent SVG/PNG (256x256)</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'localization' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <section className="space-y-6">
                    <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Global Language</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'en', label: 'English', sub: 'Default' },
                        { id: 'fr', label: 'French', sub: 'Bilingual' }
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => setFormData({...formData, defaultLanguage: lang.id})}
                          className={cn(
                            "p-5 rounded-2xl border-2 text-left transition-all",
                            formData.defaultLanguage === lang.id 
                              ? "border-[var(--primary)] bg-[var(--primary)]/5" 
                              : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                          )}
                        >
                          <Languages size={20} className="mb-2 opacity-50" />
                          <p className="font-bold">{lang.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">{lang.sub}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h4 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Finance & Regional</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase">System Currency</label>
                        <select 
                          className="nx-input font-bold"
                          value={formData.currency}
                          onChange={e => setFormData({...formData, currency: e.target.value})}
                        >
                          <option value="USD">USD ($) - US Dollar</option>
                          <option value="EUR">EUR (€) - Euro</option>
                          <option value="GBP">GBP (£) - British Pound</option>
                          <option value="GNF">GNF (FG) - Guinean Franc</option>
                          <option value="GHS">GHS (₵) - Ghanaian Cedi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase">Default Tax Rate (%)</label>
                        <input 
                          type="number" 
                          className="nx-input"
                          value={formData.vatRate}
                          onChange={e => setFormData({...formData, vatRate: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-10">
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="nx-card p-6 border border-[var(--border-subtle)] bg-[var(--bg-main)]/30">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-2 bg-[var(--primary)]/10 rounded-lg text-[var(--primary)]">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[var(--text-primary)]">Password Governance</h4>
                          <p className="text-xs text-[var(--text-muted)]">Enforce security standards for all users.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                          <span className="text-xs font-bold text-[var(--text-secondary)]">Require Complex Passwords</span>
                          <input type="checkbox" defaultChecked className="toggle-checkbox" />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                          <span className="text-xs font-bold text-[var(--text-secondary)]">Force Multi-Factor (MFA)</span>
                          <input type="checkbox" className="toggle-checkbox" />
                        </div>
                      </div>
                    </div>

                    <div className="nx-card p-6 border border-[var(--border-subtle)] bg-[var(--bg-main)]/30">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                          <Lock size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[var(--text-primary)]">Session Management</h4>
                          <p className="text-xs text-[var(--text-muted)]">Control session duration and timeouts.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase">Auto Logout (Minutes)</label>
                        <select className="nx-input text-xs font-bold">
                          <option>15 Minutes</option>
                          <option>30 Minutes</option>
                          <option defaultValue={60}>60 Minutes (Default)</option>
                          <option>240 Minutes</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { icon: Mail, title: 'Email Alerts', desc: 'Manage automated email triggers.', items: ['Leave Approvals', 'Payroll Distribution', 'New Employee Welcome'] },
                      { icon: Smartphone, title: 'Push Notifications', desc: 'In-app and mobile device alerts.', items: ['Task Assignments', 'System Announcements', 'Performance Reviews'] }
                    ].map((sec, idx) => (
                      <div key={idx} className="nx-card p-6 border border-[var(--border-subtle)]">
                        <div className="flex items-center gap-3 mb-6">
                          <sec.icon size={20} className="text-[var(--primary)]" />
                          <h4 className="font-bold text-[var(--text-primary)]">{sec.title}</h4>
                        </div>
                        <div className="space-y-3">
                          {sec.items.map(item => (
                            <div key={item} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                              <span className="text-xs font-medium text-[var(--text-secondary)]">{item}</span>
                              <input type="checkbox" defaultChecked className="toggle-checkbox" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-8">
                  <div className="nx-card p-10 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white overflow-hidden relative">
                    <div className="relative z-10">
                      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80 mb-2">Current Subscription</p>
                      <h4 className="text-4xl font-black mb-6">Enterprise Elite</h4>
                      <div className="flex gap-10">
                         <div>
                           <p className="text-[10px] font-bold opacity-60 uppercase">Next Billing</p>
                           <p className="font-mono font-bold">Oct 24, 2026</p>
                         </div>
                         <div>
                           <p className="text-[10px] font-bold opacity-60 uppercase">Active Users</p>
                           <p className="font-mono font-bold">42 / 500</p>
                         </div>
                      </div>
                    </div>
                    <Building2 className="absolute -bottom-10 -right-10 text-white opacity-10" size={240} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <button className="p-6 rounded-2xl border border-[var(--border-subtle)] hover:bg-[var(--bg-main)] transition-all text-left">
                      <CreditCard size={20} className="mb-4 text-[var(--primary)]" />
                      <p className="font-bold text-[var(--text-primary)]">Manage Payment</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase font-black">Visa **** 4242</p>
                    </button>
                    {/* Placeholder buttons for more billing actions */}
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div className="space-y-8">
                  <section className="nx-card p-8 border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-4 mb-8">
                       <HardDrive size={24} className="text-[var(--primary)]" />
                       <div>
                         <h4 className="font-bold text-[var(--text-primary)]">Export & Portability</h4>
                         <p className="text-xs text-[var(--text-muted)]">Download your data in standard CSV format.</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all group">
                         <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--primary)]">Employee Directory (CSV)</span>
                         <Download size={16} className="text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
                      </button>
                      <button className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all group">
                         <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--primary)]">Payroll History (CSV)</span>
                         <Download size={16} className="text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
                      </button>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Bottom Form Bar */}
            <div className="sticky bottom-0 mt-auto pt-8 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                <span>{t('common.save_changes')}</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SettingsHub;
