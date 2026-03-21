import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import i18n from '../i18n';

// ── Available themes (must match data-theme values in index.css) ──────────────
export type ThemeName = 'midnight-pro' | 'emerald-luxe' | 'modern-rose' | 'nordic-white' | 'high-contrast' | 'nexus-dark' | 'light';

export const THEMES: { id: ThemeName; label: string; emoji: string; dark: boolean }[] = [
  { id: 'midnight-pro',  label: 'Midnight Pro',  emoji: '🌌', dark: true  },
  { id: 'emerald-luxe',  label: 'Emerald Luxe',  emoji: '🌿', dark: true  },
  { id: 'modern-rose',   label: 'Modern Rose',   emoji: '🌸', dark: true  },
  { id: 'nordic-white',  label: 'Nordic White',  emoji: '❄️', dark: false },
  { id: 'high-contrast', label: 'High Contrast', emoji: '⬛', dark: true  },
];

// ── System Settings from API ──────────────────────────────────────────────────
interface SystemSettings {
  companyName: string;
  companyLogoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  sidebarColor: string;
  subtitle: string;
  themePreset?: string;
  lightMode?: boolean;
  language?: 'en' | 'fr';
  plan?: string;
}

interface ThemeContextType {
  settings: SystemSettings;
  refreshSettings: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  // New: multi-theme support
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  language: 'en' | 'fr';
  setLanguage: (lang: 'en' | 'fr') => void;
}

const defaultSettings: SystemSettings = {
  companyName: 'Nexus HRM',
  companyLogoUrl: '',
  primaryColor: '#6366f1',
  secondaryColor: '#1E293B',
  accentColor: '#06b6d4',
  textColor: '#FFFFFF',
  sidebarColor: '#080c16',
  subtitle: 'HRM OS',
  lightMode: false,
};

const ThemeContext = createContext<ThemeContextType>({
  settings: defaultSettings,
  refreshSettings: () => {},
  isDark: true,
  toggleTheme: () => {},
  theme: 'midnight-pro',
  setTheme: () => {},
  language: 'en',
  setLanguage: () => {},
});

// ── Color overrides from admin branding settings ──────────────────────────────
const applyColorOverrides = (settings: SystemSettings) => {
  const root = document.documentElement;
  if (settings.primaryColor) {
    root.style.setProperty('--primary', settings.primaryColor);
    root.style.setProperty('--primary-light', settings.primaryColor + 'cc');
  }
  if (settings.secondaryColor) root.style.setProperty('--secondary', settings.secondaryColor);
  if (settings.accentColor) {
    root.style.setProperty('--accent', settings.accentColor);
    root.style.setProperty('--accent-light', settings.accentColor + 'cc');
  }
  if (settings.textColor) root.style.setProperty('--text-main', settings.textColor);
  if (settings.sidebarColor) root.style.setProperty('--sidebar-bg', settings.sidebarColor);
  if (settings.companyName) document.title = `${settings.companyName} HRM`;
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  // Initialize theme from localStorage (instant — prevents flash)
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const stored = localStorage.getItem('nexus_theme') as ThemeName | null;
    return stored && THEMES.find(t => t.id === stored) ? stored : 'midnight-pro';
  });

  const isDark = THEMES.find(t => t.id === theme)?.dark ?? true;

  // Apply theme to document root
  const applyTheme = useCallback((t: ThemeName) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('nexus_theme', t);
    // Legacy compat: also set nexus_theme_mode for older components
    const dark = THEMES.find(x => x.id === t)?.dark ?? true;
    localStorage.setItem('nexus_theme_mode', dark ? 'dark' : 'light');
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    applyTheme(t);
    // Optional: persist to backend
    api.put('/settings', { themePreset: t }).catch(() => {});
  }, [applyTheme]);

  const [language, setLangState] = useState<'en' | 'fr'>(() => {
    return (localStorage.getItem('nexus_lang') as 'en' | 'fr') || 'en';
  });

  const setLanguage = useCallback((lang: 'en' | 'fr') => {
    setLangState(lang);
    localStorage.setItem('nexus_lang', lang);
    api.put('/settings', { language: lang }).catch(() => {});
    window.location.reload(); // Hard reload to apply i18n changes clearly
  }, []);

  // Legacy toggle (dark ↔ light) keeps working
  const toggleTheme = useCallback(() => {
    const next: ThemeName = isDark ? 'nordic-white' : 'midnight-pro';
    setTheme(next);
  }, [isDark, setTheme]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      const data: SystemSettings = res.data;
      setSettings(data);
      applyColorOverrides(data);

      // Sync theme preset and language from server
      if (data.themePreset && THEMES.find(t => t.id === data.themePreset)) {
        setThemeState(data.themePreset as ThemeName);
        applyTheme(data.themePreset as ThemeName);
      }
      if (data.language) {
        setLangState(data.language);
        i18n.changeLanguage(data.language);
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(theme);
    fetchSettings();
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      settings, 
      refreshSettings: fetchSettings, 
      isDark, 
      toggleTheme, 
      theme, 
      setTheme,
      language,
      setLanguage 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
