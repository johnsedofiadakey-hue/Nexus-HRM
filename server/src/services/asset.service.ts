import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createAsset = async (data: any) => {
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.warrantyExpiry) data.warrantyExpiry = new Date(data.warrantyExpiry);

    return prisma.asset.create({ data });
};

export const getAllAssets = async () => {
    return prisma.asset.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            assignments: {
                where: { returnedAt: null },
                include: { user: { select: { fullName: true } } }
            }
        }
    });
};

export const assignAsset = async (assetId: string, userId: string, condition?: string) => {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("Asset not found");
    if (asset.status !== 'AVAILABLE') throw new Error("Asset is not available for assignment");

    return prisma.$transaction(async (tx) => {
        const assignment = await tx.assetAssignment.create({
            data: {
                assetId,
                userId,
                conditionOnAssign: condition
            }
        });

        await tx.asset.update({
            where: { id: assetId },
            data: { status: 'ASSIGNED' }
        });

        return assignment;
    });
};

export const returnAsset = async (assetId: string, condition?: string) => {
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { assignments: { where: { returnedAt: null } } }
    });

    if (!asset) throw new Error("Asset not found");
    if (asset.assignments.length === 0) throw new Error("Asset is not currently assigned");

    const assignmentId = asset.assignments[0].id;

    return prisma.$transaction(async (tx) => {
        const assignment = await tx.assetAssignment.update({
            where: { id: assignmentId },
            data: {
                returnedAt: new Date(),
                conditionOnReturn: condition
            }
        });

        await tx.asset.update({
            where: { id: assetId },
            data: { status: 'AVAILABLE' }
        });

        return assignment;
    });
};
