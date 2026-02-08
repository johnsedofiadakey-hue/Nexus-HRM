import { PrismaClient, Cycle, CycleStatus, CycleType } from '@prisma/client';

const prisma = new PrismaClient();

export const createCycle = async (data: {
  name: string;
  type: CycleType;
  startDate: string | Date;
  endDate: string | Date;
}) => {
  // Check for overlapping active cycles of same type? Optional but good practice.
  // For now, adhering to simple creation.
  
  return prisma.cycle.create({
    data: {
      name: data.name,
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'DRAFT',
    },
  });
};

export const getCycles = async (filter?: { status?: CycleStatus }) => {
  return prisma.cycle.findMany({
    where: filter,
    orderBy: { startDate: 'desc' },
  });
};

export const getCycleById = async (id: string) => {
  return prisma.cycle.findUnique({
    where: { id },
  });
};

export const updateCycle = async (id: string, data: Partial<{
  name: string;
  status: CycleStatus;
  startDate: Date | string;
  endDate: Date | string;
}>) => {
    
    // Safety check: Cannot modify LOCKED or ARCHIVED cycles easily?
    // Allowing flexible updates for now as per "Draft -> Active -> Locked" flow.

    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    return prisma.cycle.update({
        where: { id },
        data: updateData,
    });
};

export const deleteCycle = async (id: string) => {
  // Only allow if no dependent data? 
  // For now, strict cascade might handle it or we just allow deletion if clean.
  return prisma.cycle.delete({ where: { id } });
};
