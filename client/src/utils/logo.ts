import api from '../services/api';

/**
 * Resolves a logo or image URL.
 * If the path starts with '/', it intelligently prefixes it with the backend's origin.
 */
export const getLogoUrl = (url?: string) => {
  if (!url) return null;
  
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }

  // Helper to get the API base origin
  const getBaseOrigin = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && apiUrl.startsWith('http')) {
      return new URL(apiUrl).origin;
    }
    const baseURL = api.defaults.baseURL || '';
    if (baseURL.startsWith('http')) {
      return new URL(baseURL).origin;
    }
    if (typeof window !== 'undefined' && window.location.port === '5173') {
      return 'http://localhost:5000';
    }
    return '';
  };

  const origin = getBaseOrigin();
  
  // Production Shield: If we are on Render and origin is missing/localhost,
  // we attempt to use the current window's origin but mapped to the standard backend port if needed
  if (!origin || origin.includes('localhost')) {
     if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        // If we're in production and origin detection fails, we assume origin is the current host
        // But we return just the path so the browser handles it relatively if possible
        return url.startsWith('/') ? url : `/${url}`;
     }
  }

  if (!origin) return url;

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${normalizedPath}`;
};
