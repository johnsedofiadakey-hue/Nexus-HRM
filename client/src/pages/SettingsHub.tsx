import { useState, useEffect } from 'react';
import { 
  Building2, Palette, Globe, Shield, Bell, 
  CreditCard, Download, Save, ChevronRight,
  Lock, Languages, RefreshCw, Check, AlertTriangle,
  Mail, Smartphone, HardDrive, ShieldCheck, Sparkles
} from 'lucide-react';
import { useTheme, THEMES, type ThemeName } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { getLogoUrl } from '../utils/logo';
import api from '../services/api';
import { toast } from 'react-hot-toast';

type SettingsTab = 'company' | 'branding' | 'localization' | 'security' | 'notifications' | 'billing' | 'data';

const SettingsHub = () => {
  const { t } = useTranslation();
  const { theme, setTheme, settings, refreshSettings, previewSettings, setLanguage } = useTheme();
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
    defaultLanguage: 'fr',
    currency: 'GNF',

    vatRate: 0,
    allowSelfRegistration: true,
    themePreset: 'premium-monolith' as ThemeName,
    // White-Label Details
    address: '',
    phone: '',
    email: '',
    city: '',
    country: '',
    isAiEnabled: false
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
        allowSelfRegistration: settings.allowSelfRegistration ?? true,
        themePreset: (settings.themePreset as ThemeName) || 'premium-monolith',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        city: settings.city || '',
        country: settings.country || '',
        isAiEnabled: settings.isAiEnabled ?? false
      });
    }
  }, [settings]);

  useEffect(() => {
    if (activeTab === 'branding') {
      previewSettings(formData as any);
    }
  }, [formData, activeTab, previewSettings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/settings', formData);
      // Update organization default AND user preference lock
      setLanguage(formData.defaultLanguage || 'en');
      toast.success(t('settings.update_success'));
      await refreshSettings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('common.error_updating_settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('logo', file);

    setLoading(true);
    try {
      const res = await api.post('/upload/logo', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, companyLogoUrl: res.data.logoUrl });
      toast.success('Logo uploaded successfully');
      await refreshSettings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any; description: string }[] = [
    { id: 'company', label: t('settings.company_profile'), icon: Building2, description: t('settings.company_description', 'Basic organization details and structure.') },
    { id: 'branding', label: t('settings.branding'), icon: Palette, description: t('settings.branding_description', 'Visual identity, logos, and theme presets.') },
    { id: 'localization', label: t('settings.localization'), icon: Globe, description: t('settings.localization_description', 'Language, currency, and regional formats.') },
    { id: 'security', label: t('settings.security'), icon: Shield, description: t('settings.security_description', 'Authentication, roles, and access control.') },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell, description: t('settings.notifications_description', 'Email and system alert preferences.') },
    { id: 'billing', label: t('settings.billing'), icon: CreditCard, description: t('settings.billing_description', 'Subscription plans and payment history.') },
    { id: 'data', label: t('settings.data_management'), icon: Download, description: t('settings.data_description', 'Export history, backups, and data privacy.') },
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 pb-32">
      {/* Sidebar Nav */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="mb-8 px-4">
          <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{t('common.settings')}</h2>
          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 opacity-60">{t('settings.system_config', 'System Configuration')}</p>
        </div>
        
        <div className="space-y-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative overflow-hidden",
                activeTab === tab.id 
                  ? "bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[var(--border-subtle)]" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)]/40 hover:text-[var(--text-primary)]"
              )}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-[var(--primary)] rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <tab.icon size={20} className={cn(
                "transition-colors",
                activeTab === tab.id ? "text-[var(--primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
              )} />
              <div className="text-left flex-1">
                <p className="text-[14px] font-bold tracking-tight">{tab.label}</p>
              </div>
              <ChevronRight size={14} className={cn(
                "transition-all",
                activeTab === tab.id ? "text-[var(--primary)] translate-x-0" : "text-[var(--text-muted)] -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
              )} />
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <div className="nx-card p-10 lg:p-14 min-h-[700px] border-[var(--border-subtle)] shadow-[0_30px_60px_rgba(0,0,0,0.02)] relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[var(--primary)]/5 blur-[120px] rounded-full pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="relative z-10"
            >
              <div className="mb-12">
                <h3 className="text-3xl font-black text-[var(--text-primary)] tracking-tight capitalize">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                <p className="text-[var(--text-secondary)] mt-3 text-[15px] font-medium leading-relaxed max-w-2xl">
                  {tabs.find(t => t.id === activeTab)?.description}
                </p>
              </div>

              <div className="space-y-16">
                {activeTab === 'branding' && (
                  <div className="space-y-16">
                    <section>
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{t('settings.appearance_theme', 'Appearance & Theme')}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {THEMES.map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              const presetDefaults: Record<ThemeName, Partial<typeof formData>> = {
                                  'premium-monolith': {
                                    primaryColor: '#a855f7', secondaryColor: '#18181b', accentColor: '#06b6d4', bgMain: '#09090b', bgCard: '#121215',
                                    textPrimary: '#fafafa', textSecondary: '#a1a1aa', textMuted: '#71717a',
                                    sidebarBg: '#09090b', sidebarActive: '#27272a', sidebarText: '#fafafa'
                                  },
                                  'premium-canvas': {
                                    primaryColor: '#4f46e5', secondaryColor: '#f3f4f6', accentColor: '#0ea5e9', bgMain: '#f9fafb', bgCard: '#ffffff',
                                    textPrimary: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
                                    sidebarBg: '#ffffff', sidebarActive: '#f1f5f9', sidebarText: '#0f172a'
                                  },
                                  'premium-aero': {
                                    primaryColor: '#10b981', secondaryColor: '#f1f5f9', accentColor: '#34d399', bgMain: '#f8fafc', bgCard: '#ffffff',
                                    textPrimary: '#1e293b', textSecondary: '#475569', textMuted: '#94a3b8',
                                    sidebarBg: '#0f172a', sidebarActive: '#1e293b', sidebarText: '#ffffff'
                                  }
                                };
                              setTheme(preset.id);
                              setFormData({ ...formData, ...presetDefaults[preset.id], themePreset: preset.id });
                            }}
                            className={cn(
                              "group p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden",
                              theme === preset.id 
                                ? "border-[var(--primary)] bg-[var(--bg-main)] shadow-xl shadow-[var(--primary)]/5" 
                                : "border-transparent bg-[var(--bg-elevated)] hover:bg-[var(--bg-main)] hover:border-[var(--border-strong)]/20"
                            )}
                          >
                            <div className="flex items-center justify-between mb-6">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 duration-500",
                                theme === preset.id ? "bg-[var(--primary)]/10" : "bg-white/10"
                              )}>
                                {preset.emoji}
                              </div>
                              {theme === preset.id && (
                                <div className="w-6 h-6 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary)]/30">
                                  <Check size={14} className="text-white" />
                                </div>
                              )}
                            </div>
                            <p className="font-bold text-lg text-[var(--text-primary)] tracking-tight">{preset.label}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-2 font-black opacity-60">
                              {preset.dark ? t('settings.dark_interface', 'Dark Interface') : t('settings.light_interface', 'Light Interface')}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="p-10 rounded-[2.5rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] relative">
                      <div className="flex items-center justify-between mb-10">
                        <div>
                          <h4 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-3">
                            <Palette size={16} className="text-[var(--primary)]" /> {t('settings.custom_design_tokens', 'Custom Design Tokens')}
                          </h4>
                        </div>
                        <button 
                          onClick={() => setFormData({
                            ...formData,
                            primaryColor: '', secondaryColor: '', accentColor: '',
                            bgMain: '', bgCard: '', textPrimary: '', textSecondary: '', textMuted: '',
                            sidebarBg: '', sidebarActive: '', sidebarText: ''
                          })}
                          className="text-[10px] font-bold px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all uppercase tracking-widest"
                        >
                          {t('settings.restore_standards', 'Restore Standards')}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                         {[
                           { id: 'primaryColor', label: t('settings.colors.primary', 'Primary Brand') },
                           { id: 'secondaryColor', label: t('settings.colors.secondary', 'Secondary UI') },
                           { id: 'accentColor', label: t('settings.colors.accent', 'Accent Highlight') },
                           { id: 'bgMain', label: t('settings.colors.bgMain', 'Main Canvas') },
                           { id: 'bgCard', label: t('settings.colors.bgCard', 'Surface Card') },
                           { id: 'textPrimary', label: t('settings.colors.textPrimary', 'Deep Text') },
                           { id: 'textSecondary', label: t('settings.colors.textSecondary', 'Mid-Text') },
                           { id: 'textMuted', label: t('settings.colors.textMuted', 'Soft Text') },
                           { id: 'sidebarBg', label: t('settings.colors.sidebarBg', 'Navigator BG') },
                           { id: 'sidebarActive', label: t('settings.colors.sidebarActive', 'Active State') },
                           { id: 'sidebarText', label: t('settings.colors.sidebarText', 'Active Text') },
                         ].map(color => (
                           <div key={color.id} className="space-y-4">
                             <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">{color.label}</label>
                             <div className="flex items-center gap-3 group">
                               {/* Helper to ensure valid hex for color input */}
                               <div className="relative shrink-0">
                                 <input 
                                   type="color" 
                                   className="w-12 h-12 rounded-2xl cursor-pointer bg-transparent border-none p-0 outline-none relative z-10 opacity-0"
                                   value={(() => {
                                     const val = (formData as any)[color.id] || '#000000';
                                     if (val.startsWith('rgba')) return '#000000'; // Default fallback for translucent colors
                                     return val.startsWith('#') ? val : '#000000';
                                   })()}
                                   onChange={e => setFormData({...formData, [color.id]: e.target.value})}
                                 />
                                 <div 
                                   className="absolute inset-0 rounded-2xl border-2 border-[var(--bg-card)] shadow-sm transition-transform group-hover:scale-110" 
                                   style={{ backgroundColor: (formData as any)[color.id] }}
                                 />
                               </div>
                               <input 
                                 type="text" 
                                 className="flex-1 bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[13px] font-mono py-2 transition-all placeholder:text-[var(--text-muted)]"
                                 value={(formData as any)[color.id]}
                                 onChange={e => setFormData({...formData, [color.id]: e.target.value})}
                                 placeholder="#XXXXXX"
                               />
                             </div>
                           </div>
                         ))}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'company' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-10">
                      <section className="space-y-6">
                        <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">{t('settings.general_info', 'General Information')}</h4>
                        <div className="space-y-8">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.company_name', 'Company Name')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              value={formData.companyName}
                              onChange={e => setFormData({...formData, companyName: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.platform_subtitle', 'Platform Subtitle')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              value={formData.subtitle}
                              onChange={e => setFormData({...formData, subtitle: e.target.value})}
                            />
                          </div>
                        </div>
                      </section>
                      
                      <section className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10">
                        <div className="flex gap-4">
                          <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                          <div>
                            <p className="text-[13px] font-bold text-amber-900/80">{t('settings.org_notice_title', 'Organization Settings Notice')}</p>
                            <p className="text-[11px] text-amber-700/60 mt-1.5 leading-relaxed font-medium">{t('settings.org_notice_desc', 'Changes here affect public billing receipts and organization-wide headers. Please verify all details before saving.')}</p>
                          </div>
                        </div>
                      </section>

                      {/* Official Contact Details for White-Labeling */}
                      <section className="space-y-8 bg-[var(--bg-elevated)]/30 p-8 rounded-[2.5rem] border border-[var(--border-subtle)]">
                        <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                          <Globe size={14} className="text-[var(--primary)]" /> {t('settings.contact_details', 'Official Contact Details')}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.official_address', 'Official Address')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              placeholder="e.g. 123 Business Ave, Suite 100"
                              value={formData.address}
                              onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.official_phone', 'Official Phone')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              placeholder="+224 ..."
                              value={formData.phone}
                              onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.official_email', 'Official Email')}</label>
                            <input 
                              type="email" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              placeholder="hr@company.com"
                              value={formData.email}
                              onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.city', 'City')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              value={formData.city}
                              onChange={e => setFormData({...formData, city: e.target.value})}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-3 uppercase tracking-widest pl-1">{t('settings.labels.country', 'Country')}</label>
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-b-2 border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-[15px] font-semibold py-3 transition-all"
                              value={formData.country}
                              onChange={e => setFormData({...formData, country: e.target.value})}
                            />
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="space-y-8">
                      <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{t('settings.labels.company_logo', 'Company Logo')}</h4>
                      <div className="p-12 border-2 border-dashed border-[var(--border-subtle)] rounded-[3rem] flex flex-col items-center justify-center bg-[var(--bg-elevated)]/30 group hover:bg-[var(--bg-elevated)]/50 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[var(--primary)]/5 opacity-0 group-hover:opacity-10 transition-opacity blur-3xl pointer-events-none" />
                        
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full relative z-10">
                          {getLogoUrl(formData.companyLogoUrl) ? (
                            <img 
                              src={getLogoUrl(formData.companyLogoUrl) as string} 
                              className="h-24 mb-8 object-contain drop-shadow-2xl" 
                              alt="Logo preview" 
                            />
                          ) : (
                            <Building2 size={48} className="text-[var(--text-muted)] mb-8 opacity-20" />
                          )}
                          
                          <div className="px-6 py-2 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20 group-hover:scale-105 transition-transform">
                            {formData.companyLogoUrl ? t('settings.change_design', 'Change Design') : t('settings.upload_identity', 'Upload Identity')}
                          </div>
                          
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleLogoUpload}
                          />
                        </label>
                        <p className="text-[10px] text-[var(--text-muted)] mt-6 font-bold uppercase tracking-widest opacity-50 relative z-10">SVG, PNG or WEBP (Max 5MB)</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'localization' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <section className="space-y-8">
                      <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">{t('settings.global_language_system', 'Global Language System')}</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { id: 'en', label: 'English (US)', sub: 'Primary International Standard' },
                          { id: 'fr', label: 'Français (Guinée)', sub: 'Bilingual Regional standard' }
                        ].map((lang) => (
                          <button
                            key={lang.id}
                            onClick={() => setFormData({...formData, defaultLanguage: lang.id})}
                            className={cn(
                              "p-6 rounded-2xl border-2 text-left transition-all relative group",
                              formData.defaultLanguage === lang.id 
                                ? "border-[var(--primary)] bg-[var(--primary)]/5" 
                                : "border-transparent bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)]"
                            )}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Languages size={24} className={cn("opacity-40", formData.defaultLanguage === lang.id ? "text-[var(--primary)]" : "")} />
                              {formData.defaultLanguage === lang.id && <Check size={16} className="text-[var(--primary)]" />}
                            </div>
                            <p className="font-bold text-[var(--text-primary)]">{lang.label}</p>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mt-1 opacity-60">{lang.sub}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-8">
                      <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{t('settings.currency_region', 'Currency & Region')}</h4>
                      <div className="space-y-8 p-10 rounded-[2.5rem] bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]">
                        <div>
                          <label className="block text-[10px] font-black text-[var(--text-muted)] mb-4 uppercase tracking-[0.15em] ml-1">{t('settings.labels.system_currency', 'System Currency')}</label>
                          <select 
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[14px] font-bold focus:border-[var(--primary)] outline-none shadow-sm appearance-none cursor-pointer"
                            value={formData.currency}
                            onChange={e => setFormData({...formData, currency: e.target.value})}
                          >
                            <option value="GNF">GNF (FG) - Guinean Franc</option>
                            <option value="USD">USD ($) - US Dollar</option>
                            <option value="EUR">EUR (€) - Euro</option>
                            <option value="GBP">GBP (£) - British Pound</option>
                            <option value="GHS">GHS (₵) - Ghanaian Cedi</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-[var(--text-muted)] mb-4 uppercase tracking-[0.15em] ml-1">{t('settings.labels.default_vat_rate', 'Default VAT Rate (%)')}</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[14px] font-bold focus:border-[var(--primary)] outline-none shadow-sm"
                              value={formData.vatRate}
                              onChange={e => setFormData({...formData, vatRate: parseFloat(e.target.value)})}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-[var(--text-muted)] opacity-40">%</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <section className="p-10 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Shield size={120} />
                      </div>
                      <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-[var(--text-primary)]">{t('settings.governance', 'Governance')}</h4>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('settings.policy_controls', 'Policy Controls')}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] group">
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-primary)]">{t('settings.password_complexity', 'Password Complexity')}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">{t('settings.password_complexity_desc', 'Enforce symbols and numbers.')}</p>
                          </div>
                          <input type="checkbox" defaultChecked className="toggle-checkbox" />
                        </div>
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-primary)]">{t('settings.mfa_requirement', 'MFA Requirement')}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">{t('settings.mfa_requirement_desc', 'Mandatory for all admin roles.')}</p>
                          </div>
                          <input type="checkbox" className="toggle-checkbox" />
                        </div>
                      </div>
                    </section>

                    <section className="p-10 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                         <Sparkles size={120} />
                      </div>
                      <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-[var(--text-primary)]">{t('settings.ai_assistant', 'AI Assistant')}</h4>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('settings.nexus_ai_engine', 'Nexus AI Engine')}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-primary)]">{t('settings.enable_ai', 'Enable AI Assistant')}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">{t('settings.enable_ai_desc', 'Strategic insights & document analysis.')}</p>
                          </div>
                          <input 
                             type="checkbox" 
                             className="toggle-checkbox" 
                             checked={formData.isAiEnabled}
                             onChange={e => setFormData({...formData, isAiEnabled: e.target.checked})}
                          />
                        </div>
                        {!formData.isAiEnabled && (
                           <p className="text-[10px] text-amber-600 font-bold px-2 italic">Assistant is currently deactivated system-wide.</p>
                        )}
                      </div>
                    </section>

                    <section className="p-10 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 shadow-sm relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Lock size={120} />
                      </div>
                      <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                          <Lock size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-[var(--text-primary)]">{t('settings.sessions', 'Sessions')}</h4>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t('settings.identity_management', 'Identity Management')}</p>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] ml-1">{t('settings.auto_termination', 'Auto-Termination (Minutes)')}</label>
                        <select className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl px-5 py-4 text-[14px] font-bold focus:border-[var(--primary)] outline-none shadow-sm appearance-none cursor-pointer">
                          <option>15 Minutes</option>
                          <option>30 Minutes</option>
                          <option defaultValue={60}>60 Minutes (Default)</option>
                          <option>240 Minutes</option>
                        </select>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium px-2 leading-relaxed opacity-60">{t('settings.auto_termination_desc', 'Users will be automatically logged out after inactivity for security.')}</p>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {[
                      { icon: Mail, title: 'Email Notifications', desc: 'Communication preferences.', items: ['Leave Approvals', 'Payroll Updates', 'New Hire Welcome'] },
                      { icon: Smartphone, title: 'System Alerts', desc: 'Real-time application alerts.', items: ['Task Deadlines', 'Company Announcements', 'Performance Reviews'] }
                    ].map((sec, idx) => (
                      <div key={idx} className="p-10 rounded-[3rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50">
                        <div className="flex items-center gap-4 mb-10">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", idx === 0 ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--accent)]/10 text-[var(--accent)]")}>
                            <sec.icon size={22} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-[var(--text-primary)]">{t(`settings.${sec.title?.toLowerCase()?.replace(' ', '_')}`, sec.title)}</h4>
                            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">{t(`settings.${sec.desc?.toLowerCase()?.replace(/[\s\.]/g, '_')}`, sec.desc)}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {sec.items.map(item => (
                            <div key={item} className="flex items-center justify-between py-4 border-b border-[var(--border-subtle)]/50 last:border-0">
                              <span className="text-[13px] font-semibold text-[var(--text-secondary)]">{item}</span>
                              <input type="checkbox" defaultChecked className="toggle-checkbox" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'billing' && (
                  <div className="space-y-10">
                    <div className="p-12 rounded-[2rem] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white overflow-hidden relative shadow-xl shadow-[var(--primary)]/20 group">
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="px-5 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Enterprise Premium</div>
                           <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]" />
                        </div>
                        <h4 className="text-6xl font-black tracking-tight mb-10">Enterprise</h4>
                        <div className="flex flex-wrap gap-8">
                           <div className="p-5 rounded-2xl bg-white/5 border border-white/10 min-w-[160px]">
                             <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">{t('settings.billing_cycle_end', 'Billing Cycle End')}</p>
                             <p className="text-lg font-bold">Dec 2026</p>
                           </div>
                           <div className="p-5 rounded-2xl bg-white/5 border border-white/10 min-w-[160px]">
                             <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">{t('settings.usage_limit', 'Usage Limit')}</p>
                             <p className="text-lg font-bold">412 / 1000 {t('common.users', 'Users')}</p>
                           </div>
                        </div>
                      </div>
                      <Building2 className="absolute -bottom-20 -right-20 text-white opacity-[0.05] transition-transform group-hover:scale-110 duration-1000" size={400} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <button className="p-8 rounded-[2.5rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)] hover:border-[var(--primary)]/30 transition-all text-left shadow-sm group">
                        <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)] mb-6 transition-transform group-hover:scale-110">
                          <CreditCard size={20} />
                        </div>
                        <p className="font-bold text-[var(--text-primary)]">{t('settings.payment_instrument', 'Payment Instrument')}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-2 uppercase font-black tracking-tighter opacity-50">Visa **** 4492</p>
                      </button>
                      {/* More billing buttons with same style */}
                    </div>
                  </div>
                )}

                {activeTab === 'data' && (
                  <div className="space-y-10">
                    <section className="p-12 rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-5 transition-opacity">
                         <HardDrive size={200} />
                      </div>
                      <div className="flex items-center gap-5 mb-12">
                         <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center text-[var(--primary)]">
                            <HardDrive size={28} />
                         </div>
                         <div>
                           <h4 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{t('settings.data_management', 'Data Management')}</h4>
                           <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">{t('settings.export_backups', 'Export & Backups')}</p>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <button className="flex items-center justify-between p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all group">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                               <RefreshCw size={18} />
                             </div>
                             <span className="text-[13px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Employee Core Set</span>
                           </div>
                           <Download size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-all group-hover:translate-y-0.5" />
                        </button>
                        <button className="flex items-center justify-between p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all group">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                               <CreditCard size={18} />
                             </div>
                             <span className="text-[13px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Fiscal History</span>
                           </div>
                           <Download size={18} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-all group-hover:translate-y-0.5" />
                        </button>
                      </div>
                    </section>

                    {/* Production Readiness — Data Purge */}
                    <section className="p-12 rounded-[2rem] border-2 border-rose-500/20 bg-rose-500/5 relative overflow-hidden">
                      <div className="flex items-center gap-5 mb-6">
                         <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                            <AlertTriangle size={28} />
                         </div>
                         <div>
                           <h4 className="text-xl font-bold text-rose-700 dark:text-rose-400 tracking-tight">{t('settings.data_purge_title', 'Production Data Reset')}</h4>
                           <p className="text-[11px] font-bold text-rose-500/70 uppercase tracking-[0.2em] mt-1">{t('settings.danger_zone', 'Danger Zone — Irreversible Action')}</p>
                         </div>
                      </div>
                      <p className="text-[13px] text-rose-700/70 dark:text-rose-400/70 mb-8 leading-relaxed font-medium max-w-2xl">
                        {t('settings.data_purge_desc', 'Permanently wipe all transactional data — targets, appraisals, leave requests, payroll records, attendance logs, and notifications. The organization structure (employees, departments, settings) will be preserved.')}
                        <strong className="text-rose-600"> {t('settings.data_purge_warning', 'Use this once before going live.')}</strong>
                      </p>
                      <button
                        onClick={async () => {
                          const pin = window.prompt('ENTER SECURITY PIN (4-Digits) TO AUTHORIZE RESET:');
                          if (pin !== '5646') {
                            if (pin !== null) toast.error('Unauthorized — Incorrect PIN.');
                            return;
                          }

                          const input = window.prompt('FINAL WARNING: Type "CONFIRM" to permanently delete all transactional data. This action is IRREVERSIBLE.');
                          if (input !== 'CONFIRM') {
                            if (input !== null) toast.error('Purge cancelled — confirmation text did not match.');
                            return;
                          }
                          
                          setLoading(true);
                          try {
                            await api.post('/settings/purge-data', { pin });
                            toast.success('✅ All demo/transactional data purged. System is ready for production.');
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Purge failed. Please try again.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="px-8 py-4 rounded-2xl bg-rose-600 text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                      >
                        <AlertTriangle size={16} />
                        {t('settings.purge_button', 'Purge All Demo Data')}
                      </button>
                    </section>
                  </div>
                )}

              </div>

              {/* Bottom Form Bar */}
              <div className="mt-20 pt-10 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <div className="hidden md:block">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 italic">{t('settings.auto_sync_enabled', 'System Auto-sync Enabled')}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-10 py-5 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>{t('common.save_changes')}</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SettingsHub;
