import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export type ThemeName = 'premium-monolith' | 'premium-canvas' | 'premium-aero';

export interface Settings {
  companyName: string;
  name: string;
  subtitle: string;
  companyLogoUrl: string;
  logoUrl: string;
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
  language: string;
  currency: string;
  trialDays: number;
  vatRate: number;
  allowSelfRegistration: boolean;
  themePreset: ThemeName;
  // Billing & Subscription
  monthlyPriceGHS?: string;
  annualPriceGHS?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  paystackPublicKey?: string;
  paystackPayLink?: string;
  // White-Label Details
  address: string;
  phone: string;
  email: string;
  city: string;
  country: string;
}

// Contrast utilities removed as they are currently handled by theme tokens

const hexToRgb = (hex: string) => {
  if (!hex) return null;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  if (cleanHex.length !== 6) return null;
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  settings: Settings | null;
  refreshSettings: () => Promise<void>;
  previewSettings: (customSettings: Settings) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEMES: { id: ThemeName; label: string; emoji: string; dark: boolean }[] = [
  { id: 'premium-monolith', label: 'Premium Monolith', emoji: '🌑', dark: true },
  { id: 'premium-canvas', label: 'Premium Canvas', emoji: '⚪', dark: false },
  { id: 'premium-aero', label: 'Premium Aero', emoji: '🌿', dark: false },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('app_theme_preference') as ThemeName;
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
        ['primary-hover', customSettings.primaryColor], // Simple fallback for now
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
        ['text-sidebar-active', customSettings.sidebarText],
        ['primary-rgb', hexToRgb(customSettings.primaryColor || '')],
        ['accent-rgb', hexToRgb(customSettings.accentColor || '')],
        ['ring-color', customSettings.primaryColor ? `rgba(${hexToRgb(customSettings.primaryColor)}, 0.15)` : null],
        ['border-subtle', customSettings.secondaryColor ? `rgba(${hexToRgb(customSettings.secondaryColor)}, 0.2)` : null], 
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
      localStorage.setItem('app_theme_preference', targetTheme);
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
    localStorage.setItem('app_theme_preference', newTheme);
    applyTheme(newTheme, settings);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, settings, refreshSettings, previewSettings: (s) => applyTheme(theme, s) }}>
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
