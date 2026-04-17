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

    const matrixLines = await (prisma as any).employeeReporting.findMany({
      where: { organizationId, type: 'DOTTED', effectiveTo: null }
    });

    // 1. Determine the logical root(s). 
    // Usually supervisorId is null, but we'll also pick the highest rank if no nulls exist.
    const nullSupervisorUsers = users.filter(u => !u.supervisorId);
    let rootCandidates = nullSupervisorUsers;

    if (rootCandidates.length === 0 && users.length > 0) {
      // If no one is a null-root, pick the MD or highest ranker
      const maxRank = Math.max(...users.map(u => getRoleRank(u.role)));
      rootCandidates = users.filter(u => getRoleRank(u.role) === maxRank);
    }

    const processedIds = new Set<string>();
    
    const buildTree = (parentId: string | null = null): any[] => {
      return users
        .filter(u => u.supervisorId === parentId && !processedIds.has(u.id))
        .sort((a, b) => getRoleRank(b.role) - getRoleRank(a.role))
        .map(u => {
          processedIds.add(u.id);
          
          // Find dotted reports for this manager
          const dottedChildren = matrixLines
            .filter((ml: any) => ml.managerId === u.id)
            .map((ml: any) => {
                const emp = users.find(user => user.id === ml.employeeId);
                if (!emp) return null;
                return {
                    id: emp.id,
                    name: emp.fullName,
                    title: emp.jobTitle,
                    role: emp.role,
                    rank: getRoleRank(emp.role),
                    avatar: emp.avatarUrl,
                    department: emp.departmentObj?.name,
                    reportingType: 'DOTTED'
                };
            })
            .filter(Boolean);

          return {
            id: u.id,
            name: u.fullName,
            title: u.jobTitle,
            role: u.role,
            rank: getRoleRank(u.role),
            avatar: u.avatarUrl,
            department: u.departmentObj?.name,
            reportingType: 'SOLID',
            children: buildTree(u.id),
            matrixReports: dottedChildren
          };
        });
    };

    let roots: any[] = [];
    
    // Process main roots
    for (const root of rootCandidates) {
        if (!processedIds.has(root.id)) {
            processedIds.add(root.id);
            roots.push({
                id: root.id,
                name: root.fullName,
                title: root.jobTitle,
                role: root.role,
                rank: getRoleRank(root.role),
                avatar: root.avatarUrl,
                department: root.departmentObj?.name,
                reportingType: 'SOLID',
                children: buildTree(root.id)
            });
        }
    }

    // 2. Identify "island" nodes that were missed (e.g. disconnected graphs)
    const remaining = users.filter(u => !processedIds.has(u.id));
    if (remaining.length > 0) {
      remaining.sort((a, b) => getRoleRank(b.role) - getRoleRank(a.role));
      for (const u of remaining) {
        if (!processedIds.has(u.id)) {
          processedIds.add(u.id);
          roots.push({
            id: u.id,
            name: u.fullName,
            title: u.jobTitle,
            role: u.role,
            rank: getRoleRank(u.role),
            avatar: u.avatarUrl,
            department: u.departmentObj?.name,
            children: buildTree(u.id)
          });
        }
      }
    }

    // 3. Final Sort of top-level roots by rank
    roots.sort((a, b) => b.rank - a.rank);

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
