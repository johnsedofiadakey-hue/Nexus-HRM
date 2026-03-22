import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import i18n from '../i18n';

// ── Available themes (must match data-theme values in index.css) ──────────────
export type ThemeName = 'executive-light' | 'modern-slate' | 'earth-sand';

export const THEMES: { id: ThemeName; label: string; emoji: string; dark: boolean }[] = [
  { id: 'executive-light', label: 'Executive Light', emoji: '🏢', dark: false },
  { id: 'modern-slate',    label: 'Modern Slate',    emoji: '🏔️', dark: true  },
  { id: 'earth-sand',      label: 'Earth / Sand',    emoji: '🏜️', dark: false },
];

// ── System Settings from API ──────────────────────────────────────────────────
export interface SystemSettings {
  companyName: string;
  subtitle?: string;
  companyLogoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  defaultLanguage: 'en' | 'fr';
  currency?: string;
  vatRate?: number;
  allowSelfRegistration?: boolean;
}

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  settings: SystemSettings | null;
  refreshSettings: () => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    return (localStorage.getItem('nexus_theme') as ThemeName) || 'executive-light';
  });

  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
      
      // Auto-set language if not already set by user preference
      if (!localStorage.getItem('nexus_lang') && res.data.defaultLanguage) {
        i18n.changeLanguage(res.data.defaultLanguage);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const applyTheme = (theme: ThemeName) => {
    const root = window.document.documentElement;
    
    // Remove all theme classes first
    THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
    
    // Set data-theme attribute
    root.setAttribute('data-theme', theme);
    
    // Apply dark class for standard dark-mode libraries (Tailwind etc.)
    const themeDef = THEMES.find(t => t.id === theme);
    if (themeDef?.dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('nexus_theme', theme);
  };

  // Helper to apply dynamic color overrides (if specifically requested via Branding)
  const applyColorOverrides = (primary?: string, accent?: string) => {
    const root = window.document.documentElement;
    if (primary) {
      root.style.setProperty('--primary', primary);
      // Generate RGB for translucency if needed
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
      };
      if (primary.startsWith('#') && primary.length === 7) {
        root.style.setProperty('--primary-rgb', hexToRgb(primary));
      }
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-rgb');
    }

    if (accent) {
      root.style.setProperty('--accent', accent);
    } else {
      root.style.removeProperty('--accent');
    }
  };

  useEffect(() => {
    // Only apply color overrides if the user has explicitly set them in the hub
    // and we are on a theme that supports "Dynamic Branding" (Executive Light)
    if (currentTheme === 'executive-light' && (settings?.primaryColor || settings?.accentColor)) {
      applyColorOverrides(settings.primaryColor, settings.accentColor);
    } else {
      applyColorOverrides(undefined, undefined);
    }
    applyTheme(currentTheme);
  }, [currentTheme, settings]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
  };

  const isDark = THEMES.find(t => t.id === currentTheme)?.dark || false;

  return (
    <ThemeContext.Provider value={{ 
      theme: currentTheme, 
      setTheme, 
      settings, 
      refreshSettings: fetchSettings,
      isDark
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
