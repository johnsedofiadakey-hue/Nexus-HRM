export type SessionUser = {
  id?: string;
  role?: string;
  rank?: number;
  name?: string;
  email?: string;
  avatar?: string;
  jobTitle?: string;
  organizationId?: string;
  departmentId?: number;
  isImpersonating?: boolean;
};

export const ROLE_LABELS: Record<string, string> = {
  DEV: 'System Developer',
  MD: 'Managing Director',
  DIRECTOR: 'Director',
  HR_OFFICER: 'HR Officer',
  IT_MANAGER: 'IT Manager',
  IT_ADMIN: 'IT Admin',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  STAFF: 'Staff',
  CASUAL: 'Casual Worker',
};

export const ROLE_RANKS: Record<string, number> = {
  DEV: 100, MD: 90, DIRECTOR: 80, HR_OFFICER: 85, IT_MANAGER: 85, IT_ADMIN: 85, MANAGER: 70, SUPERVISOR: 60, STAFF: 50, CASUAL: 40
};

export const getRankFromRole = (role?: string): number => {
  if (!role) return 0;
  const normalized = role.toUpperCase();
  if (normalized === 'MD' || normalized === 'MANAGING DIRECTOR') return 90;
  return ROLE_RANKS[normalized] ?? 0;
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
