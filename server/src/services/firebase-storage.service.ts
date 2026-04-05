import { getBucket } from '../config/firebase.config';
import { v4 as uuidv4 } from 'uuid';

export class FirebaseStorageService {
  /**
   * Uploads a file buffer to Firebase Storage and returns the public URL.
   */
  static async uploadLogo(file: Express.Multer.File): Promise<string> {
    const bucket = getBucket();
    if (!bucket) {
      throw new Error('[FirebaseStorage] No cloud storage configured. Please set environment variables.');
    }

    const filename = `logos/${Date.now()}-${uuidv4()}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
    const fileUpload = bucket.file(filename);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000',
      },
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('[FirebaseStorage] Upload failed:', error);
        reject(error);
      });

      stream.on('finish', async () => {
        try {
          // Make the file public or get a signed URL. 
          // For Nexus, we'll use public access for logos to ensure CDN performance.
          await fileUpload.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
          resolve(publicUrl);
        } catch (err) {
          reject(err);
        }
      });

      stream.end(file.buffer);
    });
  }

  /**
   * Optional: Delete old logo to keep storage clean
   */
  static async deleteFile(url: string) {
    try {
      const bucket = getBucket();
      if (!bucket || !url || !url.includes('storage.googleapis.com')) return;
      const path = url.split(`${bucket.name}/`)[1];
      if (path) {
        await bucket.file(path).delete();
      }
    } catch (e) {
      console.warn('[FirebaseStorage] Delete failed (ignoring):', e);
    }
  }
}
