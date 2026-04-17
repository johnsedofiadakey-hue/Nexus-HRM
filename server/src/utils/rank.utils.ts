import { RoleRank, ROLE_RANK_MAP } from '../types/roles';

export const normalizeRole = (role?: string): string => {
  if (!role) return '';
  return String(role).toUpperCase();
};

export const getRoleRank = (role?: string): number => {
  const normalized = normalizeRole(role);
  if (!normalized) return 0;
  return ROLE_RANK_MAP[normalized] ?? 0;
};
