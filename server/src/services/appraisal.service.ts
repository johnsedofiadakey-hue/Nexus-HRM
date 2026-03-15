import prisma from '../prisma/client'; // FIX: Use shared client

export const initAppraisalCycle = async (organizationId: string, cycleId: string, employeeIds?: string[]) => {
    const cycle = await prisma.cycle.findFirst({
        where: { id: cycleId, organizationId }
    });
    if (!cycle) throw new Error('Cycle not found');
    if (cycle.status !== 'ACTIVE') throw new Error('Cycle must be ACTIVE to initialize appraisals');

    let employeesToInit: any[] = [];
    if (employeeIds && employeeIds.length > 0) {
        employeesToInit = await prisma.user.findMany({
            where: {
                id: { in: employeeIds },
                organizationId,
                status: 'ACTIVE'
            }
        });
    } else {
        employeesToInit = await prisma.user.findMany({
            where: {
                organizationId,
                status: 'ACTIVE'
            }
        });
    }

    const results: any[] = [];
    for (const emp of employeesToInit) {
        if (!emp.supervisorId) {
            console.warn(`Skipping ${emp.fullName} - No Supervisor assigned`);
            continue;
        }

        const existing = await prisma.appraisal.findFirst({
            where: {
                employeeId: emp.id,
                cycleId,
                organizationId
            }
        });

        if (!existing) {
            const appraisal = await prisma.appraisal.create({
                data: {
                    organizationId,
                    employeeId: emp.id,
                    cycleId,
                    reviewerId: emp.supervisorId,
                    status: 'PENDING_SELF'
                }
            });

            const competencies = await prisma.competency.findMany({
                where: { organizationId }
            });
            for (const comp of competencies) {
                await prisma.appraisalRating.create({
                    data: {
                        organizationId,
                        appraisalId: appraisal.id,
                        competencyId: comp.id
                    }
                });
            }
            results.push(appraisal);
        }
    }
    return results;
};

export const getMyAppraisal = async (organizationId: string, userId: string, cycleId?: string) => {
    if (cycleId) {
        return prisma.appraisal.findFirst({
            where: {
                employeeId: userId,
                cycleId,
                organizationId
            },
            include: { ratings: { include: { competency: true } }, reviewer: true, cycle: true }
        });
    }
    return prisma.appraisal.findFirst({
        where: {
            employeeId: userId,
            organizationId
        },
        orderBy: { createdAt: 'desc' },
        include: { ratings: { include: { competency: true } }, reviewer: true, cycle: true }
    });
};

export const submitSelfRating = async (organizationId: string, userId: string, appraisalId: string, ratings: { competencyId: string, score: number, comment?: string }[]) => {
    const appraisal = await prisma.appraisal.findFirst({
        where: { id: appraisalId, organizationId }
    });
    if (!appraisal) throw new Error('Appraisal not found');
    if (appraisal.employeeId !== userId) throw new Error('Unauthorized');
    if (appraisal.status !== 'PENDING_SELF') throw new Error('Self-review already submitted or locked');

    for (const r of ratings) {
        if (r.score < 1 || r.score > 5) throw new Error(`Score must be between 1 and 5 for competency ${r.competencyId}`);
        await prisma.appraisalRating.upsert({
            where: {
                appraisalId_competencyId: { appraisalId, competencyId: r.competencyId }
            },
            update: { selfScore: r.score, selfComment: r.comment },
            create: {
                organizationId,
                appraisalId,
                competencyId: r.competencyId,
                selfScore: r.score,
                selfComment: r.comment
            }
        });
    }

    return prisma.appraisal.update({
        where: { id: appraisalId },
        data: { status: 'PENDING_MANAGER' }
    });
};

export const submitManagerReview = async (organizationId: string, reviewerId: string, appraisalId: string, ratings: { competencyId: string, score: number, comment?: string }[]) => {
    const appraisal = await prisma.appraisal.findFirst({
        where: { id: appraisalId, organizationId }
    });
    if (!appraisal) throw new Error('Appraisal not found');
    if (appraisal.reviewerId !== reviewerId) throw new Error('Unauthorized: Not the reviewer');
    if (appraisal.status !== 'PENDING_MANAGER') throw new Error('Waiting for employee self-evaluation');

    // Weighted scoring using competency weights
    let weightedTotal = 0;
    let totalWeight = 0;

    for (const r of ratings) {
        if (r.score < 1 || r.score > 5) throw new Error(`Score must be between 1 and 5`);
        const competency = await prisma.competency.findFirst({
            where: { id: r.competencyId, organizationId }
        });
        const weight = competency?.weight || 1;

        await prisma.appraisalRating.upsert({
            where: { appraisalId_competencyId: { appraisalId, competencyId: r.competencyId } },
            update: { managerScore: r.score, managerComment: r.comment },
            create: {
                organizationId,
                appraisalId,
                competencyId: r.competencyId,
                managerScore: r.score,
                managerComment: r.comment
            }
        });

        weightedTotal += r.score * weight;
        totalWeight += weight;
    }

    const finalScore = totalWeight > 0 ? (weightedTotal / totalWeight) * 20 : 0; // Scale to 100

    return prisma.appraisal.update({
        where: { id: appraisalId },
        data: { status: 'COMPLETED', finalScore: Math.round(finalScore * 10) / 10 }
    });
};

export const getTeamAppraisals = async (organizationId: string, managerId: string, role?: string) => {
    const whereClause: any = (role === 'MD' || role === 'DIRECTOR') ? {} : { reviewerId: managerId };
    whereClause.organizationId = organizationId;

    return prisma.appraisal.findMany({
        where: whereClause,
        include: {
            employee: { select: { id: true, fullName: true, position: true, avatarUrl: true } },
            cycle: { select: { name: true, endDate: true } },
            ratings: { include: { competency: true } }
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        take: 50
    });
};
