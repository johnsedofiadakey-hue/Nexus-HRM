import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import prisma from '../prisma/client';

export class GoogleDriveService {
  private static driveClient: any = null;
  private static KEY_PATH = path.join(process.cwd(), 'google-drive-key.json');

  private static async getDriveClient() {
    if (this.driveClient) return this.driveClient;

    let auth;
    
    // Priority 1: Environment Variable (Preferred for Production/Render)
    if (process.env.GOOGLE_DRIVE_KEY_JSON) {
      console.log('[GoogleDrive] Initializing auth from GOOGLE_DRIVE_KEY_JSON Env Var...');
      try {
        auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_DRIVE_KEY_JSON),
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
      } catch (err) {
        console.error('[GoogleDrive] Failed to parse GOOGLE_DRIVE_KEY_JSON:', (err as any).message);
      }
    }

    // Priority 2: Local File Path (Fallback)
    if (!auth) {
      if (!fs.existsSync(this.KEY_PATH)) {
        console.error(`[GoogleDrive] Service account key not found at: ${this.KEY_PATH}`);
        throw new Error('Google Drive credentials missing (No Env Var or File)');
      }
      
      console.log(`[GoogleDrive] Initializing auth from ${this.KEY_PATH}...`);
      auth = new google.auth.GoogleAuth({
        keyFile: this.KEY_PATH,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    }

    const authClient = await auth.getClient();
    this.driveClient = google.drive({ version: 'v3', auth: authClient as any });
    console.log('[GoogleDrive] Drive client initialized successfully.');
    return this.driveClient;
  }

  /**
   * Automatically initializes the folder structure and returns the ID
   */
  static async getOrCreateFolder(): Promise<string> {
    const drive = await this.getDriveClient();
    
    // Check if we already have it in DB
    try {
        const settings = await prisma.systemSettings.findFirst({
            where: { organizationId: 'default-tenant' }
        });
        
        if (settings?.googleDriveFolderId) {
            return settings.googleDriveFolderId;
        }
    } catch (dbError) {
        console.warn('[GoogleDrive] DB check for folder ID failed, proceeding with folder lookup on Drive...', (dbError as any).message);
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
        const settings = await prisma.systemSettings.findFirst({
             where: { organizationId: 'default-tenant' }
        });
        await prisma.systemSettings.update({
            where: { id: settings?.id || 'default' },
            data: { googleDriveFolderId: folderId } as any
        });
    } catch (e) {
        console.warn('[GoogleDrive] Could not persist folder ID to DB:', (e as any).message);
    }

    return folderId;
  }

  /**
   * Uploads a local file to the cloud vault
   */
  static async syncFileToCloud(localPath: string) {
    try {
      const drive = await this.getDriveClient();
      const folderId = await this.getOrCreateFolder();
      const filename = path.basename(localPath);

      console.log(`[GoogleDrive] Syncing ${filename} to Cloud Vault...`);

      const fileMetadata = {
        name: filename,
        parents: [folderId],
      };

      const media = {
        mimeType: 'application/x-sql',
        body: fs.createReadStream(localPath),
      };

      const response = await drive.files.create({
        auth: (drive as any).context._options.auth,
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      console.log(`[GoogleDrive] Sync Complete. Cloud ID: ${response.data.id}`);
      
      // Prune old backups on Drive (keep last 30)
      await this.pruneOldBackups(folderId);
      
      return response.data.id;
    } catch (error: any) {
      console.error('[GoogleDrive] Sync Failed:', error.message);
      throw error;
    }
  }

  /**
   * Keeps the Google Drive clean by removing backups older than 30 days
   */
  private static async pruneOldBackups(folderId: string) {
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
    } catch (error: any) {
      console.warn('[GoogleDrive] Pruning Warning:', error.message);
    }
  }

  /**
   * Shares the folder with a specific user email
   */
  static async shareFolderWithUser(email: string) {
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
    } catch (error: any) {
      console.error('[GoogleDrive] Sharing Failed:', error.message);
      throw error;
    }
  }
}
