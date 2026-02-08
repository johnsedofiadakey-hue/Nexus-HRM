import { PrismaClient, HistoryType, HistoryStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const calculateRiskScore = async (employeeId: string) => {
    // 1. Fetch History
    const history = await prisma.employeeHistory.findMany({
        where: { employeeId }
    });

    let score = 0;

    // 2. Loop and Calculate
    for (const record of history) {
        // Disciplinary Record: High Impact
        if (record.type === 'DISCIPLINARY') {
            score += 10;
        }

        // Active Query: Medium Impact
        if (record.type === 'QUERY' && record.status === 'OPEN') {
            score += 5;
        }

        // Issue: Low Impact
        if (record.type === 'ISSUE' && record.status === 'OPEN') {
            score += 2;
        }
    }

    return score;
};

export const getRiskProfile = async (employeeId: string) => {
    const score = await calculateRiskScore(employeeId);
    let level = 'LOW';
    if (score >= 20) level = 'CRITICAL';
    else if (score >= 10) level = 'HIGH';
    else if (score >= 5) level = 'MEDIUM';

    return { score, level };
};
