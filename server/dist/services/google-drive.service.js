"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveService = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("dotenv/config");
const client_1 = __importDefault(require("../prisma/client"));
class GoogleDriveService {
    static async getDriveClient() {
        if (this.driveClient)
            return this.driveClient;
        let auth;
        // Priority 1: Environment Variable (Preferred for Production/Render)
        if (process.env.GOOGLE_DRIVE_KEY_JSON) {
            console.log('[GoogleDrive] Initializing auth from GOOGLE_DRIVE_KEY_JSON Env Var...');
            try {
                auth = new googleapis_1.google.auth.GoogleAuth({
                    credentials: JSON.parse(process.env.GOOGLE_DRIVE_KEY_JSON),
                    scopes: ['https://www.googleapis.com/auth/drive.file'],
                });
            }
            catch (err) {
                console.error('[GoogleDrive] Failed to parse GOOGLE_DRIVE_KEY_JSON:', err.message);
            }
        }
        // Priority 2: Local File Path (Fallback)
        if (!auth) {
            if (!fs_1.default.existsSync(this.KEY_PATH)) {
                console.error(`[GoogleDrive] Service account key not found at: ${this.KEY_PATH}`);
                throw new Error('Google Drive credentials missing (No Env Var or File)');
            }
            console.log(`[GoogleDrive] Initializing auth from ${this.KEY_PATH}...`);
            auth = new googleapis_1.google.auth.GoogleAuth({
                keyFile: this.KEY_PATH,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
        }
        const authClient = await auth.getClient();
        this.driveClient = googleapis_1.google.drive({ version: 'v3', auth: authClient });
        console.log('[GoogleDrive] Drive client initialized successfully.');
        return this.driveClient;
    }
    /**
     * Automatically initializes the folder structure and returns the ID
     */
    static async getOrCreateFolder() {
        const drive = await this.getDriveClient();
        // Check if we already have it in DB
        try {
            const settings = await client_1.default.systemSettings.findFirst({
                where: { organizationId: 'default-tenant' }
            });
            if (settings?.googleDriveFolderId) {
                return settings.googleDriveFolderId;
            }
        }
        catch (dbError) {
            console.warn('[GoogleDrive] DB check for folder ID failed, proceeding with folder lookup on Drive...', dbError.message);
        }
        console.log('[GoogleDrive] Searching for existing Master Backup Folder on Drive...');
        const listRes = await drive.files.list({
            q: "name = 'Nexus-HRM-Cloud-Vault' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id)',
        });
        const existingFolder = listRes.data.files?.[0];
        if (existingFolder?.id) {
            console.log(`[GoogleDrive] Found existing folder: ${existingFolder.id}`);
            // Optionally update DB here if it was a transient failure before
            return existingFolder.id;
        }
        console.log('[GoogleDrive] Creating new Master Backup Folder...');
        const fileMetadata = {
            name: 'Nexus-HRM-Cloud-Vault',
            mimeType: 'application/vnd.google-apps.folder',
        };
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        const folderId = folder.data.id;
        // Persist to DB if possible
        try {
            const settings = await client_1.default.systemSettings.findFirst({
                where: { organizationId: 'default-tenant' }
            });
            await client_1.default.systemSettings.update({
                where: { id: settings?.id || 'default' },
                data: { googleDriveFolderId: folderId }
            });
        }
        catch (e) {
            console.warn('[GoogleDrive] Could not persist folder ID to DB:', e.message);
        }
        return folderId;
    }
    /**
     * Uploads a local file to the cloud vault
     */
    static async syncFileToCloud(localPath) {
        try {
            const drive = await this.getDriveClient();
            const folderId = await this.getOrCreateFolder();
            const filename = path_1.default.basename(localPath);
            console.log(`[GoogleDrive] Syncing ${filename} to Cloud Vault...`);
            const fileMetadata = {
                name: filename,
                parents: [folderId],
            };
            const media = {
                mimeType: 'application/x-sql',
                body: fs_1.default.createReadStream(localPath),
            };
            const response = await drive.files.create({
                auth: drive.context._options.auth,
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            console.log(`[GoogleDrive] Sync Complete. Cloud ID: ${response.data.id}`);
            // Prune old backups on Drive (keep last 30)
            await this.pruneOldBackups(folderId);
            return response.data.id;
        }
        catch (error) {
            console.error('[GoogleDrive] Sync Failed:', error.message);
            throw error;
        }
    }
    /**
     * Keeps the Google Drive clean by removing backups older than 30 days
     */
    static async pruneOldBackups(folderId) {
        try {
            const drive = await this.getDriveClient();
            const res = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'files(id, name, createdTime)',
                orderBy: 'createdTime desc',
            });
            const files = res.data.files || [];
            if (files.length > 30) {
                const toDelete = files.slice(30);
                console.log(`[GoogleDrive] Pruning ${toDelete.length} old snapshots...`);
                for (const file of toDelete) {
                    await drive.files.delete({ fileId: file.id });
                }
            }
        }
        catch (error) {
            console.warn('[GoogleDrive] Pruning Warning:', error.message);
        }
    }
    /**
     * Shares the folder with a specific user email
     */
    /**
     * Shares the folder with a specific user email
     */
    static async shareFolderWithUser(email) {
        try {
            const drive = await this.getDriveClient();
            const folderId = await this.getOrCreateFolder();
            console.log(`[GoogleDrive] Granting 'editor' access to ${email}...`);
            await drive.permissions.create({
                fileId: folderId,
                requestBody: {
                    role: 'writer',
                    type: 'user',
                    emailAddress: email,
                },
            });
            console.log(`[GoogleDrive] Folder shared successfully with ${email}.`);
            return true;
        }
        catch (error) {
            console.error('[GoogleDrive] Sharing Failed:', error.message);
            throw error;
        }
    }
    /**
     * Health Check for IT Dashboard
     */
    static async checkHealth() {
        if (!process.env.GOOGLE_DRIVE_KEY_JSON && !fs_1.default.existsSync(this.KEY_PATH)) {
            return { status: 'Disconnected', message: 'Credentials missing' };
        }
        try {
            const drive = await this.getDriveClient();
            await drive.about.get({ fields: 'user' });
            return { status: 'Healthy' };
        }
        catch (e) {
            return { status: 'Error', message: e.message };
        }
    }
}
exports.GoogleDriveService = GoogleDriveService;
GoogleDriveService.driveClient = null;
GoogleDriveService.KEY_PATH = path_1.default.join(process.cwd(), 'google-drive-key.json');
