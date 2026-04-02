import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { RoleRank } from '../types/roles';

const router = Router();

// Employee endpoints
router.post('/claims', authenticate, expenseController.createExpenseClaim);
router.get('/my-claims', authenticate, expenseController.getMyExpenses);

// Manager / HR endpoints
router.get('/pending', authenticate, expenseController.getPendingApprovals);
router.patch('/claims/:id/approve', authenticate, expenseController.approveExpense);
router.patch('/claims/:id/reject', authenticate, expenseController.rejectExpense);

export default router;
