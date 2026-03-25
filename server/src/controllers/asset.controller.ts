import { getRoleRank } from '../middleware/auth.middleware';
import { Request, Response } from 'express';
import * as assetService from '../services/asset.service';
import { logAction } from '../services/audit.service';
import prisma from '../prisma/client';

export const createAsset = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'default-tenant';
        const asset = await assetService.createAsset(organizationId, req.body);
        await logAction(user.id, 'CREATE_ASSET', 'Asset', asset.id, { serial: asset.serialNumber }, req.ip);
        res.status(201).json(asset);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getInventory = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const actorRole = userReq.role;
        const actorRank = getRoleRank(actorRole);
        const actorId = userReq.id;

        let assets = await assetService.getAllAssets(organizationId);

        // 🛡️ ASSET ISOLATION:
        // - MD / DIRECTOR / HR_MANAGER (>= 75) can see all inventory.
        // - MANAGER / MID_MANAGER (65-70) see all assets in their department.
        // - STAFF / CASUAL (< 65) see only assets assigned to THEM.
        if (actorRank < 75 && actorRole !== 'DEV') {
            if (actorRank >= 65) {
                // Filter by department (need to check if asset has a department field or check user's department)
                // Asset model usually doesn't have departmentId, but we can filter by assigned user's department.
                assets = assets.filter(asset => 
                    asset.assignments.some(a => (a.user as any)?.departmentId === userReq.departmentId)
                );
            } else {
                // Personal isolation
                assets = assets.filter(asset => 
                    asset.assignments.some(a => a.userId === actorId)
                );
            }
        }

        res.json(assets);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const assignAsset = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const { assetId, userId, condition } = req.body;
        const assignment = await assetService.assignAsset(organizationId, assetId, userId, condition);
        await logAction(userReq.id, 'ASSIGN_ASSET', 'Asset', assetId, { assignedTo: userId }, req.ip);
        res.json(assignment);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const returnAsset = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user;
        const organizationId = userReq.organizationId || 'default-tenant';
        const { assetId, condition } = req.body;
        const result = await assetService.returnAsset(organizationId, assetId, condition);
        await logAction(userReq.id, 'RETURN_ASSET', 'Asset', assetId, { condition }, req.ip);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
