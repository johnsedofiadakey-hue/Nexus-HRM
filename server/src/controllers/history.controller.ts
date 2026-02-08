import { Request, Response } from 'express';
import * as historyService from '../services/history.service';
import { logAction } from '../services/audit.service';

export const createRecord = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const loggedById = req.user.id;
        const record = await historyService.createHistory({ ...req.body, loggedById });

        // @ts-ignore
        await logAction(loggedById, 'CREATE_HISTORY', 'EmployeeHistory', record.id, { type: record.type, employeeId: record.employeeId }, req.ip);

        res.status(201).json(record);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getEmployeeRecords = async (req: Request, res: Response) => {
    try {
        const records = await historyService.getHistoryByEmployee(req.params.employeeId);

        // @ts-ignore
        const userRole = req.user?.role;
        // @ts-ignore
        const userId = req.user?.id;

        // FILTERING LOGIC
        // If user is basic EMPLOYEE, they can only see COMMENDATION and GENERAL_NOTE
        // Unless they are viewing someone else? No, employees typically shouldn't see others' history at all unless they are a manager.
        // For now, let's assume the route guard handles "who" they can view, but this filter handles "what types" they can see.

        if (userRole === 'EMPLOYEE') {
            const visibleToEmployee = ['COMMENDATION', 'GENERAL_NOTE'];
            const filtered = records.filter(r => visibleToEmployee.includes(r.type));
            return res.json(filtered);
        }

        // Managers/HR/Admin see everything
        res.json(records);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateStatus = async (req: Request, res: Response) => {
    try {
        const record = await historyService.updateHistoryStatus(req.params.id, req.body.status);
        // @ts-ignore
        await logAction(req.user?.id, 'UPDATE_HISTORY_STATUS', 'EmployeeHistory', req.params.id, { status: req.body.status }, req.ip);
        res.json(record);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
