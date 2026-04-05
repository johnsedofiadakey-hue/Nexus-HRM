import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useWebSocket } from '../services/websocket';

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
    const saved = localStorage.getItem('nexus_theme_preference') as ThemeName;
    return saved || 'premium-monolith';
  });
  const [settings, setSettings] = useState<Settings | null>(null);

  const applyTheme = useCallback((themeName: ThemeName, customSettings?: Settings | null) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeName);
    
    // Create new style tag
    const style = document.createElement('style');
    style.id = 'theme-overrides';
    let css = `[data-theme="${themeName}"] {`;
    
    // Use cached/provided settings if available
    const settingsToUse = customSettings || settings;
    
    if (settingsToUse) {
      const tokens: [string, string | null][] = [
        ['primary', settingsToUse.primaryColor],
        ['primary-rgb', hexToRgb(settingsToUse.primaryColor || '')],
        ['accent', settingsToUse.accentColor],
        ['bg-main', settingsToUse.bgMain],
        ['bg-card', settingsToUse.bgCard],
        ['bg-elevated', settingsToUse.secondaryColor || settingsToUse.bgCard], 
        ['bg-input', settingsToUse.bgMain],
        ['text-primary', settingsToUse.textPrimary],
        ['text-secondary', settingsToUse.textSecondary],
        ['text-muted', settingsToUse.textMuted],
        ['bg-sidebar', settingsToUse.sidebarBg],
        ['bg-sidebar-active', settingsToUse.sidebarActive],
        ['text-sidebar', settingsToUse.textSecondary],
        ['text-sidebar-active', settingsToUse.sidebarText],
      ];

      const colorCache: Record<string, string> = {};
      tokens.forEach(([key, value]) => {
        if (value) {
          css += `--${key}: ${value} !important;`;
          colorCache[key] = value;
        }
      });
      
      css += '}';
      
      // Atomic Background Shield: Ensure body color matches exactly during swap
      if (settingsToUse.bgMain) {
        css += `\nhtml, body, #root { background-color: ${settingsToUse.bgMain} !important; }`;
      }
      
      style.innerHTML = css;
      document.head.appendChild(style);

      // Hydration Swap: Only remove the old styles AFTER the new one is definitely in the DOM
      const existingStyle = document.getElementById('theme-overrides-old');
      if (existingStyle) existingStyle.remove();
      
      const earlyStyle = document.getElementById('theme-overrides-early');
      if (earlyStyle) {
        earlyStyle.id = 'theme-overrides-old';
        // Delay removal to ensure browser has painted the new vars
        setTimeout(() => earlyStyle.remove(), 50);
      }
      
      // Cleanup previous React overrides
      const prevReactStyle = document.querySelectorAll('style[id="theme-overrides"]');
      if (prevReactStyle.length > 1) {
        prevReactStyle[0].remove();
      }

      // Persist to local storage
      localStorage.setItem('nexus_theme_custom_colors', JSON.stringify(colorCache));
    }
  }, [settings]);

  const refreshSettings = async () => {
    try {
      // Apply last known theme/colors IMMEDIATELY before API call to eliminate flicker
      const cachedColors = localStorage.getItem('nexus_theme_custom_colors');
      const savedTheme = localStorage.getItem('nexus_theme_preference') as ThemeName || theme;
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
      localStorage.setItem('nexus_theme_preference', targetTheme);
      applyTheme(targetTheme, data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
      // Even if API fails, try to apply from local storage if available for instant paint
      const savedTheme = localStorage.getItem('nexus_theme_preference') as ThemeName || theme;
      applyTheme(savedTheme, null); 
    }
  };

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Real-time synchronization: Listen for settings updates via WebSocket
  const handleWSMessage = useCallback((type: string) => {
    if (type === 'SETTINGS_UPDATED') {
      console.log('[ThemeContext] Settings updated via cloud, refreshing...');
      refreshSettings();
    }
  }, [refreshSettings]);

  // Subscribe to system-wide settings updates
  useWebSocket(handleWSMessage);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('nexus_theme_preference', newTheme);
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
