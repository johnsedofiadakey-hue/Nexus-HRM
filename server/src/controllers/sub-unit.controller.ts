import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';

export const getSubUnits = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { departmentId } = req.query;
    
    const whereClause: any = {
      organizationId: orgId || 'default-tenant'
    };
    
    if (departmentId) {
      whereClause.departmentId = Number(departmentId);
    }

    const subUnits = await prisma.subUnit.findMany({
      where: whereClause,
      include: {
        manager: {
          select: { fullName: true }
        },
        employees: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const payload = subUnits.map((su) => ({
      id: su.id,
      name: su.name,
      departmentId: su.departmentId,
      managerId: su.managerId,
      manager: su.manager ? { fullName: su.manager.fullName } : null,
      memberCount: su.employees.length
    }));

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSubUnit = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const { name, departmentId, managerId } = req.body;
    
    if (!name?.trim()) return res.status(400).json({ error: 'Sub-unit name is required' });
    if (!departmentId) return res.status(400).json({ error: 'Department ID is required' });

    const subUnit = await prisma.subUnit.create({
      data: {
        name: name.trim(),
        departmentId: Number(departmentId),
        organizationId,
        ...(managerId ? { managerId } : {})
      }
    });
    
    res.status(201).json(subUnit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateSubUnit = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { name, managerId } = req.body;
    
    const subUnit = await prisma.subUnit.update({
      where: { 
        id: req.params.id,
        organizationId: orgId || 'default-tenant'
      },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(managerId !== undefined ? { managerId: managerId || null } : {})
      }
    });
    
    res.json(subUnit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSubUnit = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    
    // Check for active employees
    const count = await prisma.user.count({
      where: {
        subUnitId: req.params.id,
        organizationId: orgId || 'default-tenant',
        status: 'ACTIVE'
      }
    });

    if (count > 0) {
      return res.status(409).json({ error: `Cannot delete: ${count} active employee(s) in this sub-unit` });
    }

    await prisma.subUnit.delete({
      where: { 
        id: req.params.id,
        organizationId: orgId || 'default-tenant'
      }
    });
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
