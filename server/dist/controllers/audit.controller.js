"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogs = void 0;
const audit_service_1 = require("../services/audit.service");
const getLogs = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user?.organizationId || 'default-tenant';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const entity = req.query.entity;
        const userId = req.query.userId;
        const data = await (0, audit_service_1.getAuditLogs)(organizationId, page, limit, { entity, userId });
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getLogs = getLogs;
