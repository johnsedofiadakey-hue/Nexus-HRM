import { PrismaClient, Asset, AssetAssignment, AssetStatus, AssetType } from '@prisma/client';

const prisma = new PrismaClient();

// Asset CRUD
export const createAsset = async (data: any) => {
    // Basic validation
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

// Assignment Logic
export const assignAsset = async (assetId: string, userId: string, condition?: string) => {
    // 1. Check if asset is available
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("Asset not found");
    if (asset.status !== AssetStatus.AVAILABLE) throw new Error("Asset is not available for assignment");

    // 2. Transaction: Create Assignment + Update Asset Status
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
            data: { status: AssetStatus.ASSIGNED }
        });

        return assignment;
    });
};

export const returnAsset = async (assetId: string, condition?: string) => {
    // 1. Find active assignment
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { assignments: { where: { returnedAt: null } } }
    });

    if (!asset) throw new Error("Asset not found");
    if (asset.assignments.length === 0) throw new Error("Asset is not currently assigned");

    const assignmentId = asset.assignments[0].id;

    // 2. Transaction: Close Assignment + Update Asset Status
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
            data: { status: AssetStatus.AVAILABLE } // Or MAINTENANCE based on condition? Simple for now.
        });

        return assignment;
    });
};
