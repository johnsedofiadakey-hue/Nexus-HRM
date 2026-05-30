import { Router } from 'express';
import * as supportController from '../controllers/support.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, CreateTicketSchema, AddCommentSchema, UpdateTicketStatusSchema } from '../middleware/validate.middleware';
import { RoleRank } from '../types/roles';

const router = Router();

// Employee endpoints
router.post('/tickets', authenticate, validate(CreateTicketSchema), supportController.createTicket);
router.get('/my', authenticate, supportController.getMyTickets);
router.get('/my-tickets', authenticate, supportController.getMyTickets);
router.get('/tickets/:id', authenticate, supportController.getTicketDetails);
router.post('/tickets/:ticketId/comments', authenticate, validate(AddCommentSchema), supportController.addComment);

// Admin / IT endpoints (Rank 85+ for IT Admin, MD, HR Manager)
router.get('/all', authenticate, requireRole(85), supportController.getAllTickets);
router.get('/all-tickets', authenticate, requireRole(85), supportController.getAllTickets);
router.patch('/tickets/:id/status', authenticate, requireRole(85), validate(UpdateTicketStatusSchema), supportController.updateTicketStatus);
router.patch('/tickets/:id', authenticate, requireRole(85), validate(UpdateTicketStatusSchema), supportController.updateTicketStatus);
router.delete('/tickets/:id', authenticate, supportController.deleteTicket);

export default router;
