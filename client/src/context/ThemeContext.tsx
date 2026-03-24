import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export type ThemeName = 'premium-monolith' | 'premium-canvas' | 'premium-aero';

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
  themePreset: ThemeName;
}

// Contrast utilities removed as they are currently handled by theme tokens

const hexToRgb = (hex: string) => {
  if (!hex || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  settings: Settings | null;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEMES: { id: ThemeName; label: string; emoji: string; dark: boolean }[] = [
  { id: 'premium-monolith', label: 'Premium Monolith', emoji: '🌑', dark: true },
  { id: 'premium-canvas', label: 'Premium Canvas', emoji: '⚪', dark: false },
  { id: 'premium-aero', label: 'Premium Aero', emoji: '🌿', dark: false },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('nexus_theme') as ThemeName;
    return saved || 'premium-monolith';
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
      // Use [data-theme] to ensure higher specificity than index.css rules
      let css = `[data-theme="${themeName}"] {`;
      
      const tokens = [
        ['primary', customSettings.primaryColor],
        ['accent', customSettings.accentColor],
        ['bg-main', customSettings.bgMain],
        ['bg-card', customSettings.bgCard],
        // Map secondary to elevated for premium themes
        ['bg-elevated', customSettings.secondaryColor || customSettings.bgCard], 
        ['bg-input', customSettings.bgMain],
        ['text-primary', customSettings.textPrimary],
        ['text-secondary', customSettings.textSecondary],
        ['text-muted', customSettings.textMuted],
        ['bg-sidebar', customSettings.sidebarBg],
        ['bg-sidebar-active', customSettings.sidebarActive],
        ['text-sidebar', customSettings.textSecondary],
        ['text-sidebar-active', customSettings.sidebarText],
        ['primary-rgb', customSettings.primaryColor ? hexToRgb(customSettings.primaryColor) : null],
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
      let targetTheme = (data.themePreset as ThemeName) || theme;
      
      setThemeState(targetTheme);
      localStorage.setItem('nexus_theme', targetTheme);
      applyTheme(targetTheme, data);
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
