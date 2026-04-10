export const RoleRank = {
    DEV: 100,
    MD: 90,
    HR_OFFICER: 85,
    IT_MANAGER: 85,
    DIRECTOR: 80,
    MANAGER: 70,
    SUPERVISOR: 60,
    STAFF: 50,
    CASUAL: 40
} as const;

export type RoleRankType = typeof RoleRank[keyof typeof RoleRank];

export const ROLE_RANK_MAP: Record<string, number> = {
    DEV: RoleRank.DEV,
    MD: RoleRank.MD,
    HR_OFFICER: RoleRank.HR_OFFICER,
    IT_MANAGER: RoleRank.IT_MANAGER,
    DIRECTOR: RoleRank.DIRECTOR,
    MANAGER: RoleRank.MANAGER,
    SUPERVISOR: RoleRank.SUPERVISOR,
    STAFF: RoleRank.STAFF,
    CASUAL: RoleRank.CASUAL,
    
    // Support aliases
    IT_ADMIN: RoleRank.IT_MANAGER,
    HR_ADMIN: RoleRank.HR_OFFICER,
    HR_MANAGER: RoleRank.HR_OFFICER // Self-healing fallback
};
