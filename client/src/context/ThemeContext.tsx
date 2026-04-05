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
  formatCurrency: (amount: number | string) => string;
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
      
      const tokens: [string, string | null][] = [
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
        ['primary-rgb', hexToRgb(customSettings.primaryColor || '')],
        ['accent-rgb', hexToRgb(customSettings.accentColor || '')],
        ['ring-color', customSettings.primaryColor ? `rgba(${hexToRgb(customSettings.primaryColor)}, 0.15)` : null],
        ['border-subtle', customSettings.secondaryColor ? `rgba(${hexToRgb(customSettings.secondaryColor)}, 0.2)` : null], 
      ];

      const colorCache: Record<string, string> = {};
      tokens.forEach(([key, value]) => {
        if (value) {
          css += `--${key}: ${value} !important;`;
          colorCache[key] = value;
        }
      });

      css += '}';
      style.innerHTML = css;
      document.head.appendChild(style);

      // Persist to local storage for early boot injection on next reload
      localStorage.setItem('app_theme_custom_colors', JSON.stringify(colorCache));

      // Remove early boot style tag if it exists to avoid redundancy (React takes over now)
      const earlyStyle = document.getElementById('theme-overrides-early');
      if (earlyStyle) earlyStyle.remove();
    }
  }, []);

  const refreshSettings = async () => {
    try {
      // Apply last known theme/colors IMMEDIATELY before API call to eliminate flicker
      const cachedColors = localStorage.getItem('app_theme_custom_colors');
      const savedTheme = localStorage.getItem('app_theme_preference') as ThemeName || theme;
      if (cachedColors) {
         try {
           const colors = JSON.parse(cachedColors);
           // Hydrate a partial settings object from cache for applyTheme
           applyTheme(savedTheme, colors as any);
         } catch(e){}
      }

      const res = await api.get('/settings');
      const data = res.data;
      setSettings(data);
      let targetTheme = (data.themePreset as ThemeName) || theme;
      
      setThemeState(targetTheme);
      localStorage.setItem('app_theme_preference', targetTheme);
      applyTheme(targetTheme, data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
      // Even if API fails, try to apply from local storage if available for instant paint
      const savedTheme = localStorage.getItem('app_theme_preference') as ThemeName || theme;
      applyTheme(savedTheme, null); 
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
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      settings, 
      refreshSettings, 
      previewSettings: (s) => applyTheme(theme, s),
      formatCurrency: (amount: number | string) => {
        const symbol = settings?.currency || 'GHS';
        const val = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `${symbol} ${isNaN(val) ? '0.00' : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }}>
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
