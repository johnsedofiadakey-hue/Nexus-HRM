"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const leave_controller_1 = require("../controllers/leave.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Employee self-service
router.post('/apply', leave_controller_1.applyForLeave);
router.get('/my', leave_controller_1.getMyLeaves);
router.get('/balance', leave_controller_1.getMyLeaveBalance);
router.get('/my-relief-requests', leave_controller_1.getMyReliefRequests);
router.get('/handover/history', leave_controller_1.getHandoverHistory);
router.get('/eligible-relievers', leave_controller_1.getEligibleRelievers);
router.delete('/:id/cancel', leave_controller_1.cancelLeave);
// MD-Only Administrative Controls
router.delete('/request/:id', leave_controller_1.deleteLeave);
router.delete('/handover/:id', leave_controller_1.deleteHandover);
// Manager / HR processing
router.get('/pending', (0, auth_middleware_1.requireRole)(60), leave_controller_1.getPendingLeaves);
router.post('/process', (0, auth_middleware_1.requireRole)(50), leave_controller_1.processLeave);
// Admin view (rank 80+ ONLY — fixes L4)
router.get('/all', (0, auth_middleware_1.requireRole)(80), leave_controller_1.getAllLeaves);
exports.default = router;
