"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_RANK_MAP = exports.RoleRank = void 0;
var RoleRank;
(function (RoleRank) {
    RoleRank[RoleRank["DEV"] = 100] = "DEV";
    RoleRank[RoleRank["MD"] = 90] = "MD";
    RoleRank[RoleRank["DIRECTOR"] = 80] = "DIRECTOR";
    RoleRank[RoleRank["MANAGER"] = 70] = "MANAGER";
    RoleRank[RoleRank["MID_MANAGER"] = 60] = "MID_MANAGER";
    RoleRank[RoleRank["STAFF"] = 50] = "STAFF";
    RoleRank[RoleRank["CASUAL"] = 40] = "CASUAL";
})(RoleRank || (exports.RoleRank = RoleRank = {}));
exports.ROLE_RANK_MAP = {
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
