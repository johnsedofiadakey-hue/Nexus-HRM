import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

interface SystemSettings {
  companyName: string;
  companyLogoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themePreset?: string;
  lightMode?: boolean;
  plan?: string;
}

interface ThemeContextType {
  settings: SystemSettings;
  refreshSettings: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const defaultSettings: SystemSettings = {
  companyName: 'Nexus HRM', companyLogoUrl: '',
  primaryColor: '#6366f1', secondaryColor: '#1E293B', accentColor: '#06b6d4',
  lightMode: false
};

const ThemeContext = createContext<ThemeContextType>({
  settings: defaultSettings, refreshSettings: () => {},
  isDark: true, toggleTheme: () => {}
});

const applyColorOverrides = (settings: SystemSettings) => {
  const root = document.documentElement;
  if (settings.primaryColor) {
    root.style.setProperty('--primary', settings.primaryColor);
    // Derive light/dark variants
    root.style.setProperty('--primary-light', settings.primaryColor + 'cc');
  }
  if (settings.accentColor) root.style.setProperty('--accent', settings.accentColor);
  if (settings.companyName) document.title = `${settings.companyName} HRM`;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  
  // Initialize dark/light from localStorage first (instant, no flash)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('nexus_theme_mode');
    return stored ? stored === 'dark' : true; // default dark
  });

  const applyMode = useCallback((dark: boolean) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('nexus_theme_mode', dark ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(async () => {
    const newDark = !isDark;
    setIsDark(newDark);
    applyMode(newDark);
    // Persist to backend so all devices sync
    try {
      await api.put('/settings', { lightMode: !newDark });
    } catch (e) {
      // Non-critical — local state is already correct
    }
  }, [isDark, applyMode]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      const data: SystemSettings = res.data;
      setSettings(data);
      applyColorOverrides(data);
      
      // Sync theme mode from DB if it differs from local
      if (data.lightMode !== undefined) {
        const serverDark = !data.lightMode;
        // Only update if no local override or it matches
        const localMode = localStorage.getItem('nexus_theme_mode');
        if (!localMode) {
          setIsDark(serverDark);
          applyMode(serverDark);
        }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }, [applyMode]);

  useEffect(() => {
    // Apply stored mode immediately (prevents flash)
    applyMode(isDark);
    fetchSettings();
  }, []);

  return (
    <ThemeContext.Provider value={{ settings, refreshSettings: fetchSettings, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
