import { PrismaClient, Appraisal, AppraisalStatus, CycleStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const initAppraisalCycle = async (cycleId: string, employeeIds?: string[]) => {
    // 1. Validate Cycle
    const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
    if (!cycle) throw new Error("Cycle not found");
    if (cycle.status !== CycleStatus.ACTIVE) throw new Error("Cycle must be ACTIVE to initialize appraisals");

    // 2. Identify employees (all active or specific list)
    let employeesToInit = [];
    if (employeeIds && employeeIds.length > 0) {
        employeesToInit = await prisma.user.findMany({ where: { id: { in: employeeIds }, status: 'ACTIVE' } });
    } else {
        employeesToInit = await prisma.user.findMany({ where: { status: 'ACTIVE' } });
    }

    // 3. Create Appraisals
    const results = [];
    for (const emp of employeesToInit) {
        if (!emp.supervisorId) {
            console.warn(`Skipping ${emp.fullName} - No Supervisor assigned`);
            continue;
        }

        // Check if already exists
        const existing = await prisma.appraisal.findUnique({
            where: { employeeId_cycleId: { employeeId: emp.id, cycleId } }
        });

        if (!existing) {
            const appraisal = await prisma.appraisal.create({
                data: {
                    employeeId: emp.id,
                    cycleId: cycleId,
                    reviewerId: emp.supervisorId, // Auto-assign current manager
                    status: AppraisalStatus.PENDING_SELF
                }
            });

            // Auto-populate ratings for all competencies
            const competencies = await prisma.competency.findMany();
            for (const comp of competencies) {
                await prisma.appraisalRating.create({
                    data: {
                        appraisalId: appraisal.id,
                        competencyId: comp.id,
                    }
                });
            }

            results.push(appraisal);
        }
    }
    return results;
};

export const getMyAppraisal = async (userId: string, cycleId?: string) => {
    if (cycleId) {
        return prisma.appraisal.findUnique({
            where: { employeeId_cycleId: { employeeId: userId, cycleId } },
            include: { ratings: { include: { competency: true } }, reviewer: true, cycle: true }
        });
    }
    // Get latest active
    return prisma.appraisal.findFirst({
        where: { employeeId: userId },
        orderBy: { createdAt: 'desc' },
        include: { ratings: { include: { competency: true } }, reviewer: true, cycle: true }
    });
};

export const submitSelfRating = async (userId: string, appraisalId: string, ratings: { competencyId: string, score: number, comment?: string }[]) => {
    const appraisal = await prisma.appraisal.findUnique({ where: { id: appraisalId } });
    if (!appraisal) throw new Error("Appraisal not found");
    if (appraisal.employeeId !== userId) throw new Error("Unauthorized");
    if (appraisal.status !== AppraisalStatus.PENDING_SELF) throw new Error("Self-review already submitted or locked");

    // Upsert ratings
    for (const r of ratings) {
        await prisma.appraisalRating.upsert({
            where: { appraisalId_competencyId: { appraisalId, competencyId: r.competencyId } },
            update: { selfScore: r.score, selfComment: r.comment },
            create: { appraisalId, competencyId: r.competencyId, selfScore: r.score, selfComment: r.comment }
        });
    }

    // Update status
    return prisma.appraisal.update({
        where: { id: appraisalId },
        data: { status: AppraisalStatus.PENDING_MANAGER }
    });
};

export const submitManagerReview = async (reviewerId: string, appraisalId: string, ratings: { competencyId: string, score: number, comment?: string }[]) => {
    const appraisal = await prisma.appraisal.findUnique({ where: { id: appraisalId } });
    if (!appraisal) throw new Error("Appraisal not found");
    if (appraisal.reviewerId !== reviewerId) throw new Error("Unauthorized: Not the reviewer");
    // Manager can review anytime after self-eval is done? Or strictly after? 
    // Usually after.
    if (appraisal.status !== AppraisalStatus.PENDING_MANAGER) throw new Error("Waiting for employee submission");

    // Recalculate Final Score
    let totalScore = 0;

    for (const r of ratings) {
        await prisma.appraisalRating.upsert({
            where: { appraisalId_competencyId: { appraisalId, competencyId: r.competencyId } },
            update: { managerScore: r.score, managerComment: r.comment },
            create: { appraisalId, competencyId: r.competencyId, managerScore: r.score, managerComment: r.comment }
        });
        totalScore += r.score; // Simple sum for now, should weight later
    }

    const count = ratings.length;
    const finalScore = count > 0 ? (totalScore / count) : 0;

    return prisma.appraisal.update({
        where: { id: appraisalId },
        data: { status: AppraisalStatus.COMPLETED, finalScore }
    });
};

export const getTeamAppraisals = async (managerId: string, role?: string) => {
    const whereClause = (role === 'MD' || role === 'HR_ADMIN')
        ? {}
        : { reviewerId: managerId };

    return prisma.appraisal.findMany({
        where: whereClause,
        include: {
            employee: { select: { id: true, fullName: true, position: true } },
            cycle: { select: { name: true, endDate: true } },
            ratings: { include: { competency: true } }
        },
        orderBy: [
            { status: 'asc' }, // PENDING_MANAGER first
            { updatedAt: 'desc' }
        ]
    });
};

