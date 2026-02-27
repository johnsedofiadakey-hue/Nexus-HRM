import { Router } from 'express';
import { authenticate, authorize, authorizeMinimumRole } from '../middleware/auth.middleware';
import {
    requestLoan, getMyLoans, getAllLoans, approveLoan, rejectLoan,
    submitExpense, getMyExpenses, getAllExpenses, approveExpense, rejectExpense
} from '../controllers/finance.controller';

const router = Router();
router.use(authenticate);

// Employee endpoints
router.post('/loans', requestLoan);
router.get('/loans/me', getMyLoans);
router.post('/expenses', submitExpense);
router.get('/expenses/me', getMyExpenses);

// Admin / HR endpoints
router.get('/loans', authorizeMinimumRole('MANAGER'), getAllLoans);
router.post('/loans/:id/approve', authorizeMinimumRole('DIRECTOR'), approveLoan);
router.post('/loans/:id/reject', authorizeMinimumRole('DIRECTOR'), rejectLoan);

router.get('/expenses', authorizeMinimumRole('MANAGER'), getAllExpenses);
router.post('/expenses/:id/approve', authorizeMinimumRole('MANAGER'), approveExpense);
router.post('/expenses/:id/reject', authorizeMinimumRole('MANAGER'), rejectExpense);

export default router;
