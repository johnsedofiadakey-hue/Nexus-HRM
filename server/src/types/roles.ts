export enum RoleRank {
    DEV = 100,
    MD = 90,
    DIRECTOR = 80,
    HR_MANAGER = 85,
    MANAGER = 70,
    SUPERVISOR = 60,
    STAFF = 50,
    CASUAL = 40
}

export const ROLE_RANK_MAP: Record<string, number> = {
    DEV: RoleRank.DEV,
    MD: RoleRank.MD,
    DIRECTOR: RoleRank.DIRECTOR,
    HR_MANAGER: RoleRank.HR_MANAGER,
    MANAGER: RoleRank.MANAGER,
    SUPERVISOR: RoleRank.SUPERVISOR,
    MID_MANAGER: RoleRank.SUPERVISOR, // Map legacy to new
    STAFF: RoleRank.STAFF,
    CASUAL: RoleRank.CASUAL,

    HR: RoleRank.HR_MANAGER,
    HR_ADMIN: RoleRank.DIRECTOR,
    IT_ADMIN: RoleRank.MANAGER,
    EMPLOYEE: RoleRank.STAFF,
    SUPER_ADMIN: RoleRank.MD
};
