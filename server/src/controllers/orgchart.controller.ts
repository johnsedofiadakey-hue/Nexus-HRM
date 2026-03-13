import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getHierarchy = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        role: true,
        avatarUrl: true,
        departmentObj: { select: { name: true } },
        supervisorId: true,
      }
    });

    // Helper to build tree
    const buildTree = (parentId: string | null = null): any[] => {
      return users
        .filter(u => u.supervisorId === parentId)
        .map(u => ({
          id: u.id,
          name: u.fullName,
          title: u.jobTitle,
          role: u.role,
          avatar: u.avatarUrl,
          department: u.departmentObj?.name,
          children: buildTree(u.id)
        }));
    };

    // Find MD or top level (supervisorId is null)
    const tree = buildTree(null);

    res.json(tree);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const reassignSupervisor = async (req: Request, res: Response) => {
  try {
    const { employeeId, supervisorId } = req.body;
    const user = await prisma.user.update({
      where: { id: employeeId },
      data: { supervisorId }
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
