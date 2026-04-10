"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRiskProfile = exports.calculateRiskScore = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const calculateRiskScore = async (organizationId, employeeId) => {
    // 1. Fetch History
    const history = await client_1.default.employeeHistory.findMany({
        where: { employeeId, organizationId }
    });
    let score = 0;
    // 2. Loop and Calculate
    for (const record of history) {
        // Disciplinary Record: High Impact
        if (record.type && record.type.toString() === 'DISCIPLINARY') {
            score += 10;
        }
        // Active Query: Medium Impact
        if (record.type && record.type.toString() === 'QUERY' && record.status === 'OPEN') {
            score += 5;
        }
        // Issue: Low Impact
        if (record.type && record.type.toString() === 'ISSUE' && record.status === 'OPEN') {
            score += 2;
        }
    }
    return score;
};
exports.calculateRiskScore = calculateRiskScore;
const getRiskProfile = async (organizationId, employeeId) => {
    const score = await (0, exports.calculateRiskScore)(organizationId, employeeId);
    let level = 'LOW';
    if (score >= 20)
        level = 'CRITICAL';
    else if (score >= 10)
        level = 'HIGH';
    else if (score >= 5)
        level = 'MEDIUM';
    return { score, level };
};
exports.getRiskProfile = getRiskProfile;
