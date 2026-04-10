"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseStorageService = void 0;
const firebase_config_1 = require("../config/firebase.config");
const uuid_1 = require("uuid");
class FirebaseStorageService {
    /**
     * Uploads a file buffer to Firebase Storage and returns the public URL.
     */
    static async uploadLogo(file) {
        const bucket = (0, firebase_config_1.getBucket)();
        if (!bucket) {
            throw new Error('[FirebaseStorage] No cloud storage configured. Please set environment variables.');
        }
        const filename = `logos/${Date.now()}-${(0, uuid_1.v4)()}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
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
                }
                catch (err) {
                    reject(err);
                }
            });
            stream.end(file.buffer);
        });
    }
    /**
     * Optional: Delete old logo to keep storage clean
     */
    static async deleteFile(url) {
        try {
            const bucket = (0, firebase_config_1.getBucket)();
            if (!bucket || !url || !url.includes('storage.googleapis.com'))
                return;
            const path = url.split(`${bucket.name}/`)[1];
            if (path) {
                await bucket.file(path).delete();
            }
        }
        catch (e) {
            console.warn('[FirebaseStorage] Delete failed (ignoring):', e);
        }
    }
}
exports.FirebaseStorageService = FirebaseStorageService;
