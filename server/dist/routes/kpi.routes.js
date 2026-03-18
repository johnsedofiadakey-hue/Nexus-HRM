"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const kpi_controller_1 = require("../controllers/kpi.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Employee
router.get('/my-sheets', kpi_controller_1.getMySheets);
router.patch('/update-progress', kpi_controller_1.updateKpiProgress);
router.post('/recall', kpi_controller_1.recallKpiSheet);
// Manager / MD / Supervisor
router.get('/assigned', kpi_controller_1.getSheetsIAssigned);
router.post('/assign', (0, auth_middleware_1.requireRole)(70), kpi_controller_1.createKpiSheet);
router.post('/review', (0, auth_middleware_1.requireRole)(70), kpi_controller_1.reviewKpiSheet);
// MD / HR Admin
router.get('/all', (0, auth_middleware_1.requireRole)(80), kpi_controller_1.getAllSheets);
router.delete('/:id', (0, auth_middleware_1.requireRole)(80), kpi_controller_1.deleteKpiSheet);
router.get('/:id', kpi_controller_1.getSheetById);
exports.default = router;
