import React, { useState } from 'react';
import { 
  Building2, Palette, Globe, Shield, Bell, 
  CreditCard, Download, Save, ChevronRight,
  Lock, Languages, RefreshCw
} from 'lucide-react';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import api from '../services/api';
import { toast } from 'react-hot-toast';

type SettingsTab = 'company' | 'branding' | 'localization' | 'security' | 'notifications' | 'billing' | 'data';

const SettingsHub = () => {
  const { t } = useTranslation();
  const { theme, setTheme, settings, refreshSettings } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [loading, setLoading] = useState(false);

  // Form states merged from Company and Admin settings
  const [formData, setFormData] = useState({
    companyName: settings?.companyName || '',
    subtitle: settings?.subtitle || '',
    companyLogoUrl: settings?.companyLogoUrl || '',
    primaryColor: settings?.primaryColor || '',
    accentColor: settings?.accentColor || '',
    defaultLanguage: settings?.defaultLanguage || 'en',
    currency: settings?.currency || 'USD',
    vatRate: settings?.vatRate || 0,
    allowSelfRegistration: settings?.allowSelfRegistration ?? true
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/settings', formData);
      toast.success(t('common.settings_updated'));
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
    <div className="max-w-6xl mx-auto nx-card overflow-hidden flex flex-col md:flex-row min-h-[700px]">
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
      <div className="flex-1 p-8 lg:p-12 bg-[var(--bg-card)]">
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

            <div className="flex-1 space-y-8">
              {activeTab === 'branding' && (
                <div className="space-y-8">
                  <section>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-4">Theme Preset</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {THEMES.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setTheme(preset.id)}
                          className={cn(
                            "p-4 rounded-2xl border-2 text-left transition-all group",
                            theme === preset.id 
                              ? "border-[var(--primary)] bg-[var(--primary)]/5" 
                              : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                          )}
                        >
                          <div className="text-2xl mb-2">{preset.emoji}</div>
                          <p className="font-bold text-[var(--text-primary)]">{preset.label}</p>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-tighter mt-1">
                            {preset.dark ? 'Dark UI' : 'Light UI'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="p-6 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                      <Palette size={16} /> Dynamic Branding
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mb-6">
                      Override primary colors for supported themes (**Executive Light**).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase">Primary Color</label>
                        <div className="flex gap-3">
                          <input 
                            type="color" 
                            className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none"
                            value={formData.primaryColor || '#4f46e5'}
                            onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                          />
                          <input 
                            type="text" 
                            className="nx-input flex-1"
                            value={formData.primaryColor}
                            onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase">Accent Color</label>
                        <div className="flex gap-3">
                          <input 
                            type="color" 
                            className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none"
                            value={formData.accentColor || '#0ea5e9'}
                            onChange={e => setFormData({...formData, accentColor: e.target.value})}
                          />
                          <input 
                            type="text" 
                            className="nx-input flex-1"
                            value={formData.accentColor}
                            onChange={e => setFormData({...formData, accentColor: e.target.value})}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'company' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">Company Name</label>
                      <input 
                        type="text" 
                        className="nx-input"
                        value={formData.companyName}
                        onChange={e => setFormData({...formData, companyName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">Platform Subtitle</label>
                      <input 
                        type="text" 
                        className="nx-input"
                        value={formData.subtitle}
                        onChange={e => setFormData({...formData, subtitle: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-2">Organization Logo URL</label>
                    <div className="p-8 border-2 border-dashed border-[var(--border-subtle)] rounded-2xl flex flex-col items-center justify-center bg-[var(--bg-main)]/30">
                      {formData.companyLogoUrl ? (
                         <img src={formData.companyLogoUrl} className="h-16 mb-4 object-contain" alt="Logo preview" />
                      ) : (
                        <Building2 size={32} className="text-[var(--text-muted)] mb-4" />
                      )}
                      <input 
                        type="text" 
                        className="nx-input text-center"
                        value={formData.companyLogoUrl}
                        onChange={e => setFormData({...formData, companyLogoUrl: e.target.value})}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'localization' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                    <label className="block text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-3">Default System Language</label>
                    <div className="flex gap-4">
                      {['en', 'fr'].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setFormData({...formData, defaultLanguage: lang as any})}
                          className={cn(
                            "flex-1 py-4 rounded-xl border-2 font-bold transition-all",
                            formData.defaultLanguage === lang 
                              ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--text-primary)]" 
                              : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                          )}
                        >
                          <Languages size={18} className="mx-auto mb-1 opacity-50" />
                          {lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.1em] mb-3">Primary Currency</label>
                    <select 
                       className="nx-input"
                       value={formData.currency}
                       onChange={e => setFormData({...formData, currency: e.target.value})}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GNF">GNF - Guinean Franc</option>
                      <option value="GHS">GHS - Ghanaian Cedi</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Placeholder tabs for Security, Notifications, Billing, Data */}
              {['security', 'notifications', 'billing', 'data'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-main)]/50 rounded-3xl border border-dashed border-[var(--border-subtle)]">
                   <Lock size={48} className="text-[var(--text-muted)] mb-4 opacity-20" />
                   <p className="font-bold text-[var(--text-secondary)]">Module under maintenance</p>
                   <p className="text-xs text-[var(--text-muted)] mt-1">This section will be available in the next system parity update.</p>
                </div>
              )}
            </div>

            <div className="mt-12 pt-8 border-t border-[var(--border-subtle)] flex justify-end">
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
