import { getLogoUrl } from './logo';

/**
 * Robust avatar URL resolver for Nexus HRM.
 * Ensures that even if the photoUrl is malformed or missing,
 * a premium high-fidelity placeholder is returned.
 */
export const getSafeAvatarUrl = (url?: string, name?: string) => {
  // 1. Try resolving the actual URL via the standard logo/image resolver
  const resolved = getLogoUrl(url);
  if (resolved) return resolved;

  // 2. Fallback to a high-fidelity UI Avatars placeholder
  // Using 'Inter' font and the Nexus primary color palette style
  const initials = name 
    ? encodeURIComponent(name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase())
    : '??';
    
  // Design: 124c60 is a common dark slate used in the Nexus palette, 
  // or we can use a neutral gray f1f5f9
  return `https://ui-avatars.com/api/?name=${initials}&background=6366f1&color=fff&bold=true&font-size=0.33`;
};
