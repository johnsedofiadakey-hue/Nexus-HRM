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
    const buildTree = (parentId: string | null = null, processedIds = new Set<string>()): any[] => {
      return users
        .filter(u => u.supervisorId === parentId && !processedIds.has(u.id))
        .sort((a, b) => getRoleRank(b.role) - getRoleRank(a.role))
        .map(u => {
          processedIds.add(u.id);
          return {
            id: u.id,
            name: u.fullName,
            title: u.jobTitle,
            role: u.role,
            avatar: u.avatarUrl,
            department: u.departmentObj?.name,
            children: buildTree(u.id, processedIds)
          };
        });
    };

    const processedIds = new Set<string>();
    
    // 1. Start with explicit roots (no supervisor)
    let roots = buildTree(null, processedIds);

    // 2. Identify "island" nodes that have a supervisorId that doesn't exist 
    // or formed a cycle/disconnected graph.
    // We add any remaining unprocessed users as secondary roots if they have no valid parent in the current set.
    const remaining = users.filter(u => !processedIds.has(u.id));
    if (remaining.length > 0) {
      // Sort remaining by rank and add them
      remaining.sort((a, b) => getRoleRank(b.role) - getRoleRank(a.role));
      for (const u of remaining) {
        if (!processedIds.has(u.id)) {
          roots.push({
            id: u.id,
            name: u.fullName,
            title: u.jobTitle,
            role: u.role,
            avatar: u.avatarUrl,
            department: u.departmentObj?.name,
            children: buildTree(u.id, processedIds)
          });
        }
      }
    }

    // 3. Final Sort of top-level roots by rank (MD first)
    roots.sort((a, b) => getRoleRank(b.role) - getRoleRank(a.role));

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
