import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import prisma from '../prisma/client';
import { FirebaseStorageService } from '../services/firebase-storage.service';

const router = Router();

// Configure Multer for Cloud Streaming
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, png, webp) are allowed'));
    }
});

// @route   POST /api/upload/logo
// @desc    Upload company logo to Firebase
router.post('/logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const orgId = (req as any).user?.organizationId || 'default-tenant';
        
        // 1. Fetch current logo for cleanup
        const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { logoUrl: true } });
        
        // 2. Upload to Cloud
        const logoUrl = await FirebaseStorageService.uploadLogo(req.file);

        // 3. Update organization with the new cloud URL
        await prisma.organization.update({
            where: { id: orgId },
            data: { logoUrl }
        });

        // 4. (Optional) Cleanup old cloud logo to save space
        if (org?.logoUrl && org.logoUrl.includes('storage.googleapis.com')) {
           await FirebaseStorageService.deleteFile(org.logoUrl);
        }

        res.json({ success: true, logoUrl });
    } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ success: false, message: 'Cloud upload failed' });
    }
});

export default router;
