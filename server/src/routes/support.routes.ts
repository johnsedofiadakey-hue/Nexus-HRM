import { Router } from 'express';
import * as supportController from '../controllers/support.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { RoleRank } from '../types/roles';

const router = Router();

// Employee endpoints
router.post('/tickets', authenticate, supportController.createTicket);
router.get('/my-tickets', authenticate, supportController.getMyTickets);
router.get('/tickets/:id', authenticate, supportController.getTicketDetails);
router.post('/tickets/:id/comments', authenticate, supportController.addComment);

// Admin / IT endpoints (Rank 85+ for IT Admin, MD, HR Manager)
router.get('/all', authenticate, requireRole(85), supportController.getAllTickets);
router.get('/all-tickets', authenticate, requireRole(85), supportController.getAllTickets);
router.patch('/tickets/:id', authenticate, requireRole(85), supportController.updateTicketStatus);

export default router;
