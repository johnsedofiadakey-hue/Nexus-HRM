import React, { createContext, useContext, useEffect, useState } from 'react';

interface SystemSettings {
    companyName: string;
    companyLogoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    // Subscription & Dev
    plan?: string;
    paymentLink?: string;
    lastPaymentDate?: string;
    subscriptionStatus?: string;
}

const defaultSettings: SystemSettings = {
    companyName: 'Nexus HRM',
    companyLogoUrl: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#1E293B',
    accentColor: '#F59E0B'
};

const ThemeContext = createContext<{ settings: SystemSettings, refreshSettings: () => void }>({
    settings: defaultSettings,
    refreshSettings: () => { }
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

    const clamp = (value: number) => Math.max(0, Math.min(255, value));

    const adjustColor = (hex: string, amount: number) => {
        const normalized = hex.replace('#', '');
        if (normalized.length !== 6) return hex;
        const r = clamp(parseInt(normalized.slice(0, 2), 16) + amount);
        const g = clamp(parseInt(normalized.slice(2, 4), 16) + amount);
        const b = clamp(parseInt(normalized.slice(4, 6), 16) + amount);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                applyTheme(data);
            }
        } catch (error) {
            console.error("Failed to load branding", error);
        }
    };

    const applyTheme = (theme: SystemSettings) => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', theme.primaryColor);
        root.style.setProperty('--color-primary-light', adjustColor(theme.primaryColor, 80));
        root.style.setProperty('--color-primary-dark', adjustColor(theme.primaryColor, -40));
        root.style.setProperty('--color-secondary', theme.secondaryColor);
        root.style.setProperty('--color-secondary-dark', adjustColor(theme.secondaryColor, -30));
        root.style.setProperty('--color-accent', theme.accentColor);
        if (theme.companyName) {
            document.title = `${theme.companyName} HRM`;
        }
        // Note: For Tailwind to pick this up dynamically is hard without a plugin or using CSS variables in tailwind config.
        // However, we can use inline styles for key elements or update the class references if we use a mapping.
        // A better approach for "White Label" on top of Tailwind is to replace the CSS variables that Tailwind uses (if configured) 
        // OR simply set these variables and use 'bg-[var(--color-primary)]' in the components.
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <ThemeContext.Provider value={{ settings, refreshSettings: fetchSettings }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
