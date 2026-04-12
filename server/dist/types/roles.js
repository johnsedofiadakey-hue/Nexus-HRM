"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_RANK_MAP = exports.RoleRank = void 0;
var RoleRank;
(function (RoleRank) {
    RoleRank[RoleRank["DEV"] = 100] = "DEV";
    RoleRank[RoleRank["MD"] = 90] = "MD";
    RoleRank[RoleRank["DIRECTOR"] = 85] = "DIRECTOR";
    RoleRank[RoleRank["HR_OFFICER"] = 85] = "HR_OFFICER";
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
