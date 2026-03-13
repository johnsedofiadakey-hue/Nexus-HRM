export type SessionUser = {
  id?: string;
  role?: string;
  rank?: number;
  name?: string;
  email?: string;
  avatar?: string;
  jobTitle?: string;
  organizationId?: string;
  isImpersonating?: boolean;
};

export const ROLE_LABELS: Record<string, string> = {
  DEV: 'System Developer',
  MD: 'Managing Director',
  DIRECTOR: 'Director',
  MANAGER: 'Manager',
  MID_MANAGER: 'Team Lead',
  STAFF: 'Staff',
  CASUAL: 'Casual Worker',
};

export const ROLE_RANKS: Record<string, number> = {
  DEV: 100, MD: 90, DIRECTOR: 80, MANAGER: 70, MID_MANAGER: 60, STAFF: 50, CASUAL: 40
};

export const getRankFromRole = (role?: string): number => {
  if (!role) return 0;
  return ROLE_RANKS[role.toUpperCase()] ?? 0;
};

export const getStoredUser = (): SessionUser => {
  try {
    const raw = localStorage.getItem('nexus_user');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    // Always compute rank from role so it's never stale
    const rank = getRankFromRole(parsed.role);
    return { ...parsed, rank } as SessionUser;
  } catch {
    return {};
  }
};

export const sanitizeSessionStorage = () => {
  try {
    const userRaw = localStorage.getItem('nexus_user');
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (!parsed || typeof parsed !== 'object') {
        localStorage.removeItem('nexus_user');
      }
    }
  } catch {
    localStorage.removeItem('nexus_user');
  }
};
