import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for handling permanent media storage via Firebase Storage.
 * This ensures files are persisted independently of the ephemeral application server.
 */
class FirebaseStorageService {
  private bucket: any;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (admin.apps.length === 0) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
          console.warn('[FirebaseStorage] Warning: Missing credentials. Falling back to local storage (Not recommended for Production).');
          return;
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
        });
      }
      this.bucket = admin.storage().bucket();
      console.log('[FirebaseStorage] Initialized successfully.');
    } catch (error) {
      console.error('[FirebaseStorage] Initialization failed:', error);
    }
  }

  /**
   * Upload a file from a buffer to Firebase Storage.
   * @param buffer The file buffer (e.g. from multer)
   * @param originalName The original filename to preserve extension
   * @param folder Destination folder in the bucket (e.g. 'avatars')
   * @returns The public URL of the uploaded file
   */
  async uploadFile(buffer: Buffer, originalName: string, folder: string = 'uploads'): Promise<string> {
    if (!this.bucket) {
      throw new Error('Firebase Storage not initialized. Local fallback not implemented in this flow.');
    }

    const ext = originalName.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${ext}`;
    const file = this.bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: this.getMimeType(ext || ''),
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (err: any) => reject(err));
      stream.on('finish', async () => {
        // Make the file public (Alternatively, use signed URLs if privacy is required)
        try {
          await file.makePublic();
          const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
          resolve(publicUrl);
        } catch (err) {
          reject(err);
        }
      });
      stream.end(buffer);
    });
  }

  /**
   * Delete a file from Firebase Storage.
   * @param url The full public URL of the file
   */
  async deleteFile(url: string): Promise<void> {
    if (!this.bucket || !url.includes(this.bucket.name)) return;
    
    try {
      const filePath = url.split(`${this.bucket.name}/`)[1];
      if (filePath) {
        await this.bucket.file(filePath).delete();
        console.log(`[FirebaseStorage] Deleted: ${filePath}`);
      }
    } catch (error) {
      console.warn(`[FirebaseStorage] Deletion failed for ${url}:`, error);
    }
  }

  private getMimeType(ext: string): string {
    const mimes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
    };
    return mimes[ext.toLowerCase()] || 'application/octet-stream';
  }
}

export const storageService = new FirebaseStorageService();
