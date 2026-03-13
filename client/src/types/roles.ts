export const RoleRank = {
    DEV: 100,
    MD: 90,
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
    DIRECTOR: RoleRank.DIRECTOR,
    MANAGER: RoleRank.MANAGER,
    MID_MANAGER: RoleRank.MID_MANAGER,
    STAFF: RoleRank.STAFF,
    CASUAL: RoleRank.CASUAL
};
