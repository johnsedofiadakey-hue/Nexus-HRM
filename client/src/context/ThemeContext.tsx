import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export type ThemeName = 'executive-light' | 'modern-slate' | 'earth-sand';

export interface Settings {
  companyName: string;
  subtitle: string;
  companyLogoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgMain: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sidebarBg: string;
  sidebarActive: string;
  sidebarText: string;
  defaultLanguage: string;
  currency: string;
  vatRate: number;
  allowSelfRegistration: boolean;
  theme: ThemeName;
}

// Utility to determine if a color is light or dark
const getContrastColor = (hex: string) => {
  if (!hex || hex.length < 6) return '#000000';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#0f172a' : '#f8fafc';
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  settings: Settings | null;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEMES: { id: ThemeName; label: string; emoji: string; dark: boolean }[] = [
  { id: 'executive-light', label: 'Executive Light', emoji: '🏢', dark: false },
  { id: 'modern-slate', label: 'Modern Slate', emoji: '🌑', dark: true },
  { id: 'earth-sand', label: 'Earth / Sand', emoji: '🏜️', dark: false },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem('nexus_theme') as ThemeName) || 'executive-light';
  });
  const [settings, setSettings] = useState<Settings | null>(null);

  const applyTheme = useCallback((themeName: ThemeName, customSettings?: Settings | null) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeName);
    
    // Reset any previous custom style overrides
    const existingStyle = document.getElementById('theme-overrides');
    if (existingStyle) existingStyle.remove();

    if (customSettings) {
      const style = document.createElement('style');
      style.id = 'theme-overrides';
      let css = ':root {';
      
      // Smart contrast defaults if user hasn't specified
      const bg = customSettings.bgMain || (themeName === 'modern-slate' ? '#0f172a' : '#f8fafc');
      const smartText = getContrastColor(bg);

      const tokens = [
        ['primary', customSettings.primaryColor],
        ['secondary', customSettings.secondaryColor],
        ['accent', customSettings.accentColor],
        ['bg-main', bg],
        ['bg-card', customSettings.bgCard],
        ['text-primary', customSettings.textPrimary || smartText],
        ['text-secondary', customSettings.textSecondary],
        ['text-muted', customSettings.textMuted],
        ['bg-sidebar', customSettings.sidebarBg],
        ['bg-sidebar-active', customSettings.sidebarActive],
        ['text-sidebar-active', customSettings.sidebarText],
      ];

      tokens.forEach(([key, value]) => {
        if (value) css += `--${key}: ${value} !important;`;
      });

      css += '}';
      style.innerHTML = css;
      document.head.appendChild(style);
    }
  }, []);

  const refreshSettings = async () => {
    try {
      const res = await api.get('/settings');
      const data = res.data;
      setSettings(data);
      if (data.theme) {
        setThemeState(data.theme);
        localStorage.setItem('nexus_theme', data.theme);
      }
      applyTheme(data.theme || theme, data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
      applyTheme(theme, null);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('nexus_theme', newTheme);
    applyTheme(newTheme, settings);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, settings, refreshSettings }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
