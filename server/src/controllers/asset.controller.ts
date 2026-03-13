import { Request, Response } from 'express';
import * as assetService from '../services/asset.service';
import { logAction } from '../services/audit.service';

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
        const user = (req as any).user;
        const organizationId = user.organizationId || 'default-tenant';
        const assets = await assetService.getAllAssets(organizationId);
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
