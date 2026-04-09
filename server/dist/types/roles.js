"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_RANK_MAP = exports.RoleRank = void 0;
var RoleRank;
(function (RoleRank) {
    RoleRank[RoleRank["DEV"] = 100] = "DEV";
    RoleRank[RoleRank["MD"] = 90] = "MD";
    RoleRank[RoleRank["DIRECTOR"] = 80] = "DIRECTOR";
    RoleRank[RoleRank["HR_MANAGER"] = 85] = "HR_MANAGER";
    RoleRank[RoleRank["IT_MANAGER"] = 85] = "IT_MANAGER";
    RoleRank[RoleRank["MANAGER"] = 70] = "MANAGER";
    RoleRank[RoleRank["SUPERVISOR"] = 60] = "SUPERVISOR";
    RoleRank[RoleRank["STAFF"] = 50] = "STAFF";
    RoleRank[RoleRank["CASUAL"] = 40] = "CASUAL";
})(RoleRank || (exports.RoleRank = RoleRank = {}));
exports.ROLE_RANK_MAP = {
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
    IT_ADMIN: RoleRank.DIRECTOR,
    IT_MANAGER: RoleRank.IT_MANAGER,
    EMPLOYEE: RoleRank.STAFF,
    SUPER_ADMIN: RoleRank.MD
};
