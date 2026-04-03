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

  if (url.startsWith('/')) {
    // If we have a full VITE_API_URL, use its origin
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && apiUrl.startsWith('http')) {
      const origin = new URL(apiUrl).origin;
      return `${origin}${url}`;
    }

    // Fallback: If baseURL is relative (e.g. '/api'), check current window location
    const baseURL = api.defaults.baseURL || '';
    if (baseURL.startsWith('http')) {
      const origin = new URL(baseURL).origin;
      return `${origin}${url}`;
    }

    // Last Resort (Local Dev): If on :5173, point to :5000
    if (typeof window !== 'undefined' && window.location.port === '5173') {
      return `http://localhost:5000${url}`;
    }

    return url;
  }

  return url;
};
