"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const leave_controller_1 = require("../controllers/leave.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/apply', leave_controller_1.applyForLeave);
router.get('/my', leave_controller_1.getMyLeaves);
router.get('/balance', leave_controller_1.getMyLeaveBalance);
router.delete('/:id/cancel', leave_controller_1.cancelLeave);
// Manager routes
router.get('/pending', (0, auth_middleware_1.requireRole)(70), leave_controller_1.getPendingLeaves);
router.post('/process', (0, auth_middleware_1.requireRole)(70), leave_controller_1.processLeave);
// Admin routes
router.get('/all', (0, auth_middleware_1.requireRole)(80), leave_controller_1.getAllLeaves);
exports.default = router;
