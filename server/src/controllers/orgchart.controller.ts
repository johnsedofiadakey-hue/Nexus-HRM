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

    const processedIds = new Set<string>();

    // 🛡️ TOPOLOGY CONSOLIDATION: Identify the "Master Root" (Highest rank, usually MD)
    // If multiple exist (rare), pick the first one.
    const masterRoot = users.reduce((prev, current) => {
      const prevRank = getRoleRank(prev.role);
      const currRank = getRoleRank(current.role);
      return currRank > prevRank ? current : prev;
    }, users[0]);

    const masterId = masterRoot?.id;

    // Force all other unparented nodes to report to the Master Root in memory
    const topologyUsers = users.map(u => {
      if (u.id !== masterId && !u.supervisorId) {
        return { ...u, supervisorId: masterId };
      }
      return u;
    });

    const getMatrixReports = (managerId: string) => {
      return matrixLines
        .filter((ml: any) => ml.managerId === managerId)
        .map((ml: any) => {
          const emp = topologyUsers.find(user => user.id === ml.employeeId);
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
    };

    const buildTree = (parentId: string | null = null): any[] => {
      return topologyUsers
        .filter(u => u.supervisorId === parentId && !processedIds.has(u.id))
        .sort((a, b) => getRoleRank(b.role) - getRoleRank(a.role))
        .map(u => {
          processedIds.add(u.id);
          
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
            matrixReports: getMatrixReports(u.id)
          };
        });
    };

    let roots: any[] = [];
    
    // 1. Process the Master Root first
    if (masterRoot) {
        processedIds.add(masterRoot.id);
        roots.push({
            id: masterRoot.id,
            name: masterRoot.fullName,
            title: masterRoot.jobTitle,
            role: masterRoot.role,
            rank: getRoleRank(masterRoot.role),
            avatar: masterRoot.avatarUrl,
            department: masterRoot.departmentObj?.name,
            reportingType: 'SOLID',
            children: buildTree(masterRoot.id),
            matrixReports: getMatrixReports(masterRoot.id)
        });
    }

    // 2. Cleanup any remaining missed nodes (disconnected graphs) 
    // Even after consolidation, cyclic or deep isolates might exist.
    const remaining = topologyUsers.filter(u => !processedIds.has(u.id));
    if (remaining.length > 0) {
      remaining.sort((a, b) => getRoleRank(b.role) - getRoleRank(a.role));
      for (const u of remaining) {
        if (!processedIds.has(u.id)) {
          processedIds.add(u.id);
          // Attach to first root if it exists, otherwise make a new root
          const nodeData = {
            id: u.id,
            name: u.fullName,
            title: u.jobTitle,
            role: u.role,
            rank: getRoleRank(u.role),
            avatar: u.avatarUrl,
            department: u.departmentObj?.name,
            reportingType: 'SOLID',
            children: buildTree(u.id),
            matrixReports: getMatrixReports(u.id)
          };

          if (roots.length > 0) {
            roots[0].children.push(nodeData);
          } else {
            roots.push(nodeData);
          }
        }
      }
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
