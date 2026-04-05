"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = __importDefault(require("../prisma/client"));
const firebase_storage_service_1 = require("../services/firebase-storage.service");
const router = (0, express_1.Router)();
// Buffer storage for initial upload processing
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});
router.post('/logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        const orgId = req.user?.organizationId || 'default-tenant';
        let logoUrl = '';
        let storageType = 'cloud';
        try {
            // 1. Attempt Cloud Upload (Firebase)
            logoUrl = await firebase_storage_service_1.FirebaseStorageService.uploadLogo(req.file);
        }
        catch (firebaseError) {
            console.warn('[Upload] Firebase failed, falling back to local server storage:', firebaseError);
            // 2. Fallback: Save to Local Server Disk (public/uploads)
            const filename = `logo-${Date.now()}${path_1.default.extname(req.file.originalname)}`;
            const uploadDir = path_1.default.join(__dirname, '../../public/uploads');
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path_1.default.join(uploadDir, filename);
            fs_1.default.writeFileSync(filePath, req.file.buffer);
            logoUrl = `/uploads/${filename}`;
            storageType = 'local';
        }
        // 3. Update Database with the new URL (either cloud or local)
        const organization = await client_1.default.organization.findUnique({ where: { id: orgId } });
        const oldLogo = organization?.logoUrl;
        await client_1.default.organization.update({
            where: { id: orgId },
            data: { logoUrl }
        });
        // 4. Cleanup old cloud assets if we just moved to a new cloud one
        if (storageType === 'cloud' && oldLogo && oldLogo.includes('storage.googleapis.com')) {
            try {
                await firebase_storage_service_1.FirebaseStorageService.deleteFile(oldLogo);
            }
            catch (e) { }
        }
        res.json({
            success: true,
            logoUrl,
            storage: storageType,
            message: storageType === 'local'
                ? 'Logo saved to local server. (Firebase Cloud needs configuration fix)'
                : 'Logo synchronized to Firebase Cloud'
        });
    }
    catch (error) {
        console.error('Critical Upload Error:', error);
        res.status(500).json({ success: false, message: 'Upload system encounterd a critical failure', error: error.message });
    }
});
exports.default = router;
