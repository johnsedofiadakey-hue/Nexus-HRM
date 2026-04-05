import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma/client';
import { FirebaseStorageService } from '../services/firebase-storage.service';

const router = Router();

// Buffer storage for initial upload processing
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

router.post('/logo', upload.single('logo'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const orgId = req.user?.organizationId || 'default-tenant';
    let logoUrl = '';
    let storageType = 'cloud';

    try {
      // 1. Attempt Cloud Upload (Firebase)
      logoUrl = await FirebaseStorageService.uploadLogo(req.file);
    } catch (firebaseError) {
      console.warn('[Upload] Firebase failed, falling back to local server storage:', firebaseError);
      
      // 2. Fallback: Save to Local Server Disk (public/uploads)
      const filename = `logo-${Date.now()}${path.extname(req.file.originalname)}`;
      const uploadDir = path.join(__dirname, '../../public/uploads');
      
      if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      
      logoUrl = `/uploads/${filename}`;
      storageType = 'local';
    }

    // 3. Update Database with the new URL (either cloud or local)
    const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    const oldLogo = organization?.logoUrl;

    await prisma.organization.update({
      where: { id: orgId },
      data: { logoUrl }
    });

    // 4. Cleanup old cloud assets if we just moved to a new cloud one
    if (storageType === 'cloud' && oldLogo && oldLogo.includes('storage.googleapis.com')) {
       try { await FirebaseStorageService.deleteFile(oldLogo); } catch(e){}
    }

    res.json({ 
      success: true, 
      logoUrl, 
      storage: storageType,
      message: storageType === 'local' 
        ? 'Logo saved to local server. (Firebase Cloud needs configuration fix)' 
        : 'Logo synchronized to Firebase Cloud' 
    });
  } catch (error: any) {
    console.error('Critical Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload system encounterd a critical failure', error: error.message });
  }
});

export default router;
