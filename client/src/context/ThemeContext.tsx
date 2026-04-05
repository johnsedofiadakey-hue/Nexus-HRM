import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useWebSocket } from '../services/websocket';
import { useTranslation } from 'react-i18next';

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
  monthlyPriceGHS?: string;
  annualPriceGHS?: string;
  monthlyPrice?: number;
  annualPrice?: number;
  paystackPublicKey?: string;
  paystackPayLink?: string;
  address: string;
  phone: string;
  email: string;
  city: string;
  country: string;
}

const getOrgIdFromToken = () => {
  try {
    const token = localStorage.getItem('nexus_auth_token');
    if (!token) return 'default';
    const payload = token.split('.')[1];
    if (!payload) return 'default';
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.organizationId || 'default';
  } catch (e) {
    return 'default';
  }
};

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
  setLanguage: (lang: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEMES: { id: ThemeName; label: string; emoji: string; dark: boolean }[] = [
  { id: 'premium-monolith', label: 'Premium Monolith', emoji: '🌑', dark: true },
  { id: 'premium-canvas', label: 'Premium Canvas', emoji: '⚪', dark: false },
  { id: 'premium-aero', label: 'Premium Aero', emoji: '🌿', dark: false },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const lastAppliedRef = useRef<string>('');
  
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const orgId = getOrgIdFromToken();
    const saved = (localStorage.getItem(`nexus_theme_preference_${orgId}`) || localStorage.getItem('nexus_theme_preference')) as ThemeName;
    return saved || 'premium-monolith';
  });

  const [settings, setSettings] = useState<Settings | null>(() => {
    try {
      const orgId = getOrgIdFromToken();
      const cached = localStorage.getItem(`nexus_theme_custom_colors_${orgId}`);
      return cached ? JSON.parse(cached) : null;
    } catch(e) { return null; }
  });

  const applyTheme = useCallback((themeName: ThemeName, customSettings?: Settings | null) => {
    const root = document.documentElement;
    const settingsToUse = customSettings || settings;
    if (!settingsToUse) return;

    const colorSignature = JSON.stringify({ themeName, p: settingsToUse.primaryColor, bg: settingsToUse.bgMain, sc: settingsToUse.sidebarBg });
    if (lastAppliedRef.current === colorSignature && root.getAttribute('data-theme') === themeName) {
       return; 
    }
    
    lastAppliedRef.current = colorSignature;
    root.setAttribute('data-theme', themeName);

    const style = document.createElement('style');
    style.id = 'theme-overrides';
    let css = `[data-theme="${themeName}"] {`;
    
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
    if (settingsToUse.bgMain) {
      css += `\nhtml, body, #root { background-color: ${settingsToUse.bgMain} !important; border-color: transparent !important; }`;
      root.style.backgroundColor = settingsToUse.bgMain;
    }
    
    style.innerHTML = css;
    document.head.appendChild(style);

    const earlyStyle = document.getElementById('theme-overrides-early');
    if (earlyStyle) setTimeout(() => earlyStyle.remove(), 100);
    
    const previousReactStyles = document.querySelectorAll('style[id="theme-overrides"]');
    if (previousReactStyles.length > 1) {
       for (let i = 0; i < previousReactStyles.length - 1; i++) previousReactStyles[i].remove();
    }

    const orgId = getOrgIdFromToken();
    localStorage.setItem(`nexus_theme_custom_colors_${orgId}`, JSON.stringify(colorCache));
    localStorage.setItem(`nexus_theme_preference_${orgId}`, themeName);
    localStorage.setItem('nexus_theme_preference', themeName);
  }, [settings]);

  const refreshSettings = useCallback(async () => {
    try {
      const orgId = getOrgIdFromToken();
      const cachedColors = localStorage.getItem(`nexus_theme_custom_colors_${orgId}`);
      const savedTheme = (localStorage.getItem(`nexus_theme_preference_${orgId}`) || localStorage.getItem('nexus_theme_preference')) as ThemeName || theme;
      
      if (cachedColors) {
         try {
           const colors = JSON.parse(cachedColors);
           applyTheme(savedTheme, colors as any);
         } catch(e){}
      }

      const res = await api.get('/settings');
      const data = res.data;
      setSettings(data);
      let targetTheme = (data.themePreset as ThemeName) || theme;
      
      setThemeState(targetTheme);
      localStorage.setItem(`nexus_theme_preference_${orgId}`, targetTheme);
      localStorage.setItem('nexus_theme_preference', targetTheme);
      applyTheme(targetTheme, data);
    } catch (err) {
      const orgId = getOrgIdFromToken();
      const savedTheme = (localStorage.getItem(`nexus_theme_preference_${orgId}`) || localStorage.getItem('nexus_theme_preference')) as ThemeName || theme;
      applyTheme(savedTheme, null); 
    }
  }, [theme, applyTheme]);

  const setLanguage = useCallback((lang: string) => {
    localStorage.setItem('nexus_user_language', lang);
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
  }, [i18n]);

  useEffect(() => {
    const userPref = localStorage.getItem('nexus_user_language');
    const targetLang = userPref || settings?.defaultLanguage || i18n.language || 'en';
    
    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
      document.documentElement.lang = targetLang;
    }

    const baseTitle = settings?.companyName || 'Corporate Portal';
    document.title = `${baseTitle} | Personnel Operations`;
  }, [settings?.defaultLanguage, settings?.companyName, i18n]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const handleWSMessage = useCallback((type: string) => {
    if (type === 'SETTINGS_UPDATED') refreshSettings();
  }, [refreshSettings]);

  useWebSocket(handleWSMessage);

  const setTheme = (newTheme: ThemeName) => {
    const orgId = getOrgIdFromToken();
    setThemeState(newTheme);
    localStorage.setItem(`nexus_theme_preference_${orgId}`, newTheme);
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
      formatCurrency: (amount) => {
        const symbol = settings?.currency || 'GHS';
        const val = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `${symbol} ${isNaN(val) ? '0.00' : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
      setLanguage
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
