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
  if (!origin) return url;

  // Standardize the path: ensure it starts with / if it's relative
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${normalizedPath}`;
};
