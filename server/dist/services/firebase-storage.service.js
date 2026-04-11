"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.FirebaseStorageService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const uuid_1 = require("uuid");
/**
 * Service for handling permanent media storage via Firebase Storage.
 * This ensures files are persisted independently of the ephemeral application server.
 */
class FirebaseStorageService {
    static init() {
        try {
            if (firebase_admin_1.default.apps.length === 0) {
                const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
                if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
                    console.warn('[FirebaseStorage] Warning: Missing credentials. Falling back to local/memory storage.');
                    return;
                }
                firebase_admin_1.default.initializeApp({
                    credential: firebase_admin_1.default.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: privateKey,
                    }),
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
                });
            }
            this.bucket = firebase_admin_1.default.storage().bucket();
            console.log('[FirebaseStorage] Initialized successfully.');
        }
        catch (error) {
            console.error('[FirebaseStorage] Initialization failed:', error);
        }
    }
    /**
     * Upload logo (Used by upload.routes.ts)
     */
    static async uploadLogo(file) {
        if (!this.bucket)
            this.init();
        if (!this.bucket)
            throw new Error('Cloud storage not configured');
        const ext = file.originalname.split('.').pop();
        const fileName = `logos/${(0, uuid_1.v4)()}.${ext}`;
        const bucketFile = this.bucket.file(fileName);
        await bucketFile.save(file.buffer, {
            metadata: { contentType: file.mimetype },
            resumable: false,
        });
        await bucketFile.makePublic();
        return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
    }
    /**
     * General file upload service method
     */
    static async uploadFile(buffer, originalName, folder = 'uploads') {
        if (!this.bucket)
            this.init();
        if (!this.bucket)
            throw new Error('Cloud storage not configured');
        const ext = originalName.split('.').pop();
        const fileName = `${folder}/${(0, uuid_1.v4)()}.${ext}`;
        const file = this.bucket.file(fileName);
        await file.save(buffer, {
            resumable: false,
        });
        await file.makePublic();
        return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
    }
    /**
     * Delete a file from Firebase Storage.
     */
    static async deleteFile(url) {
        if (!this.bucket)
            this.init();
        if (!this.bucket || !url.includes(this.bucket.name))
            return;
        try {
            const filePath = url.split(`${this.bucket.name}/`)[1];
            if (filePath) {
                await this.bucket.file(filePath).delete();
            }
        }
        catch (error) {
            console.warn(`[FirebaseStorage] Deletion failed for ${url}:`, error);
        }
    }
}
exports.FirebaseStorageService = FirebaseStorageService;
// Instance fallback for controller usage
exports.storageService = FirebaseStorageService;
