export const RoleRank = {
    DEV: 100,
    MD: 90,
    HR_MANAGER: 85,
    IT_MANAGER: 85,
    HR_OFFICER: 82,
    DIRECTOR: 80,
    MANAGER: 70,
    MID_MANAGER: 60,
    STAFF: 50,
    CASUAL: 40
} as const;

export type RoleRankType = typeof RoleRank[keyof typeof RoleRank];

export const ROLE_RANK_MAP: Record<string, number> = {
    DEV: RoleRank.DEV,
    MD: RoleRank.MD,
    HR_MANAGER: RoleRank.HR_MANAGER,
    IT_MANAGER: RoleRank.IT_MANAGER,
    DIRECTOR: RoleRank.DIRECTOR,
    MANAGER: RoleRank.MANAGER,
    MID_MANAGER: RoleRank.MID_MANAGER,
    STAFF: RoleRank.STAFF,
    CASUAL: RoleRank.CASUAL,
    
    // Support aliases
    IT_ADMIN: RoleRank.IT_MANAGER,
    HR_ADMIN: RoleRank.HR_MANAGER,
    HR_OFFICER: RoleRank.HR_OFFICER
};
