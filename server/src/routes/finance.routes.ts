import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
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
router.get('/loans', authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), getAllLoans);
router.post('/loans/:id/approve', authorize(['HR_ADMIN', 'MD']), approveLoan);
router.post('/loans/:id/reject', authorize(['HR_ADMIN', 'MD']), rejectLoan);

router.get('/expenses', authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), getAllExpenses);
router.post('/expenses/:id/approve', authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), approveExpense);
router.post('/expenses/:id/reject', authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), rejectExpense);

export default router;
