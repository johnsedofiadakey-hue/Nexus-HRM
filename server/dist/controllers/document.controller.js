"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.uploadDocument = exports.getEmployeeDocuments = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getEmployeeDocuments = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'default-tenant';
        const docs = await client_1.default.employeeDocument.findMany({
            where: { employeeId: req.params.id, organizationId },
            orderBy: { uploadedAt: 'desc' }
        });
        res.json(docs);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};
exports.getEmployeeDocuments = getEmployeeDocuments;
const uploadDocument = async (req, res) => {
    try {
        const { title, category, fileUrl } = req.body;
        if (!title || !category || !fileUrl)
            return res.status(400).json({ error: 'Missing required fields' });
        const organizationId = req.user?.organizationId || 'default-tenant';
        const doc = await client_1.default.employeeDocument.create({
            data: {
                organizationId,
                employeeId: req.params.id,
                title,
                category,
                fileUrl
            }
        });
        res.json(doc);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
};
exports.uploadDocument = uploadDocument;
const deleteDocument = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'default-tenant';
        await client_1.default.employeeDocument.deleteMany({
            where: { id: req.params.id, organizationId }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
exports.deleteDocument = deleteDocument;
