import { PrismaClient, SystemSettings } from '@prisma/client';

const prisma = new PrismaClient();

export const getSettings = async () => {
    // Singleton pattern: Get first or create default
    let settings = await prisma.systemSettings.findFirst();

    if (!settings) {
        settings = await prisma.systemSettings.create({
            data: {
                companyName: "Nexus HRM",
                companyLogoUrl: "", // Empty default
                primaryColor: "#4F46E5",
                secondaryColor: "#1E293B",
                accentColor: "#F59E0B"
            }
        });
    }

    return settings;
};

export const updateSettings = async (data: Partial<SystemSettings>) => {
    const current = await getSettings();
    return prisma.systemSettings.update({
        where: { id: current.id },
        data
    });
};
