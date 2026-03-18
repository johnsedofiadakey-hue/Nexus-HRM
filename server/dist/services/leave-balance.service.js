"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accrueLeaveBalances = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const monthsBetween = (from, to) => {
    const yearDiff = to.getFullYear() - from.getFullYear();
    const monthDiff = to.getMonth() - from.getMonth();
    return Math.max(0, yearDiff * 12 + monthDiff);
};
const accrueLeaveBalances = async () => {
    const users = await client_1.default.user.findMany({
        select: { id: true, leaveBalance: true, leaveAllowance: true, leaveAccruedAt: true }
    });
    let updatedCount = 0;
    const now = new Date();
    for (const user of users) {
        const lastAccruedAt = user.leaveAccruedAt || now;
        const monthsToAccrue = monthsBetween(lastAccruedAt, now);
        if (monthsToAccrue <= 0)
            continue;
        const monthlyAccrual = (user.leaveAllowance || 24) / 12;
        const newBalance = (user.leaveBalance || 0) + monthlyAccrual * monthsToAccrue;
        await client_1.default.user.update({
            where: { id: user.id },
            data: {
                leaveBalance: Number(newBalance.toFixed(2)),
                leaveAccruedAt: now
            }
        });
        updatedCount += 1;
    }
    return updatedCount;
};
exports.accrueLeaveBalances = accrueLeaveBalances;
