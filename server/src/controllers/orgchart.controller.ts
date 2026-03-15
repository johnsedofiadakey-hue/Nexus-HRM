import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getHierarchy = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'default-tenant';

    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isArchived: false,
        role: { not: 'DEV' }
      },
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

    // Helper to build tree with sorting
    const buildTree = (parentId: string | null = null): any[] => {
      return users
        .filter(u => u.supervisorId === parentId)
        .sort((a, b) => getRoleRank(b.role) - getRoleRank(a.role)) // Sort by rank descending
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

    // Find the MD or those with no supervisor
    // Usually, MD has supervisorId: null. 
    // We prioritize the MD as the absolute root if exists.
    const md = users.find(u => u.role === 'MD');
    
    let roots: any[] = [];
    if (md && !md.supervisorId) {
      roots = [md].map(u => ({
        id: u.id,
        name: u.fullName,
        title: u.jobTitle,
        role: u.role,
        avatar: u.avatarUrl,
        department: u.departmentObj?.name,
        children: buildTree(u.id)
      }));
    } else {
      // Fallback: everyone with null supervisor
      roots = buildTree(null);
    }

    res.json(roots);
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
