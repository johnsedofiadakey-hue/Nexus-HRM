import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  bgElevated: string;
  bgInput: string;
  borderSubtle: string;
  textInverse: string;
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
  isAiEnabled: boolean;
}

// Contrast utilities removed as they are currently handled by theme tokens

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
  if (!hex) return '0, 0, 0';
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  if (cleanHex.length !== 6) return '0, 0, 0'; // Fast fail with safe black
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '0, 0, 0';
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
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const orgId = getOrgIdFromToken();
    const saved = (localStorage.getItem(`nexus_theme_preference_${orgId}`) || localStorage.getItem('nexus_theme_preference')) as ThemeName;
    return saved || 'premium-monolith';
  });
  const [settings, setSettings] = useState<Settings | null>(() => {
    try {
      const orgId = getOrgIdFromToken();
      const cached = localStorage.getItem(`nexus_branding_cache_${orgId}`);
      return cached ? JSON.parse(cached) : null;
    } catch(e) { return null; }
  });

  const lastAppliedRef = React.useRef<string>('');

  const applyTheme = useCallback((themeName: ThemeName, customSettings?: Settings | null) => {
    const root = document.documentElement;
    const settingsToUse = customSettings || settings;
    if (!settingsToUse) return;

    // --- HYDRATION LOCK: Detect any granular change to branding tokens ---
    const colorSignature = JSON.stringify({ 
      themeName, 
      p: settingsToUse.primaryColor, 
      bg: settingsToUse.bgMain, 
      sc: settingsToUse.sidebarBg,
      be: settingsToUse.bgElevated,
      bi: settingsToUse.bgInput,
      bs: settingsToUse.borderSubtle,
      ti: settingsToUse.textInverse
    });
    
    if (lastAppliedRef.current === colorSignature && root.getAttribute('data-theme') === themeName) {
       return; 
    }
    
    lastAppliedRef.current = colorSignature;
    root.setAttribute('data-theme', themeName);

    // Singleton Style Tag: Check for existing or create once
    let style = document.getElementById('theme-overrides');
    if (!style) {
      style = document.createElement('style');
      style.id = 'theme-overrides';
      document.head.appendChild(style);
    }
    
    let css = `[data-theme="${themeName}"], :root {`;
    
    const tokens: [string, string | null][] = [
      ['primary', settingsToUse.primaryColor],
      ['primary-rgb', hexToRgb(settingsToUse.primaryColor || '')],
      ['accent', settingsToUse.accentColor],
      ['bg-main', settingsToUse.bgMain],
      ['bg-card', settingsToUse.bgCard],
      ['bg-elevated', settingsToUse.bgElevated || settingsToUse.secondaryColor || settingsToUse.bgCard], 
      ['bg-input', settingsToUse.bgInput || settingsToUse.bgMain],
      ['border-subtle', settingsToUse.borderSubtle || 'rgba(0,0,0,0.1)'],
      ['text-primary', settingsToUse.textPrimary],
      ['text-secondary', settingsToUse.textSecondary],
      ['text-muted', settingsToUse.textMuted],
      ['text-inverse', settingsToUse.textInverse || '#ffffff'],
      ['bg-sidebar', settingsToUse.sidebarBg],
      ['bg-sidebar-active', settingsToUse.sidebarActive],
      ['text-sidebar', settingsToUse.textSecondary],
      ['text-sidebar-active', settingsToUse.sidebarText],
    ];

    css += `}\n`;

    // --- UNIVERSAL TAILWIND ENFORCER: Force standard utilities to follow variables ---
    // This allows components with hardcoded .bg-white or .text-slate-900 to follow branding.
    if (themeName.startsWith('premium-')) {
      css += `
        [data-theme="${themeName}"] .bg-white { background-color: var(--bg-card) !important; }
        [data-theme="${themeName}"] .bg-slate-50, [data-theme="${themeName}"] .bg-gray-50 { background-color: var(--bg-main) !important; }
        [data-theme="${themeName}"] .text-slate-900, [data-theme="${themeName}"] .text-gray-900 { color: var(--text-primary) !important; }
        [data-theme="${themeName}"] .text-slate-600, [data-theme="${themeName}"] .text-gray-600 { color: var(--text-secondary) !important; }
        [data-theme="${themeName}"] .text-slate-400, [data-theme="${themeName}"] .text-gray-400 { color: var(--text-muted) !important; }
        [data-theme="${themeName}"] .border-slate-200, [data-theme="${themeName}"] .border-gray-200 { border-color: var(--border-subtle) !important; }
        [data-theme="${themeName}"] .bg-indigo-600, [data-theme="${themeName}"] .bg-blue-600 { background-color: var(--primary) !important; }
        [data-theme="${themeName}"] .text-indigo-600, [data-theme="${themeName}"] .text-blue-600 { color: var(--primary) !important; }
      `;
    }

    css += `html, body, #root, [data-theme] { background-color: var(--bg-main) !important; color: var(--text-primary) !important; }`;
    
    style.innerHTML = css;

    // Atomic Swap Cleanup: Release the early paint locks immediately
    const pinA = document.getElementById('pinnacle-core-lock');
    const pinB = document.getElementById('pinnacle-identity-lock');
    if (pinA) pinA.remove();
    if (pinB) pinB.remove();

    // Atomic Swap Cleanup: Remove early-paint styles once React takes control
    const earlyStyle = document.getElementById('pinnacle-core-lock') || document.getElementById('pinnacle-identity-lock');
    if (earlyStyle) {
      setTimeout(() => {
        const pinA = document.getElementById('pinnacle-core-lock');
        const pinB = document.getElementById('pinnacle-identity-lock');
        if (pinA) pinA.remove();
        if (pinB) pinB.remove();
      }, 500);
    }

    // IDENTITY-AWARE PERSISTENCE: Save full branding context (Logo + Name + Colors)
    const orgId = getOrgIdFromToken();
    localStorage.setItem(`nexus_branding_cache_${orgId}`, JSON.stringify(settingsToUse));
    localStorage.setItem(`nexus_theme_preference_${orgId}`, themeName);
    localStorage.setItem('nexus_theme_preference', themeName); // Global fallback

    // --- ZERO-FLICKER SYNC: Align with index.html early-paint script ---
    const customColors: Record<string, string> = {};
    tokens.forEach(([key, value]) => { if (value) customColors[key] = value; });
    localStorage.setItem(`nexus_theme_custom_colors_${orgId}`, JSON.stringify(customColors));
    localStorage.setItem('nexus_theme_custom_colors', JSON.stringify(customColors));
  }, [settings]);

  const refreshSettings = useCallback(async () => {
    try {
      // Identity-scoped initial paint
      const orgId = getOrgIdFromToken();
      const cached = localStorage.getItem(`nexus_branding_cache_${orgId}`);
      const savedTheme = (localStorage.getItem(`nexus_theme_preference_${orgId}`) || localStorage.getItem('nexus_theme_preference')) as ThemeName || theme;
      
      if (cached) {
         try {
           const fullSettings = JSON.parse(cached);
           setSettings(fullSettings);
           applyTheme(savedTheme, fullSettings);
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
      console.error('Failed to fetch settings', err);
      const orgId = getOrgIdFromToken();
      const savedTheme = (localStorage.getItem(`nexus_theme_preference_${orgId}`) || localStorage.getItem('nexus_theme_preference')) as ThemeName || theme;
      applyTheme(savedTheme, null); 
    }
  }, [theme, applyTheme]);

  useEffect(() => {
    refreshSettings();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { i18n } = useTranslation();

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
  }, [settings?.defaultLanguage, i18n]);

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
      formatCurrency: (amount: number | string) => {
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
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
