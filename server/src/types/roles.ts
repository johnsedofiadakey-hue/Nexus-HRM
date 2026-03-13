export enum RoleRank {
    DEV = 100,
    MD = 90,
    DIRECTOR = 80,
    MANAGER = 70,
    MID_MANAGER = 60,
    STAFF = 50,
    CASUAL = 40
}

export const ROLE_RANK_MAP: Record<string, number> = {
    DEV: RoleRank.DEV,
    MD: RoleRank.MD,
    DIRECTOR: RoleRank.DIRECTOR,
    MANAGER: RoleRank.MANAGER,
    MID_MANAGER: RoleRank.MID_MANAGER,
    STAFF: RoleRank.STAFF,
    CASUAL: RoleRank.CASUAL,

    // Legacy mappings for backward compatibility
    HR_ADMIN: RoleRank.DIRECTOR,
    IT_ADMIN: RoleRank.MANAGER,
    SUPERVISOR: RoleRank.MANAGER,
    EMPLOYEE: RoleRank.STAFF,
    SUPER_ADMIN: RoleRank.MD
};
