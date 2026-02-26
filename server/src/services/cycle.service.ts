import { PrismaClient, Cycle } from '@prisma/client';

const prisma = new PrismaClient();

export const createCycle = async (data: {
  name: string;
  type: string;
  startDate: string | Date;
  endDate: string | Date;
}) => {
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

export const getCycles = async (filter?: { status?: string }) => {
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
  status: string;
  startDate: Date | string;
  endDate: Date | string;
}>) => {
  const updateData: any = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  return prisma.cycle.update({
    where: { id },
    data: updateData,
  });
};

export const deleteCycle = async (id: string) => {
  return prisma.cycle.delete({ where: { id } });
};
