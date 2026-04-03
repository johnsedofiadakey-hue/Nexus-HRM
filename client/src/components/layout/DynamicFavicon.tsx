import { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * DynamicFavicon Component
 * Monitors the organization logo from ThemeContext and updates the browser favicon.
 */
const DynamicFavicon = () => {
    const { settings } = useTheme();

    useEffect(() => {
        if (settings?.logoUrl) {
            const logoUrl = settings.logoUrl.startsWith('http') 
                ? settings.logoUrl 
                : `${import.meta.env.VITE_API_URL || ''}${settings.logoUrl}`;

            let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }

            link.href = logoUrl;
        }
    }, [settings?.logoUrl]);

    return null; // This component doesn't render any UI
};

export default DynamicFavicon;
