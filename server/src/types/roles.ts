export enum RoleRank {
    DEV = 100,
    MD = 90,
    DIRECTOR = 85,
    HR_OFFICER = 85,
    IT_MANAGER = 85,
    MANAGER = 70,
    SUPERVISOR = 60,
    STAFF = 50,
    CASUAL = 40
}

export const ROLE_RANK_MAP: Record<string, number> = {
    DEV: RoleRank.DEV,
    MD: RoleRank.MD,
    DIRECTOR: RoleRank.DIRECTOR,
    HR_OFFICER: RoleRank.HR_OFFICER,
    MANAGER: RoleRank.MANAGER,
    SUPERVISOR: RoleRank.SUPERVISOR,
    STAFF: RoleRank.STAFF,
    CASUAL: RoleRank.CASUAL,

    HR: RoleRank.HR_OFFICER,
    HR_ADMIN: RoleRank.DIRECTOR,
    IT_ADMIN: RoleRank.DIRECTOR,
    IT_MANAGER: RoleRank.IT_MANAGER,
    EMPLOYEE: RoleRank.STAFF,
    SUPER_ADMIN: RoleRank.MD
};
